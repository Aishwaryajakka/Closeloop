"""Steps 5-12 + Step-4 reply-path regression tests (real Claude Sonnet 4.6 calls).

Run with: pytest /app/backend/tests/test_steps5_12.py -v -n 0
All test data is prefixed QA_ and removed by the session cleanup fixture.
"""
import os
import uuid
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = BASE_URL + "/api"
TOKEN = "test_session_step2_demo"
TIMEOUT = 180

CREATED_ISSUES = []
CREATED_DOCS = []


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def auth():
    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {TOKEN}"})
    return sess


def mk(s, name, unit, message):
    r = s.post(f"{API}/issues", json={"name": name, "unit": unit, "message": message}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    if d.get("id") not in CREATED_ISSUES:
        CREATED_ISSUES.append(d["id"])
    return d


# ---------------- health / auth ----------------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        assert "message" in r.json()

    def test_issues_requires_auth(self, s):
        r = requests.get(f"{API}/issues", timeout=30)
        assert r.status_code in (401, 403)

    def test_auth_me(self, auth):
        r = auth.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert "email" in r.json()


# ---------------- CHECKPOINT 6: Resolution Memory ----------------
class TestCheckpoint6:
    state = {}

    def test_01_create_action_issue(self, s):
        d = mk(s, "QA_Sink", "888", "My kitchen sink is leaking.")
        TestCheckpoint6.state["id"] = d["id"]
        assert d["lane"] == "ACTION", d
        assert d["assigned_team"] == "Maintenance", d
        assert d["status"] == "open"
        assert d.get("acknowledgement")
        assert d.get("human_attention_score", 0) >= 0
        assert d.get("attention_reasons")

    def test_02_staff_resolve_becomes_confirmation_pending(self, auth):
        iid = TestCheckpoint6.state["id"]
        r = auth.patch(f"{API}/issues/{iid}", json={"status": "resolved"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "confirmation_pending", d["status"]
        assert d.get("confirmation_requested_at")
        # confirmation question asked to resident
        det = auth.get(f"{API}/issues/{iid}", timeout=60).json()
        msgs = [i["message"] for i in det["interactions"]]
        assert any("Is everything working now?" in m for m in msgs), msgs

    def test_03_resident_confirms_yes(self, s):
        iid = TestCheckpoint6.state["id"]
        r = s.post(f"{API}/issues/{iid}/confirm", json={"confirmed": True}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "resolved"
        assert d["resident_confirmed"] is True
        assert d.get("confirmed_at")

    def test_04_repeat_message_reopens_same_issue_no_duplicate(self, s):
        iid = TestCheckpoint6.state["id"]
        d = mk(s, "QA_Sink", "888", "The sink you fixed yesterday is leaking again.")
        assert d["id"] == iid, f"expected same issue {iid}, got {d['id']}"
        assert d.get("matched_existing") is True
        assert d["status"] == "reopened", d["status"]
        assert d["lane"] == "REVIEW", d["lane"]
        assert d["failed_resolution"] is True
        assert d["resolution_attempts"] == 1, d["resolution_attempts"]
        assert d["resident_confirmed"] is False
        assert d.get("repeat_complaint")
        # no duplicate for the resident
        rr = s.post(f"{API}/residents/requests", json={"name": "QA_Sink", "unit": "888"}, timeout=60)
        assert rr.status_code == 200
        assert len(rr.json()["issues"]) == 1, rr.json()["issues"]

    def test_05_reopened_shows_previous_resolution_failed(self, auth):
        iid = TestCheckpoint6.state["id"]
        det = auth.get(f"{API}/issues/{iid}", timeout=60).json()
        msgs = [i["message"] for i in det["interactions"]]
        assert any("Previous resolution failed" in m for m in msgs), msgs
        rc = det.get("repeat_complaint") or {}
        assert rc.get("contact_count", 0) >= 2, rc
        assert det["human_attention_score"] > 0


# ---------------- CHECKPOINT 7: NO branch ----------------
class TestCheckpoint7No:
    state = {}

    def test_01_create_action(self, s):
        d = mk(s, "QA_Heat", "889", "The heater in my bedroom stopped blowing warm air.")
        TestCheckpoint7No.state["id"] = d["id"]
        assert d["lane"] == "ACTION", d
        assert d["assigned_team"] == "Maintenance"

    def test_02_resolve_to_confirmation_pending(self, auth):
        iid = TestCheckpoint7No.state["id"]
        d = auth.patch(f"{API}/issues/{iid}", json={"status": "resolved"}, timeout=TIMEOUT).json()
        assert d["status"] == "confirmation_pending"

    def test_03_confirm_no_reopens(self, s):
        iid = TestCheckpoint7No.state["id"]
        r = s.post(f"{API}/issues/{iid}/confirm", json={"confirmed": False}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "reopened", d["status"]
        assert d["resident_confirmed"] is False
        assert d["lane"] == "REVIEW"
        assert d["failed_resolution"] is True
        assert d["resolution_attempts"] == 1, d["resolution_attempts"]
        assert d.get("repeat_complaint")
        assert d["human_attention_score"] >= 30, d["human_attention_score"]


# ---------------- Step 5: citations + non-auto-send ----------------
class TestStep5Answers:
    def test_pool_hours_resolves_with_citation(self, s):
        d = mk(s, "QA_Pool", "701", "What time does the pool close?")
        assert d["lane"] == "RESOLVE", d
        assert d["status"] == "resolved"
        assert d.get("auto_response")
        assert d.get("answer_source"), d
        assert "amenity" in (d.get("answer_source") or "").lower(), d.get("answer_source")
        assert d.get("answer_passage")
        assert d.get("answer_confidence") == "high"

    def test_unsupported_question_does_not_auto_send(self, s):
        d = mk(s, "QA_Wifi", "702", "What is the wifi password for the lobby lounge?")
        assert d["lane"] == "REVIEW", d
        assert d["status"] != "resolved"
        assert not d.get("auto_response"), d.get("auto_response")
        assert d.get("human_reason")


# ---------------- CHECKPOINT 5: policy conflict ----------------
@pytest.fixture(scope="class")
def conflict_docs(auth):
    ids = []
    for label, body in [
        ("QA_ParkingA", "Guest Parking Rule A. Guests MAY park overnight in visitor stalls. Overnight guest parking is permitted in any visitor stall without a permit."),
        ("QA_ParkingB", "Guest Parking Rule B. Overnight guest parking is STRICTLY PROHIBITED at all times. No guest vehicle may remain on the property overnight under any circumstances."),
    ]:
        r = auth.post(
            f"{API}/documents",
            files={"file": (f"{label}.txt", body.encode(), "text/plain")},
            data={"name": label, "doc_type": "Parking Policy"},
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
        CREATED_DOCS.append(r.json()["id"])
    yield ids


class TestCheckpoint5Conflict:
    def test_conflict_routes_to_review(self, s, auth, conflict_docs):
        for did in conflict_docs:
            doc = [d for d in auth.get(f"{API}/documents", timeout=60).json() if d["id"] == did][0]
            assert doc["processing_status"] == "ready", doc
            assert doc["chunk_count"] > 0
        d = mk(s, "QA_Guest", "703", "Can my guest park overnight?")
        assert d["status"] != "resolved", f"auto-resolved despite conflicting docs: {d.get('auto_response')}"
        assert d["lane"] == "REVIEW", d["lane"]
        assert d.get("policy_conflict") is True, d
        assert len(d.get("conflicting_documents") or []) >= 2, d.get("conflicting_documents")
        assert any("Policy conflict" in r for r in d.get("attention_reasons", [])), d.get("attention_reasons")


# ---------------- Step 10: attention score ----------------
class TestStep10Attention:
    def test_emergency_scores_high(self, s):
        d = mk(s, "QA_Flood", "704", "Water is pouring through my ceiling and the electrical outlet is sparking!")
        assert d["priority"] == "P0", d["priority"]
        assert d["is_emergency"] is True
        assert d["lane"] == "REVIEW"
        assert d["human_attention_score"] >= 90, d["human_attention_score"]
        assert d["attention_reasons"]

    def test_all_issues_have_scores(self, auth):
        issues = auth.get(f"{API}/issues", timeout=60).json()
        assert len(issues) >= 5
        for i in issues:
            assert isinstance(i.get("human_attention_score"), int), i["id"]
            assert 0 <= i["human_attention_score"] <= 100
            assert i.get("attention_reasons"), i["id"]
            assert i.get("lane") in ("RESOLVE", "ACTION", "REVIEW")
            assert "_id" not in i

    def test_resolve_scores_low(self, auth):
        issues = auth.get(f"{API}/issues", timeout=60).json()
        pool = [i for i in issues if i.get("lane") == "RESOLVE" and "pool" in i["description"].lower()]
        assert pool, "no RESOLVE pool issue found"
        assert pool[0]["human_attention_score"] <= 30, pool[0]["human_attention_score"]


# ---------------- Step 9: dashboard ----------------
class TestStep9Dashboard:
    def test_dashboard_fields(self, auth):
        r = auth.get(f"{API}/dashboard", timeout=60)
        assert r.status_code == 200
        d = r.json()
        for k in ["resident_interactions_today", "handled_automatically", "actions_created", "human_reviews",
                  "failed_resolutions", "confirmation_pending", "resident_confirmed_rate",
                  "median_first_response_seconds"]:
            assert k in d, k
            assert isinstance(d[k], int), (k, d[k])
        assert d["failed_resolutions"] >= 2, d
        assert 0 <= d["resident_confirmed_rate"] <= 100

    def test_dashboard_requires_auth(self, s):
        assert requests.get(f"{API}/dashboard", timeout=30).status_code in (401, 403)


# ---------------- Step 8: similar past resolutions as precedent ----------------
class TestStep8Precedent:
    def test_similar_or_suggested_for_unanswerable(self, s):
        d = mk(s, "QA_Precedent", "705", "Is there a fee to reserve the rooftop terrace for a birthday party?")
        assert d["lane"] in ("REVIEW", "RESOLVE"), d["lane"]
        if d["lane"] == "REVIEW":
            assert d.get("suggested_response") or d.get("similar_cases") or d.get("human_reason")
            assert d["status"] != "resolved"


# ---------------- Step 12: incidents ----------------
class TestStep12Incidents:
    state = {}

    def test_01_detect_creates_shared_incident(self, s, auth):
        ids = []
        for n, unit in [("QA_Inc1", "911"), ("QA_Inc2", "912"), ("QA_Inc3", "913")]:
            d = mk(s, n, unit, "There is no water coming out of any faucet in my apartment.")
            ids.append(d["id"])
        TestStep12Incidents.state["ids"] = ids
        r = auth.get(f"{API}/incidents/detect", timeout=60)
        assert r.status_code == 200
        incs = r.json()["incidents"]
        assert incs, "no shared incident detected for 3 residents with same category"
        assert any(len(set(ids) & set(i["issue_ids"])) >= 3 for i in incs), incs
        target = [i for i in incs if len(set(ids) & set(i["issue_ids"])) >= 3][0]
        assert target["resident_count"] >= 3
        assert target["count"] >= 3
        assert isinstance(target["window_minutes"], int)

    def test_02_merge(self, auth):
        ids = TestStep12Incidents.state["ids"]
        r = auth.post(f"{API}/incidents/merge", json={"issue_ids": ids, "label": "QA_No water"}, timeout=60)
        assert r.status_code == 200, r.text
        inc_id = r.json()["id"]
        assert inc_id
        for iid in ids:
            d = auth.get(f"{API}/issues/{iid}", timeout=60).json()
            assert d["incident_id"] == inc_id, d["incident_id"]

    def test_03_merge_validation(self, auth):
        r = auth.post(f"{API}/incidents/merge", json={"issue_ids": ["x"]}, timeout=60)
        assert r.status_code == 400

    def test_04_merged_issues_excluded_from_detect(self, auth):
        ids = TestStep12Incidents.state["ids"]
        incs = auth.get(f"{API}/incidents/detect", timeout=60).json()["incidents"]
        assert not any(set(ids) & set(i["issue_ids"]) for i in incs), incs


# ---------------- Step 4 reply-path fix ----------------
class TestReplyPath:
    state = {}

    def test_01_create_action(self, s):
        d = mk(s, "QA_Reply", "706", "My dishwasher is not draining properly.")
        TestReplyPath.state["id"] = d["id"]
        assert d["lane"] == "ACTION"
        TestReplyPath.state["pri"] = d["priority"]

    def test_02_reply_escalation_runs_full_triage(self, s, auth):
        iid = TestReplyPath.state["id"]
        r = s.post(f"{API}/issues/{iid}/reply",
                   json={"message": "This is now an emergency - water is flooding my kitchen and the electrical outlet is sparking!"},
                   timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = auth.get(f"{API}/issues/{iid}", timeout=60).json()
        assert d["priority"] == "P0", d["priority"]
        assert d["is_emergency"] is True, d
        assert d["lane"] == "REVIEW", d["lane"]
        assert d.get("review_summary"), "review_summary not populated by reply path"
        for k in ["what_happened", "resident_wants", "relevant_history", "relevant_policy",
                  "why_human_needed", "suggested_next_action"]:
            assert d["review_summary"].get(k), k
        assert d["human_attention_score"] >= 90

    def test_03_followup_does_not_downgrade(self, s, auth):
        iid = TestReplyPath.state["id"]
        r = s.post(f"{API}/issues/{iid}/reply", json={"message": "By the way, what time does the pool close?"},
                   timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = auth.get(f"{API}/issues/{iid}", timeout=60).json()
        assert d["priority"] == "P0", f"priority downgraded to {d['priority']}"
        assert d["is_emergency"] is True, "emergency flag lost on follow-up"
        assert d["contact_count"] >= 3, d["contact_count"]

    def test_04_reply_404(self, s):
        r = s.post(f"{API}/issues/{uuid.uuid4()}/reply", json={"message": "hi"}, timeout=60)
        assert r.status_code == 404


# ---------------- Regression ----------------
class TestRegression:
    def test_documents_ready(self, auth):
        docs = auth.get(f"{API}/documents", timeout=60).json()
        core = [d for d in docs if not d["name"].startswith("QA_")]
        assert len(core) >= 4, [d["name"] for d in core]
        for d in core:
            assert d["processing_status"] == "ready", d
            assert d["chunk_count"] > 0

    def test_patch_lane_priority_team(self, auth):
        issues = auth.get(f"{API}/issues", timeout=60).json()
        target = [i for i in issues if i["description"].startswith("My dishwasher is not draining")][0]
        d = auth.patch(f"{API}/issues/{target['id']}",
                       json={"lane": "ACTION", "priority": "P1", "assigned_team": "Concierge"}, timeout=60).json()
        assert d["lane"] == "ACTION" and d["priority"] == "P1" and d["assigned_team"] == "Concierge"

    def test_patch_invalid(self, auth):
        issues = auth.get(f"{API}/issues", timeout=60).json()
        iid = issues[0]["id"]
        assert auth.patch(f"{API}/issues/{iid}", json={"lane": "BOGUS"}, timeout=60).status_code == 400
        assert auth.patch(f"{API}/issues/{iid}", json={"status": "bogus"}, timeout=60).status_code == 400
        assert auth.patch(f"{API}/issues/{iid}", json={"priority": "P9"}, timeout=60).status_code == 400

    def test_create_validation(self, s):
        assert s.post(f"{API}/issues", json={"name": " ", "unit": "1", "message": "x"}, timeout=60).status_code == 400
        assert s.post(f"{API}/issues", json={"name": "a"}, timeout=60).status_code == 422

    def test_confirm_404(self, s):
        assert s.post(f"{API}/issues/{uuid.uuid4()}/confirm", json={"confirmed": True}, timeout=60).status_code == 404


def test_zz_report_created():
    print("CREATED_ISSUES=" + ",".join(CREATED_ISSUES))
    print("CREATED_DOCS=" + ",".join(CREATED_DOCS))
