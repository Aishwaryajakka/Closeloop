"""
Iteration 8 - contest-prep QA.
Covers: GET /api/impact (new), impact vs dashboard confirmed-rate alignment,
AI triage lanes (RESOLVE / ACTION / REVIEW / P0 emergency),
Resolution Memory (Unit 603 no-duplicate reopen + synthetic resolved+confirmed reopen),
resident confirmation flow (Yes / No).
Uses live Claude triage -> AI tests are slow (run with -n 0).
"""
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
TOKEN = "test_session_step2_demo"

mongo = MongoClient(backend_env["MONGO_URL"])
db = mongo[backend_env["DB_NAME"]]


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    return s


@pytest.fixture(scope="session")
def public():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created():
    """Track created issue ids / resident ids for teardown."""
    bag = {"issues": [], "residents": []}
    yield bag
    for iid in bag["issues"]:
        db.interactions.delete_many({"issue_id": iid})
        db.issues.delete_one({"id": iid})
    for rid in bag["residents"]:
        db.residents.delete_one({"id": rid})


# ------------------------- Auth / health -------------------------
def test_auth_me(client):
    r = client.get(f"{API}/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "aishwaryajakka@hotmail.com"


def test_impact_requires_auth(public):
    r = public.get(f"{API}/impact")
    assert r.status_code == 401


# ------------------------- GET /api/impact -------------------------
def test_impact_fields_and_types(client):
    r = client.get(f"{API}/impact")
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["automation_rate", "hours_saved", "resident_confirmed_rate", "repeat_complaints",
              "failed_resolutions", "assumed_minutes_per_interaction"]:
        assert k in d, f"missing {k}"
    assert "_id" not in d
    assert isinstance(d["automation_rate"], int) and 0 <= d["automation_rate"] <= 100
    assert isinstance(d["resident_confirmed_rate"], int) and 0 <= d["resident_confirmed_rate"] <= 100
    assert isinstance(d["hours_saved"], (int, float)) and d["hours_saved"] >= 0
    assert d["assumed_minutes_per_interaction"] == 8
    assert isinstance(d["repeat_complaints"], int)
    assert isinstance(d["failed_resolutions"], int)


def test_impact_math_matches_db(client):
    d = client.get(f"{API}/impact").json()
    issues = list(db.issues.find({}, {"_id": 0}))
    total = len(issues)
    automated = sum(1 for i in issues if i.get("lane") in ("RESOLVE", "ACTION"))
    assert d["total_interactions"] == total
    assert d["interactions_automated"] == automated
    assert d["automation_rate"] == round(100 * automated / total)
    assert d["hours_saved"] == round(automated * 8 / 60, 1)
    assert d["repeat_complaints"] == sum(1 for i in issues if i.get("repeat_complaint"))
    assert d["failed_resolutions"] == sum(
        1 for i in issues if i.get("failed_resolution") or (i.get("resolution_attempts") or 0) > 0)


def test_impact_confirmed_rate_matches_dashboard(client):
    imp = client.get(f"{API}/impact").json()
    dash = client.get(f"{API}/dashboard").json()
    assert imp["resident_confirmed_rate"] == dash["resident_confirmed_rate"], (
        f"impact={imp['resident_confirmed_rate']} dashboard={dash['resident_confirmed_rate']}")
    assert imp["failed_resolutions"] == dash["failed_resolutions"]
    assert imp["human_reviews"] == dash["human_reviews"]
    resolved = [i for i in db.issues.find({"status": "resolved"}, {"_id": 0})]
    expected = round(100 * sum(1 for i in resolved if i.get("resident_confirmed")) / len(resolved)) if resolved else 0
    assert imp["resident_confirmed_rate"] == expected


# ------------------------- AI triage lanes -------------------------
def _submit(public, name, unit, message, created):
    r = public.post(f"{API}/issues", json={"name": name, "unit": unit, "message": message}, timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    if not d.get("matched_existing"):
        created["issues"].append(d["id"])
    return d


@pytest.mark.parametrize("dummy", [0])
def test_resolve_lane_document_grounded(public, created, dummy):
    name = f"TEST_Resolve_{uuid.uuid4().hex[:6]}"
    d = _submit(public, name, "TEST101", "What time does the pool close?", created)
    res = db.residents.find_one({"name": name}, {"_id": 0})
    if res:
        created["residents"].append(res["id"])
    assert d["lane"] == "RESOLVE", f"lane={d['lane']} response={d.get('auto_response')}"
    assert d.get("auto_response"), "no auto_response generated"
    assert d.get("answer_source"), "no document source citation (answer_source empty)"
    assert d.get("status") == "resolved"


def test_action_lane_routes_to_maintenance(public, created):
    name = f"TEST_Action_{uuid.uuid4().hex[:6]}"
    d = _submit(public, name, "TEST102", "My dishwasher isn't working.", created)
    res = db.residents.find_one({"name": name}, {"_id": 0})
    if res:
        created["residents"].append(res["id"])
    assert d["lane"] == "ACTION", f"lane={d['lane']}"
    assert d.get("assigned_team") == "Maintenance", f"team={d.get('assigned_team')}"
    assert d.get("acknowledgement")


def test_emergency_water_ceiling_is_p0_review(public, created):
    name = f"TEST_Emerg_{uuid.uuid4().hex[:6]}"
    d = _submit(public, name, "TEST103", "Water is coming through my ceiling.", created)
    res = db.residents.find_one({"name": name}, {"_id": 0})
    if res:
        created["residents"].append(res["id"])
    assert d.get("is_emergency") is True, f"is_emergency={d.get('is_emergency')}"
    assert d["priority"] == "P0", f"priority={d['priority']}"
    assert d["lane"] == "REVIEW", f"lane={d['lane']}"


def test_repeat_noise_complaint_goes_to_review(public, created):
    """Unit 412 in the seed already has repeat noise complaints."""
    unit = "412"
    resident = db.residents.find_one({"unit": unit}, {"_id": 0})
    assert resident, "seed resident for unit 412 missing"
    before_ids = {i["id"] for i in db.issues.find({"resident_id": resident["id"]}, {"_id": 1, "id": 1})}
    d = _submit(public, resident["name"], unit,
                "The upstairs neighbors are loud again late at night", created)
    after_ids = {i["id"] for i in db.issues.find({"resident_id": resident["id"]}, {"id": 1, "_id": 0})}
    new_ids = after_ids - before_ids
    for nid in new_ids:
        created["issues"].append(nid)
    assert d["lane"] == "REVIEW", f"lane={d['lane']} matched_existing={d.get('matched_existing')}"


# ------------------------- Resolution Memory -------------------------
def test_unit603_repeat_does_not_duplicate(public, created):
    resident = db.residents.find_one({"name": "Nathan Brooks", "unit": "603"}, {"_id": 0})
    assert resident, "Nathan Brooks / 603 not seeded"
    before = list(db.issues.find({"resident_id": resident["id"]}, {"_id": 0}))
    before_ids = {i["id"] for i in before}
    target = next((i for i in before if "sink" in i["description"].lower()), None)
    assert target, "603 sink issue not found"
    attempts_before = target.get("resolution_attempts") or 0
    inter_before = db.interactions.count_documents({"issue_id": target["id"]})

    r = public.post(f"{API}/issues", json={"name": "Nathan Brooks", "unit": "603",
                                           "message": "The sink you fixed is leaking again."}, timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()

    after = list(db.issues.find({"resident_id": resident["id"]}, {"_id": 0}))
    new_ids = {i["id"] for i in after} - before_ids
    # cleanup any duplicate created so the demo DB is left clean
    for nid in new_ids:
        created["issues"].append(nid)
    assert not new_ids, f"DUPLICATE issue created: {new_ids}"
    assert d.get("matched_existing") is True, "response did not signal matched_existing"
    assert d["id"] == target["id"]
    assert d["status"] == "reopened", f"status={d['status']}"
    assert d["lane"] == "REVIEW", f"lane={d['lane']}"
    assert d["failed_resolution"] is True
    assert (d.get("resolution_attempts") or 0) >= attempts_before + 1, (
        f"resolution_attempts not incremented: before={attempts_before} after={d.get('resolution_attempts')}")
    # cleanup the extra resident interaction added by this test
    extra = list(db.interactions.find({"issue_id": target["id"]}, {"_id": 0}).sort("created_at", 1))
    for x in extra[inter_before:]:
        db.interactions.delete_one({"id": x["id"]})
    db.issues.update_one({"id": target["id"]}, {"$set": {
        "resolution_attempts": attempts_before,
        "contact_count": target.get("contact_count") or 1,
    }})


def test_resolution_memory_reopens_resolved_confirmed_issue(public, created):
    """Synthetic resident with a RESOLVED + resident_confirmed issue -> new message must reopen it."""
    prop = db.properties.find_one({}, {"_id": 0})
    rid = str(uuid.uuid4())
    name = f"TEST_Memory_{uuid.uuid4().hex[:6]}"
    db.residents.insert_one({"id": rid, "name": name, "unit": "TEST603",
                             "property_id": prop["id"], "created_at": datetime.now(timezone.utc).isoformat()})
    created["residents"].append(rid)
    iid = str(uuid.uuid4())
    t0 = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    t1 = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    db.issues.insert_one({
        "id": iid, "property_id": prop["id"], "resident_id": rid, "unit": "TEST603",
        "category": "maintenance", "description": "My kitchen sink is leaking under the cabinet.",
        "priority": "P2", "lane": "ACTION", "assigned_team": "Maintenance", "status": "resolved",
        "created_at": t0, "first_reported_at": t0, "resolved_at": t1, "confirmed_at": t1,
        "resident_confirmed": True, "resolution_attempts": 0, "failed_resolution": False,
        "contact_count": 1, "ai_analyzed": True, "human_attention_score": 0, "attention_reasons": [],
        "entities": ["kitchen sink"], "primary_intent": "maintenance_request",
    })
    created["issues"].append(iid)
    db.interactions.insert_one({"id": str(uuid.uuid4()), "issue_id": iid, "resident_id": rid,
                                "sender": "resident", "message": "My kitchen sink is leaking under the cabinet.",
                                "created_at": t0})
    db.interactions.insert_one({"id": str(uuid.uuid4()), "issue_id": iid, "sender": "staff",
                                "message": "Plumber replaced the drain seal.", "created_at": t1})

    r = public.post(f"{API}/issues", json={"name": name, "unit": "TEST603",
                                           "message": "The sink you fixed is leaking again."}, timeout=180)
    assert r.status_code == 200, r.text
    d = r.json()
    all_for_res = list(db.issues.find({"resident_id": rid}, {"_id": 0}))
    for i in all_for_res:
        if i["id"] not in created["issues"]:
            created["issues"].append(i["id"])
    assert len(all_for_res) == 1, f"duplicate created, issues={[i['id'] for i in all_for_res]}"
    assert d["id"] == iid
    assert d["status"] == "reopened", f"status={d['status']}"
    assert d["lane"] == "REVIEW", f"lane={d['lane']}"
    assert d["failed_resolution"] is True
    assert d["resolution_attempts"] == 1, f"attempts={d['resolution_attempts']}"
    assert d.get("repeat_complaint"), "repeat_complaint context not built"
    assert d.get("human_attention_score", 0) > 0


# ------------------------- Resident confirmation flow -------------------------
def _make_action_issue(prop, rid, unit, desc):
    iid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.issues.insert_one({
        "id": iid, "property_id": prop["id"], "resident_id": rid, "unit": unit,
        "category": "maintenance", "description": desc, "priority": "P2", "lane": "ACTION",
        "assigned_team": "Maintenance", "status": "confirmation_pending", "created_at": now,
        "first_reported_at": now, "resolved_at": now, "resident_confirmed": False,
        "resolution_attempts": 0, "failed_resolution": False, "contact_count": 1,
        "ai_analyzed": True, "human_attention_score": 10, "attention_reasons": [], "entities": [],
    })
    return iid


@pytest.fixture(scope="module")
def confirm_resident(request):
    prop = db.properties.find_one({}, {"_id": 0})
    rid = str(uuid.uuid4())
    name = f"TEST_Confirm_{uuid.uuid4().hex[:6]}"
    db.residents.insert_one({"id": rid, "name": name, "unit": "TEST704", "property_id": prop["id"],
                             "created_at": datetime.now(timezone.utc).isoformat()})
    yield prop, rid, name
    for i in db.issues.find({"resident_id": rid}, {"_id": 0}):
        db.interactions.delete_many({"issue_id": i["id"]})
        db.issues.delete_one({"id": i["id"]})
    db.residents.delete_one({"id": rid})


def test_confirm_yes_marks_resolved(public, confirm_resident):
    prop, rid, _ = confirm_resident
    iid = _make_action_issue(prop, rid, "TEST704", "Bathroom fan is noisy.")
    r = public.post(f"{API}/issues/{iid}/confirm", json={"confirmed": True}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "resolved"
    assert d["resident_confirmed"] is True
    assert d.get("confirmed_at")
    got = db.issues.find_one({"id": iid}, {"_id": 0})
    assert got["status"] == "resolved" and got["resident_confirmed"] is True
    msgs = [x["message"] for x in db.interactions.find({"issue_id": iid}, {"_id": 0})]
    assert any("Confirmed resolved" in m for m in msgs)


def test_confirm_no_reopens_to_review(public, confirm_resident):
    prop, rid, _ = confirm_resident
    iid = _make_action_issue(prop, rid, "TEST704", "Garbage disposal is jammed.")
    r = public.post(f"{API}/issues/{iid}/confirm", json={"confirmed": False}, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "reopened", f"status={d['status']}"
    assert d["lane"] == "REVIEW"
    assert d["failed_resolution"] is True
    assert d["resolution_attempts"] == 1
    assert d["resident_confirmed"] is False
    got = db.issues.find_one({"id": iid}, {"_id": 0})
    assert got["status"] == "reopened" and got["lane"] == "REVIEW"


def test_confirm_unknown_issue_404(public):
    r = public.post(f"{API}/issues/{uuid.uuid4()}/confirm", json={"confirmed": True})
    assert r.status_code == 404


# ------------------------- Property naming -------------------------
def test_property_name_is_riverside(public):
    r = public.get(f"{API}/config")
    assert r.status_code == 200
    assert r.json()["property"]["name"] == "Riverside Luxury Residences"
