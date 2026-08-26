"""Iteration 6 targeted re-verification of the 6 fixes reported in iteration_5 (real Claude calls).

Run: pytest /app/backend/tests/test_fixes_iter6.py -v -n 0
All test data prefixed QA6_ ; cleanup is done by cleanup_iter6.py (run after).
"""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
API = base_url.rstrip("/") + "/api"
TOKEN = "test_session_step2_demo"
TIMEOUT = 240

BRIEF_FIELDS = ["what_happened", "resident_wants", "relevant_history", "relevant_policy",
                "why_human_needed", "suggested_next_action"]

CREATED = {"issues": [], "docs": []}


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
    if d.get("id") not in CREATED["issues"]:
        CREATED["issues"].append(d["id"])
    return d


def full(auth, iid):
    r = auth.get(f"{API}/issues/{iid}", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def assert_brief(issue):
    rs = issue.get("review_summary")
    assert rs, f"review_summary missing on REVIEW issue {issue['id']} status={issue.get('status')}"
    for f in BRIEF_FIELDS:
        assert rs.get(f), f"review_summary.{f} empty: {rs}"


# ---------------- FIX 1 (part A): incident detector must not false-positive on seeded data ----------------
class TestIncidentBaseline:
    def test_00_detect_no_false_positive_on_seed(self, auth):
        r = auth.get(f"{API}/incidents/detect", timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("incidents") == [], data


# ---------------- FIX 1 (part B): precision of keyword+window clustering ----------------
class TestIncidentPrecision:
    state = {}

    def test_01_same_keyword_three_residents_forms_incident(self, s, auth):
        ids = []
        for n, u, m in [
            ("QA6_Elev1", "9101", "The elevator in Building B is stuck between floors."),
            ("QA6_Elev2", "9102", "Elevator is not moving at all, doors keep opening and closing."),
            ("QA6_Elev3", "9103", "Stuck in the elevator lobby, the elevator has been out for an hour."),
        ]:
            ids.append(mk(s, n, u, m)["id"])
        TestIncidentPrecision.state["elev"] = ids
        data = auth.get(f"{API}/incidents/detect", timeout=90).json()
        match = [i for i in data["incidents"] if len(set(ids) & set(i["issue_ids"])) >= 3]
        assert match, f"no shared incident detected for elevator trio: {data}"
        inc = match[0]
        assert inc["resident_count"] >= 3, inc
        assert inc["window_minutes"] <= 180, inc
        assert inc.get("keyword"), inc

    def test_02_same_category_different_subjects_do_not_cluster(self, s, auth):
        ids = []
        for n, u, m in [
            ("QA6_Diff1", "9201", "My bathroom sink is leaking under the cabinet."),
            ("QA6_Diff2", "9202", "The hallway light fixture keeps flickering on and off."),
            ("QA6_Diff3", "9203", "No hot water in my shower since this morning."),
        ]:
            ids.append(mk(s, n, u, m)["id"])
        TestIncidentPrecision.state["diff"] = ids
        data = auth.get(f"{API}/incidents/detect", timeout=90).json()
        bad = [i for i in data["incidents"] if len(set(ids) & set(i["issue_ids"])) >= 3]
        assert not bad, f"false-positive incident grouping unrelated maintenance issues: {bad}"


# ---------------- FIX 2/3/4: reopen via Resolution Memory ----------------
class TestReopenReviewBrief:
    state = {}

    def test_03_create(self, s):
        d = mk(s, "QA6_Sink", "9301", "My kitchen sink is leaking under the cabinet.")
        TestReopenReviewBrief.state["id"] = d["id"]
        TestReopenReviewBrief.state["category"] = d.get("category")
        assert d["lane"] == "ACTION", d
        assert d.get("category") == "maintenance", d.get("category")

    def test_04_staff_resolve_then_confirm_yes(self, auth, s):
        iid = TestReopenReviewBrief.state["id"]
        r = auth.patch(f"{API}/issues/{iid}", json={"status": "resolved"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "confirmation_pending", r.json()
        r = s.post(f"{API}/issues/{iid}/confirm", json={"confirmed": True}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "resolved" and r.json()["resident_confirmed"] is True

    def test_05_resubmit_reopens_same_issue_with_brief(self, s, auth):
        iid = TestReopenReviewBrief.state["id"]
        d = mk(s, "QA6_Sink", "9301", "The kitchen sink you fixed yesterday is leaking again.")
        assert d["id"] == iid, f"created duplicate instead of reopening: {d['id']} vs {iid}"
        assert d.get("matched_existing") is True, d
        assert d["status"] == "reopened", d["status"]
        assert d["lane"] == "REVIEW", d["lane"]
        assert d.get("failed_resolution") is True
        assert_brief(d)
        TestReopenReviewBrief.state["reopened"] = d

    def test_06_contact_counts_consistent(self):
        d = TestReopenReviewBrief.state["reopened"]
        rc = d.get("repeat_complaint") or {}
        assert rc, "repeat_complaint missing"
        assert d.get("contact_count") == rc.get("contact_count"), \
            f"contradiction: issue.contact_count={d.get('contact_count')} repeat_complaint.contact_count={rc.get('contact_count')}"

    def test_07_category_sticky_on_reopen(self):
        d = TestReopenReviewBrief.state["reopened"]
        assert d.get("category") == TestReopenReviewBrief.state["category"], d.get("category")

    def test_08_attention_score_high(self):
        d = TestReopenReviewBrief.state["reopened"]
        assert d.get("human_attention_score", 0) >= 88, (d.get("human_attention_score"), d.get("attention_reasons"))

    def test_09_intervention_worked_derived(self):
        rc = TestReopenReviewBrief.state["reopened"]["repeat_complaint"]
        assert "intervention_worked" in rc
        assert isinstance(rc["intervention_worked"], bool)
        # prior cycle WAS resolved + resident-confirmed, so derived value must be True (not hardcoded False)
        assert rc["intervention_worked"] is True, rc

    def test_10_no_duplicate_request_for_resident(self, s):
        r = s.post(f"{API}/residents/requests", json={"name": "QA6_Sink", "unit": "9301"}, timeout=60)
        assert r.status_code == 200
        assert len(r.json()["issues"]) == 1, r.json()["issues"]


# ---------------- FIX 2: confirm=false reopen path ----------------
class TestConfirmNoBrief:
    state = {}

    def test_11_create_and_resolve(self, s, auth):
        d = mk(s, "QA6_Heat", "9401", "The heater in my bedroom stopped working last night.")
        TestConfirmNoBrief.state["id"] = d["id"]
        TestConfirmNoBrief.state["category"] = d.get("category")
        r = auth.patch(f"{API}/issues/{d['id']}", json={"status": "resolved"}, timeout=TIMEOUT)
        assert r.json()["status"] == "confirmation_pending"

    def test_12_confirm_false_gives_brief(self, s):
        iid = TestConfirmNoBrief.state["id"]
        r = s.post(f"{API}/issues/{iid}/confirm", json={"confirmed": False}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        TestConfirmNoBrief.state["issue"] = d
        assert d["status"] == "reopened", d["status"]
        assert d["lane"] == "REVIEW"
        assert d.get("failed_resolution") is True
        assert d.get("resident_confirmed") is False
        assert d.get("resolution_attempts") == 1, d.get("resolution_attempts")
        assert_brief(d)

    def test_13_confirm_false_counts_consistent(self):
        d = TestConfirmNoBrief.state["issue"]
        rc = d.get("repeat_complaint") or {}
        assert rc, "repeat_complaint missing on confirm=false"
        assert d.get("contact_count") == rc.get("contact_count"), \
            f"contradiction: issue.contact_count={d.get('contact_count')} repeat_complaint.contact_count={rc.get('contact_count')}"

    def test_14_confirm_false_intervention_not_worked(self):
        rc = TestConfirmNoBrief.state["issue"]["repeat_complaint"]
        assert rc["intervention_worked"] is False, rc


# ---------------- FIX 4: sticky category + monotonic priority on reply ----------------
class TestReplyStickyCategory:
    state = {}

    def test_15_create_maintenance_issue(self, s):
        d = mk(s, "QA6_Reply", "9501", "My dishwasher will not drain and there is standing water inside.")
        TestReplyStickyCategory.state["issue"] = d
        assert d.get("category") == "maintenance", d.get("category")

    def test_16_offtopic_followup_keeps_category_and_priority(self, s, auth):
        d0 = TestReplyStickyCategory.state["issue"]
        r = s.post(f"{API}/issues/{d0['id']}/reply",
                   json={"message": "By the way, what time does the rooftop pool close on weekends?"},
                   timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        after = full(auth, d0["id"])
        assert after.get("category") == d0.get("category"), \
            f"category drifted {d0.get('category')} -> {after.get('category')}"
        order = ["P3", "P2", "P1", "P0"]
        assert order.index(after["priority"]) >= order.index(d0["priority"]), (d0["priority"], after["priority"])
        assert after.get("contact_count", 0) >= 2, after.get("contact_count")


# ---------------- FIX 5: policy conflict attention floor ----------------
@pytest.fixture(scope="class")
def conflict_docs(auth):
    ids = []
    for label, body in [
        ("QA6_ParkingA", "Guest Parking Rule A. Guests MAY park overnight in visitor stalls. Overnight guest parking is permitted in any visitor stall without a permit."),
        ("QA6_ParkingB", "Guest Parking Rule B. Overnight guest parking is STRICTLY PROHIBITED at all times. No guest vehicle may remain on the property overnight under any circumstances."),
    ]:
        r = auth.post(f"{API}/documents",
                      files={"file": (f"{label}.txt", body.encode(), "text/plain")},
                      data={"name": label, "doc_type": "Parking Policy"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
        CREATED["docs"].append(r.json()["id"])
    yield ids


class TestPolicyConflictScore:
    def test_17_conflict_scores_at_least_floor(self, s, auth, conflict_docs):
        for did in conflict_docs:
            doc = [d for d in auth.get(f"{API}/documents", timeout=60).json() if d["id"] == did][0]
            assert doc["processing_status"] == "ready", doc
        d = mk(s, "QA6_Guest", "9601", "Can my guest park overnight?")
        assert d["lane"] == "REVIEW", d["lane"]
        assert d.get("policy_conflict") is True, d
        assert d["status"] != "resolved", d.get("auto_response")
        assert any("Policy conflict between documents" in r for r in d.get("attention_reasons", [])), d.get("attention_reasons")
        assert d["human_attention_score"] >= 55, (d["human_attention_score"], d.get("attention_reasons"))
