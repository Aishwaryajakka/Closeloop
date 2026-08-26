"""Step 13 tests: resident chat thread, answer approval, trend insights, demo seed correctness."""
import os
import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE = base_url.rstrip("/") + "/api"
TOKEN = "test_session_step2_demo"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

MONGO_URL = backend_env.get("MONGO_URL")
DB_NAME = backend_env.get("DB_NAME")


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="session")
def issues():
    r = requests.get(f"{BASE}/issues", headers=HEADERS, timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- auth / health ----------
def test_auth_me():
    r = requests.get(f"{BASE}/auth/me", headers=HEADERS, timeout=30)
    assert r.status_code == 200, r.text
    assert "@" in r.json().get("email", "")


# ---------- Step 13 seed ----------
def test_dashboard_numbers():
    r = requests.get(f"{BASE}/dashboard", headers=HEADERS, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    print("DASHBOARD:", d)
    assert d["total"] == 20, d
    assert d["handled_automatically"] == 5
    assert d["actions_created"] == 5
    assert d["human_reviews"] == 10
    assert d["failed_resolutions"] == 3
    assert d["resident_confirmed_rate"] == 100
    assert 60 <= d["median_first_response_seconds"] <= 300


def test_issues_all_lanes(issues):
    assert len(issues) == 20
    lanes = {i["lane"] for i in issues}
    assert {"RESOLVE", "ACTION", "REVIEW"} <= lanes, lanes
    for i in issues:
        assert i.get("category")
        assert i.get("priority")
        assert isinstance(i.get("human_attention_score"), int), i["id"]
        assert i.get("description")
        assert i.get("primary_intent")


# ---------- Unit 603 storyline ----------
@pytest.fixture(scope="session")
def sink_issue():
    r = requests.post(f"{BASE}/residents/requests", json={"name": "Nathan Brooks", "unit": "603"}, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("resident"), data
    lst = data["issues"]
    assert len(lst) == 1, f"expected exactly 1 issue, got {len(lst)}"
    return lst[0]


def test_unit603_issue_state(sink_issue):
    i = sink_issue
    print("SINK:", i["id"], i["status"], i["lane"], i["human_attention_score"])
    assert i["status"] == "reopened"
    assert i["lane"] == "REVIEW"
    assert i["resolution_attempts"] == 1
    assert i["failed_resolution"] is True
    assert i["human_attention_score"] >= 90
    rs = i.get("review_summary") or {}
    assert len(rs) >= 6, rs
    for k, v in rs.items():
        assert v, f"empty review_summary field {k}"
    assert i.get("repeat_complaint")


def test_unit603_thread(sink_issue):
    r = requests.post(f"{BASE}/residents/thread",
                      json={"name": "Nathan Brooks", "unit": "603", "issue_id": sink_issue["id"]}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["issue"]["id"] == sink_issue["id"]
    inter = body["interactions"]
    print("THREAD len:", len(inter))
    for x in inter:
        print(" ", x["sender"], "|", x["message"][:70])
    assert len(inter) == 8, len(inter)
    senders = [x["sender"] for x in inter]
    assert senders[0] == "resident"
    joined = " ".join(x["message"].lower() for x in inter)
    assert "leaking again" in joined
    assert "confirm" in joined
    assert "failed" in joined
    # chronological
    times = [x["created_at"] for x in inter]
    assert times == sorted(times)


def test_thread_wrong_resident(sink_issue):
    r = requests.post(f"{BASE}/residents/thread",
                      json={"name": "Nobody Fake", "unit": "999", "issue_id": sink_issue["id"]}, timeout=30)
    assert r.status_code == 404, r.status_code


def test_thread_wrong_issue():
    r = requests.post(f"{BASE}/residents/thread",
                      json={"name": "Nathan Brooks", "unit": "603", "issue_id": "does-not-exist"}, timeout=30)
    assert r.status_code == 404, r.status_code


# ---------- Insights ----------
def test_insights():
    r = requests.get(f"{BASE}/insights", headers=HEADERS, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    print("INSIGHTS:", d)
    assert d["total_repeat"] >= 3
    assert len(d["by_category"]) >= 1
    assert len(d["by_unit"]) >= 1
    assert len(d["weekly"]) >= 1
    assert sum(c["count"] for c in d["by_category"]) == d["total_repeat"]
    assert sum(c["count"] for c in d["by_unit"]) == d["total_repeat"]
    for c in d["by_category"] + d["by_unit"] + d["weekly"]:
        assert c["count"] > 0
    units = [c["unit"] for c in d["by_unit"]]
    assert "603" in units and "412" in units, units


def test_insights_requires_auth():
    r = requests.get(f"{BASE}/insights", timeout=30)
    assert r.status_code in (401, 403), r.status_code


# ---------- Unit 412 repeat noise ----------
def test_unit412_repeat(issues):
    cands = [i for i in issues if i["unit"] == "412"]
    assert cands, "no unit 412 issue"
    top = max(cands, key=lambda i: (i.get("repeat_complaint") or {}).get("contact_count", 0))
    print("412:", top["lane"], top.get("category"), (top.get("repeat_complaint") or {}))
    assert top["lane"] == "REVIEW"
    rc = top.get("repeat_complaint")
    assert rc, "missing repeat_complaint"
    assert rc.get("contact_count", 0) >= 3, rc
    assert top.get("review_summary")


# ---------- Building-wide outage ----------
def test_incident_detect_water_outage():
    r = requests.get(f"{BASE}/incidents/detect", headers=HEADERS, timeout=60)
    assert r.status_code == 200, r.text
    incs = r.json()["incidents"]
    print("INCIDENTS:", [(i.get("keyword"), i.get("units"), i.get("resident_count")) for i in incs])
    match = [i for i in incs if i.get("resident_count") == 4 and set(map(str, i.get("units", []))) == {"701", "702", "703", "704"}]
    assert match, incs


# ---------- Answer approval ----------
@pytest.fixture(scope="module")
def approval_target(issues, mongo):
    """Seed has NO issue with suggested_response, so clone a REVIEW issue with one."""
    src = [i for i in issues if i["lane"] == "REVIEW" and i["status"] == "open"][0]
    doc = dict(src)
    doc["id"] = "TEST_approve_issue"
    doc["suggested_response"] = "Suggested: quiet hours are 10 PM - 7 AM."
    mongo.issues.delete_many({"id": "TEST_approve_issue"})
    mongo.interactions.delete_many({"issue_id": "TEST_approve_issue"})
    mongo.issues.insert_one(doc)
    yield {k: v for k, v in doc.items() if k != "_id"}
    mongo.issues.delete_many({"id": "TEST_approve_issue"})
    mongo.interactions.delete_many({"issue_id": "TEST_approve_issue"})


def test_seed_has_review_issue_with_suggested_response(issues):
    """Answer Approval demo requires at least one REVIEW issue carrying suggested_response."""
    review = [i for i in issues if i["lane"] == "REVIEW" and i.get("suggested_response")]
    assert review, "DEMO GAP: no seeded REVIEW issue has suggested_response -> approve-answer card never renders"


def test_approve_answer_empty_400(approval_target):
    r = requests.post(f"{BASE}/issues/{approval_target['id']}/approve-answer", json={"answer": "   "},
                      headers=HEADERS, timeout=30)
    assert r.status_code == 400, r.status_code


def test_approve_answer_404():
    r = requests.post(f"{BASE}/issues/nope/approve-answer", json={"answer": "hi"}, headers=HEADERS, timeout=30)
    assert r.status_code == 404


def test_approve_answer_requires_auth(approval_target):
    r = requests.post(f"{BASE}/issues/{approval_target['id']}/approve-answer", json={"answer": "hi"}, timeout=30)
    assert r.status_code in (401, 403), r.status_code


def test_approve_answer_flow(approval_target):
    iid = approval_target["id"]
    answer = "TEST_APPROVED Quiet hours are 10 PM to 7 AM; we notified the neighbour."
    r = requests.post(f"{BASE}/issues/{iid}/approve-answer", json={"answer": answer},
                      headers=HEADERS, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["lane"] == "RESOLVE"
    assert body["status"] == "resolved"
    assert body["auto_response"] == answer
    assert not body.get("suggested_response")
    assert body.get("resolved_at")
    assert "_id" not in body
    g = requests.get(f"{BASE}/issues/{iid}", headers=HEADERS, timeout=30)
    assert g.status_code == 200, g.text
    gd = g.json()
    assert gd["lane"] == "RESOLVE" and gd["status"] == "resolved"
    assert gd["auto_response"] == answer
    inter = gd.get("interactions", [])
    msgs = [x["message"] for x in inter]
    assert answer in msgs, msgs
    assert any("approved and sent" in m.lower() for m in msgs), msgs
    ai_msg = [x for x in inter if x["message"] == answer][0]
    assert ai_msg["sender"] == "ai"


# ---------- Regression ----------
def test_documents_still_load():
    r = requests.get(f"{BASE}/documents", headers=HEADERS, timeout=30)
    assert r.status_code == 200, r.text
    docs = r.json()
    assert len(docs) == 4, len(docs)
    assert all(d.get("processing_status") == "ready" for d in docs)
    assert all("_id" not in d for d in docs)


def test_resident_requests_lookup_unknown():
    r = requests.post(f"{BASE}/residents/requests", json={"name": "Ghost Person", "unit": "0000"}, timeout=30)
    print("unknown resident lookup:", r.status_code, r.text[:200])
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert r.json().get("issues") == []


# ---------- Guard checks (documented defects) ----------
def test_approve_answer_rejects_non_review_issue(issues, mongo):
    """approve-answer should not close an open ACTION work order that has no suggested answer."""
    src = [i for i in issues if i["lane"] == "ACTION"][0]
    doc = dict(src)
    doc["id"] = "TEST_action_probe"
    mongo.issues.delete_many({"id": "TEST_action_probe"})
    mongo.issues.insert_one(doc)
    try:
        r = requests.post(f"{BASE}/issues/TEST_action_probe/approve-answer", json={"answer": "probe"},
                          headers=HEADERS, timeout=30)
        assert r.status_code == 400, (
            f"DEFECT: approve-answer accepted an ACTION issue with no suggested_response "
            f"-> {r.status_code} lane={r.json().get('lane')} status={r.json().get('status')}")
    finally:
        mongo.issues.delete_many({"id": "TEST_action_probe"})
        mongo.interactions.delete_many({"issue_id": "TEST_action_probe"})


def test_unit603_thread_chronology_is_logical(sink_issue):
    """Confirmation prompt must precede the resident's confirmation reply."""
    r = requests.post(f"{BASE}/residents/thread",
                      json={"name": "Nathan Brooks", "unit": "603", "issue_id": sink_issue["id"]}, timeout=30)
    inter = r.json()["interactions"]
    prompt = next(i for i, x in enumerate(inter) if "everything working now" in x["message"].lower())
    confirm = next(i for i, x in enumerate(inter) if "confirmed resolved" in x["message"].lower())
    assert prompt < confirm, (
        f"DEFECT: resident confirmation (idx {confirm}) rendered before the confirmation prompt (idx {prompt})")
