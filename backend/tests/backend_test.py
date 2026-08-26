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

SESSION_TOKEN = "test_session_qa_1"  # injected into mongo (users/user_sessions) per /app/auth_testing.md


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(client):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {SESSION_TOKEN}"})
    return s


# ---------------- Config ----------------
class TestConfig:
    def test_config(self, client):
        r = client.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        d = r.json()
        assert d["property"]["name"] == "Rivergate Commons"
        assert "_id" not in d["property"]
        assert d["statuses"] == ["open", "in_progress", "confirmation_pending", "resolved", "reopened"]
        assert d["lanes"] == ["RESOLVE", "ACTION", "REVIEW"]
        assert d["priorities"] == ["P0", "P1", "P2", "P3"]
        assert "Maintenance" in d["teams"]
        assert len(d["categories"]) >= 5


# ---------------- Auth ----------------
class TestAuth:
    @pytest.mark.parametrize("method,path", [
        ("get", "/api/issues"),
        ("get", "/api/stats"),
        ("get", "/api/auth/me"),
    ])
    def test_protected_requires_auth(self, client, method, path):
        r = getattr(client, method)(f"{BASE_URL}{path}")
        assert r.status_code == 401, f"{path} -> {r.status_code}"

    def test_patch_and_message_require_auth(self, client, auth):
        issues = auth.get(f"{BASE_URL}/api/issues").json()
        iid = issues[0]["id"]
        assert client.get(f"{BASE_URL}/api/issues/{iid}").status_code == 401
        assert client.patch(f"{BASE_URL}/api/issues/{iid}", json={"status": "open"}).status_code == 401
        assert client.post(f"{BASE_URL}/api/issues/{iid}/message", json={"message": "x"}).status_code == 401

    def test_auth_me_with_token(self, auth):
        r = auth.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == "qa.staff@example.test"
        assert "_id" not in d

    def test_invalid_token(self, client):
        r = client.get(f"{BASE_URL}/api/issues", headers={"Authorization": "Bearer bogus"})
        assert r.status_code == 401


# ---------------- Resident flow ----------------
class TestResidentFlow:
    def test_create_issue_defaults_and_interaction(self, client, auth):
        name = f"TEST_Resident_{uuid.uuid4().hex[:6]}"
        CREATED_RESIDENT_NAMES.append(name)
        unit = "999"
        payload = {"name": name, "unit": unit, "message": "TEST_ Sink is leaking badly"}
        r = client.post(f"{BASE_URL}/api/issues", json=payload)
        assert r.status_code == 200, r.text
        issue = r.json()
        assert issue["status"] == "open"
        assert issue["lane"] == "REVIEW"
        assert issue["priority"] == "P2"
        assert issue["category"] is None
        assert issue["description"] == payload["message"]
        assert issue["unit"] == unit
        assert isinstance(issue["id"], str)

        # interaction linked with sender=resident (via staff GET detail)
        detail = auth.get(f"{BASE_URL}/api/issues/{issue['id']}")
        assert detail.status_code == 200
        d = detail.json()
        assert d["resident_name"] == name
        inters = d["interactions"]
        assert len(inters) == 1
        assert inters[0]["sender"] == "resident"
        assert inters[0]["message"] == payload["message"]
        assert inters[0]["issue_id"] == issue["id"]
        assert inters[0]["resident_id"] == issue["resident_id"]

    def test_resident_requests_lookup(self, client):
        name = f"TEST_Track_{uuid.uuid4().hex[:6]}"
        CREATED_RESIDENT_NAMES.append(name)
        unit = "888"
        client.post(f"{BASE_URL}/api/issues", json={"name": name, "unit": unit, "message": "TEST_ msg one", "category": "HVAC"})
        r = client.post(f"{BASE_URL}/api/residents/requests", json={"name": name, "unit": unit})
        assert r.status_code == 200
        d = r.json()
        assert d["resident"]["name"] == name
        assert len(d["issues"]) == 1
        assert d["issues"][0]["category"] == "HVAC"
        assert "_id" not in d["issues"][0]

    def test_resident_requests_unknown(self, client):
        r = client.post(f"{BASE_URL}/api/residents/requests", json={"name": "TEST_Nobody_ZZZ", "unit": "0000"})
        assert r.status_code == 200
        assert r.json() == {"resident": None, "issues": []}

    def test_create_issue_validation(self, client):
        r = client.post(f"{BASE_URL}/api/issues", json={"name": "x"})
        assert r.status_code == 422


