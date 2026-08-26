"""Step 4 lane tests: RESOLVE / ACTION / REVIEW decision lanes."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
TOKEN = "test_session_step2_demo"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
TIMEOUT = 120

CREATED = []


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def submit(api, name, message):
    r = api.post(f"{BASE_URL}/api/issues",
                 json={"name": name, "unit": "CP4-101", "message": message},
                 timeout=TIMEOUT)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    data = r.json()
    assert "_id" not in data
    CREATED.append(data["id"])
    return data


@pytest.fixture(scope="module")
def resolve_issue(api):
    return submit(api, "CP4_Resolve", "What time does the pool close?")


@pytest.fixture(scope="module")
def action_issue(api):
    return submit(api, "CP4_Action", "My dishwasher won't turn on.")


@pytest.fixture(scope="module")
def review_issue(api):
    return submit(api, "CP4_Review", "I've complained about the upstairs noise four times.")


@pytest.fixture(scope="module")
def emergency_issue(api):
    return submit(api, "CP4_Emergency", "Water is pouring through my ceiling.")


# ---------- CHECKPOINT 4 ----------
class TestCheckpoint4:
    def test_a_resolve(self, resolve_issue):
        d = resolve_issue
        assert d["lane"] == "RESOLVE", d
        assert d["auto_response"], "auto_response missing"
        assert d["answer_source"], "answer_source missing"
        assert d["answer_confidence"] in ("high", "medium"), d["answer_confidence"]
        assert d["status"] == "resolved", d["status"]
        assert d["is_emergency"] is False

    def test_a_resolve_answer_persisted_and_in_timeline(self, api, resolve_issue):
        r = api.get(f"{BASE_URL}/api/issues/{resolve_issue['id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["auto_response"] == resolve_issue["auto_response"]
        senders = [i["sender"] for i in d["interactions"]]
        assert "ai" in senders, senders

    def test_b_action_maintenance(self, action_issue):
        d = action_issue
        assert d["lane"] == "ACTION", d
        assert d["assigned_team"] == "Maintenance", d["assigned_team"]
        assert d["acknowledgement"], "acknowledgement missing"
        assert "Maintenance" in d["acknowledgement"]
        assert d["status"] == "open"

    def test_b_action_ack_in_timeline(self, api, action_issue):
        r = api.get(f"{BASE_URL}/api/issues/{action_issue['id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        sys_msgs = [i["message"] for i in d["interactions"] if i["sender"] == "system"]
        assert any("Maintenance" in m for m in sys_msgs), sys_msgs

    def test_c_review(self, review_issue):
        d = review_issue
        assert d["lane"] == "REVIEW", d
        assert d["human_judgment_required"] is True
        rs = d.get("review_summary")
        assert rs, "review_summary missing"
        for k in ("what_happened", "resident_wants", "relevant_history",
                  "relevant_policy", "why_human_needed", "suggested_next_action"):
            assert rs.get(k), f"review_summary missing {k}"

    def test_d_emergency(self, emergency_issue):
        d = emergency_issue
        assert d["priority"] == "P0", d["priority"]
        assert d["is_emergency"] is True
        assert d["lane"] == "REVIEW", d["lane"]
        assert d.get("review_summary"), "review_summary missing on P0"

    def test_lanes_are_distinct(self, resolve_issue, action_issue, review_issue, emergency_issue):
        assert {resolve_issue["lane"], action_issue["lane"], review_issue["lane"]} == {
            "RESOLVE", "ACTION", "REVIEW"}
        assert emergency_issue["lane"] == "REVIEW"


# ---------- RESOLVE grounding fallback ----------
class TestGrounding:
    def test_unanswerable_falls_back_to_review(self, api):
        d = submit(api, "CP4_Unanswerable", "What is the wifi password for the lobby?")
        assert d["lane"] != "RESOLVE", f"fabricated answer: {d.get('auto_response')}"
        assert not d.get("auto_response"), d.get("auto_response")
        assert d["lane"] == "REVIEW", d["lane"]
        assert d["status"] != "resolved"


# ---------- ACTION routing ----------
class TestRouting:
    def test_leasing_route(self, api):
        d = submit(api, "CP4_Leasing", "I need to schedule my move-out inspection for next month.")
        assert d["lane"] == "ACTION", d
        assert d["assigned_team"] == "Leasing", d["assigned_team"]

    def test_concierge_route(self, api):
        d = submit(api, "CP4_Concierge", "Did my package arrive at the front desk?")
        assert d["assigned_team"] == "Concierge" or d["lane"] == "RESOLVE", d
        if d["lane"] == "ACTION":
            assert d["acknowledgement"] and "Concierge" in d["acknowledgement"]


# ---------- Seeded issues ----------
class TestSeeded:
    def test_seeded_issues_have_valid_lane_outcomes(self, api):
        r = api.get(f"{BASE_URL}/api/issues", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        issues = [i for i in r.json() if i["id"] not in CREATED]
        assert len(issues) >= 5
        for i in issues:
            assert i["lane"] in ("RESOLVE", "ACTION", "REVIEW"), i
            if i["lane"] == "RESOLVE":
                assert i.get("auto_response"), i["id"]
            elif i["lane"] == "ACTION":
                assert i.get("assigned_team") in ("Maintenance", "Leasing", "Concierge"), i["id"]
            else:
                assert i.get("review_summary"), i["id"]
            if i["priority"] == "P0":
                assert i["lane"] == "REVIEW" and i.get("is_emergency") is True, i["id"]


# ---------- Regression: PATCH + auth ----------
class TestRegression:
    def test_issues_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/issues", timeout=30)
        assert r.status_code == 401

    def test_patch_status_priority_lane_team(self, api, action_issue):
        iid = action_issue["id"]
        r = api.patch(f"{BASE_URL}/api/issues/{iid}", headers=HEADERS,
                      json={"status": "in_progress", "priority": "P1",
                            "lane": "REVIEW", "assigned_team": "Leasing"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert (d["status"], d["priority"], d["lane"], d["assigned_team"]) == (
            "in_progress", "P1", "REVIEW", "Leasing")
        g = api.get(f"{BASE_URL}/api/issues/{iid}", headers=HEADERS, timeout=TIMEOUT).json()
        assert g["status"] == "in_progress" and g["assigned_team"] == "Leasing"

    def test_patch_invalid_values(self, api, action_issue):
        iid = action_issue["id"]
        for payload in ({"status": "bogus"}, {"lane": "bogus"},
                        {"priority": "P9"}, {"assigned_team": "Plumbers"}):
            r = api.patch(f"{BASE_URL}/api/issues/{iid}", headers=HEADERS, json=payload, timeout=30)
            assert r.status_code == 400, f"{payload} -> {r.status_code}"

    def test_documents_loaded(self, api):
        r = api.get(f"{BASE_URL}/api/documents", headers=HEADERS, timeout=60)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 4, docs
        assert all(d["processing_status"] == "ready" and d["chunk_count"] > 0 for d in docs)

    def test_config_teams(self, api):
        r = api.get(f"{BASE_URL}/api/config", timeout=30)
        assert r.status_code == 200
        assert r.json()["teams"] == ["Maintenance", "Leasing", "Concierge"]

    def test_missing_fields_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/issues", json={"name": "", "unit": "", "message": ""}, timeout=30)
        assert r.status_code == 400