# ---------------- Staff issues ----------------
class TestStaffIssues:
    def test_list_issues_enriched(self, auth):
        r = auth.get(f"{BASE_URL}/api/issues")
        assert r.status_code == 200
        issues = r.json()
        assert len(issues) >= 5
        for i in issues:
            assert "_id" not in i
            assert i["resident_name"]
            assert i["status"] and i["lane"] and i["priority"]
        # sorted desc by created_at
        created = [i["created_at"] for i in issues]
        assert created == sorted(created, reverse=True)

    def test_stats(self, auth):
        r = auth.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 5
        assert all(k in d for k in ("open", "in_progress", "resolved"))
        assert isinstance(d["total"], int)

    def test_get_issue_404(self, auth):
        r = auth.get(f"{BASE_URL}/api/issues/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_timeline_sorted_asc(self, auth):
        issues = auth.get(f"{BASE_URL}/api/issues").json()
        target = next(i for i in issues if i["status"] == "in_progress")
        d = auth.get(f"{BASE_URL}/api/issues/{target['id']}").json()
        ts = [x["created_at"] for x in d["interactions"]]
        assert len(ts) >= 2
        assert ts == sorted(ts)

    def test_patch_updates_and_system_log(self, client, auth):
        name = f"TEST_Patch_{uuid.uuid4().hex[:6]}"
        CREATED_RESIDENT_NAMES.append(name)
        created = client.post(f"{BASE_URL}/api/issues", json={
            "name": name, "unit": "777", "message": "TEST_ patch flow"}).json()
        iid = created["id"]

        r = auth.patch(f"{BASE_URL}/api/issues/{iid}", json={
            "status": "in_progress", "lane": "ACTION", "priority": "P1", "assigned_team": "Plumbing"})
        assert r.status_code == 200
        u = r.json()
        assert (u["status"], u["lane"], u["priority"], u["assigned_team"]) == ("in_progress", "ACTION", "P1", "Plumbing")
        assert u["resolved_at"] is None
        assert u["resident_name"]

        d = auth.get(f"{BASE_URL}/api/issues/{iid}").json()
        assert d["status"] == "in_progress" and d["priority"] == "P1"
        sysmsgs = [x for x in d["interactions"] if x["sender"] == "system"]
        assert len(sysmsgs) == 1
        m = sysmsgs[0]["message"]
        assert "Status changed to in_progress" in m and "Lane set to ACTION" in m and "Priority set to P1" in m and "Assigned to Plumbing" in m

        # resolved sets resolved_at
        r2 = auth.patch(f"{BASE_URL}/api/issues/{iid}", json={"status": "resolved"})
        assert r2.status_code == 200
        assert r2.json()["resolved_at"] is not None
        assert auth.get(f"{BASE_URL}/api/issues/{iid}").json()["resolved_at"] is not None

    @pytest.mark.parametrize("body", [
        {"status": "bogus"}, {"lane": "bogus"}, {"priority": "P9"},
    ])
    def test_patch_invalid_enums(self, auth, body):
        issues = auth.get(f"{BASE_URL}/api/issues").json()
        iid = issues[0]["id"]
        r = auth.patch(f"{BASE_URL}/api/issues/{iid}", json=body)
        assert r.status_code == 400, r.text

    def test_patch_invalid_team_rejected(self, auth):
        """assigned_team is not validated against TEAM_VALUES - expected 400."""
        issues = auth.get(f"{BASE_URL}/api/issues").json()
        iid = issues[0]["id"]
        r = auth.patch(f"{BASE_URL}/api/issues/{iid}", json={"assigned_team": "TEST_NotATeam"})
        assert r.status_code == 400, f"accepted invalid team, got {r.status_code}"

    def test_patch_404(self, auth):
        r = auth.patch(f"{BASE_URL}/api/issues/{uuid.uuid4()}", json={"status": "open"})
        assert r.status_code == 404

    def test_staff_message_appends(self, client, auth):
        name = f"TEST_Msg_{uuid.uuid4().hex[:6]}"
        CREATED_RESIDENT_NAMES.append(name)
        created = client.post(f"{BASE_URL}/api/issues", json={
            "name": name, "unit": "776", "message": "TEST_ msg flow"}).json()
        iid = created["id"]
        r = auth.post(f"{BASE_URL}/api/issues/{iid}/message", json={"message": "TEST_ staff reply here"})
        assert r.status_code == 200
        assert r.json()["sender"] == "staff"
        d = auth.get(f"{BASE_URL}/api/issues/{iid}").json()
        staff = [x for x in d["interactions"] if x["sender"] == "staff"]
        assert len(staff) == 1 and staff[0]["message"] == "TEST_ staff reply here"

    def test_staff_message_404(self, auth):
        r = auth.post(f"{BASE_URL}/api/issues/{uuid.uuid4()}/message", json={"message": "x"})
        assert r.status_code == 404


# ---------------- Resident reply (public) ----------------
class TestResidentReply:
    def test_reply_reopens_resolved(self, client, auth):
        name = f"TEST_Reply_{uuid.uuid4().hex[:6]}"
        CREATED_RESIDENT_NAMES.append(name)
        created = client.post(f"{BASE_URL}/api/issues", json={
            "name": name, "unit": "775", "message": "TEST_ reply flow"}).json()
        iid = created["id"]
        auth.patch(f"{BASE_URL}/api/issues/{iid}", json={"status": "resolved"})
        r = client.post(f"{BASE_URL}/api/issues/{iid}/reply", json={"message": "TEST_ still broken"})
        assert r.status_code == 200
        assert r.json()["sender"] == "resident"
        assert auth.get(f"{BASE_URL}/api/issues/{iid}").json()["status"] == "reopened"


# ---------------- Cleanup ----------------
CREATED_RESIDENT_NAMES = []


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    try:
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        mc = MongoClient(env["MONGO_URL"])
        db = mc[env["DB_NAME"]]
        res_ids = [r["id"] for r in db.residents.find({"name": {"$in": CREATED_RESIDENT_NAMES}}, {"id": 1})]
        iss_ids = [i["id"] for i in db.issues.find({"resident_id": {"$in": res_ids}}, {"id": 1})]
        db.interactions.delete_many({"issue_id": {"$in": iss_ids}})
        db.issues.delete_many({"id": {"$in": iss_ids}})
        db.residents.delete_many({"id": {"$in": res_ids}})
        mc.close()
    except Exception as e:
        print(f"cleanup failed: {e}")
