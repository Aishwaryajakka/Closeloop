"""Iteration 9 — Leads capture, demo (read-only) auth, and core-triage regression."""
import os
import re
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
STAFF_TOKEN = "test_session_step2_demo"


def reset_rate_limit():
    """POST /api/leads rate limit is in-process (5/hr/IP); restart backend to clear it
    so validation cases are not masked by 429s."""
    import subprocess, time
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], capture_output=True, timeout=90)
    for _ in range(40):
        time.sleep(1)
        try:
            if requests.get(f"{API}/config", timeout=10).status_code == 200:
                return
        except Exception:
            pass
    pytest.fail("backend did not come back after restart")


@pytest.fixture(scope="module")
def staff():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {STAFF_TOKEN}", "Content-Type": "application/json"})
    r = s.get(f"{API}/auth/me", timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Staff session invalid: {r.status_code} {r.text[:200]}")
    assert r.json().get("email")
    assert not r.json().get("is_demo")
    return s


@pytest.fixture(scope="module")
def demo():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/demo", timeout=30)
    if r.status_code != 200:
        pytest.fail(f"demo login failed {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def created_lead_ids():
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(created_lead_ids):
    yield
    if not created_lead_ids:
        return
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from dotenv import dotenv_values as dv
    env = dv("/app/backend/.env")

    async def _clean():
        c = AsyncIOMotorClient(env["MONGO_URL"])
        db = c[env["DB_NAME"]]
        await db.leads.delete_many({"id": {"$in": created_lead_ids}})
        c.close()
    asyncio.get_event_loop().run_until_complete(_clean())


# ---------------- POST /api/leads (public) ----------------
class TestLeadCreate:
    def test_create_lead_valid_and_persisted(self, staff, created_lead_ids):
        reset_rate_limit()
        payload = {
            "name": "TEST_QA Lead", "work_email": "TEST_qa9@Example.COM",
            "company": "TEST_Riverside QA", "job_title": "QA",
            "num_properties": "3", "approx_units": "400",
            "current_platform": "Yardi", "interest": "Demo",
            "message": "TEST_iteration9",
        }
        r = requests.post(f"{API}/leads", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert isinstance(body["id"], str) and len(body["id"]) > 10
        created_lead_ids.append(body["id"])

        # verify persisted via staff GET
        leads = staff.get(f"{API}/leads", timeout=30).json()
        found = [l for l in leads if l["id"] == body["id"]]
        assert len(found) == 1
        lead = found[0]
        assert lead["name"] == "TEST_QA Lead"
        assert lead["work_email"] == "test_qa9@example.com"  # normalized lowercase
        assert lead["company"] == "TEST_Riverside QA"
        assert lead["interest"] == "Demo"
        assert lead["status"] == "New"
        assert lead["submitted_at"]
        assert "_id" not in lead

    @pytest.mark.parametrize("missing", ["name", "work_email", "company"])
    def test_missing_required_returns_400(self, missing):
        if missing == "name":
            reset_rate_limit()
        payload = {"name": "TEST_x", "work_email": "test_x@example.com", "company": "TEST_co"}
        payload[missing] = "   "
        r = requests.post(f"{API}/leads", json=payload, timeout=30)
        assert r.status_code == 400, f"{missing}: {r.status_code} {r.text[:200]}"
        assert "required" in r.json()["detail"].lower()

    @pytest.mark.parametrize("email", ["notanemail", "foo@bar", "@example.com"])
    def test_invalid_email_returns_400(self, email):
        if email == "notanemail":
            reset_rate_limit()
        r = requests.post(f"{API}/leads", json={
            "name": "TEST_x", "work_email": email, "company": "TEST_co"}, timeout=30)
        assert r.status_code == 400, f"{email}: {r.status_code} {r.text[:200]}"

    def test_missing_field_entirely_returns_422(self):
        r = requests.post(f"{API}/leads", json={"name": "TEST_x"}, timeout=30)
        assert r.status_code == 422

    def test_rate_limit_6th_submission_429(self, created_lead_ids):
        reset_rate_limit()
        for i in range(5):
            r = requests.post(f"{API}/leads", json={
                "name": f"TEST_rl{i}", "work_email": f"test_rl{i}@example.com",
                "company": "TEST_RateLimit"}, timeout=30)
            assert r.status_code == 200, f"submission {i+1}: {r.status_code} {r.text[:200]}"
            created_lead_ids.append(r.json()["id"])
        r = requests.post(f"{API}/leads", json={
            "name": "TEST_rl6", "work_email": "test_rl6@example.com",
            "company": "TEST_RateLimit"}, timeout=30)
        assert r.status_code == 429, f"6th submission returned {r.status_code}"
        # cleanup rate-limit state for subsequent tests / UI testing
        reset_rate_limit()


# ---------------- GET/PATCH /api/leads (staff only) ----------------
class TestLeadAdmin:
    def test_list_unauthenticated_401(self):
        r = requests.get(f"{API}/leads", timeout=30)
        assert r.status_code == 401

    def test_list_as_staff(self, staff):
        r = staff.get(f"{API}/leads", timeout=30)
        assert r.status_code == 200
        leads = r.json()
        assert isinstance(leads, list) and len(leads) >= 1
        for l in leads:
            assert {"id", "name", "work_email", "company", "status"} <= set(l)
        # sorted desc by submitted_at
        ts = [l["submitted_at"] for l in leads]
        assert ts == sorted(ts, reverse=True)

    @pytest.mark.parametrize("status", ["Contacted", "Qualified", "Closed", "New"])
    def test_patch_status_valid(self, staff, created_lead_ids, status):
        assert created_lead_ids, "lead creation test must run first"
        lid = created_lead_ids[0]
        r = staff.patch(f"{API}/leads/{lid}", json={"status": status}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        leads = staff.get(f"{API}/leads", timeout=30).json()
        assert [l for l in leads if l["id"] == lid][0]["status"] == status

    def test_patch_invalid_status_400(self, staff, created_lead_ids):
        r = staff.patch(f"{API}/leads/{created_lead_ids[0]}", json={"status": "Bogus"}, timeout=30)
        assert r.status_code == 400
        assert "Invalid status" in r.json()["detail"]

    def test_patch_unknown_id_404(self, staff):
        r = staff.patch(f"{API}/leads/{uuid.uuid4()}", json={"status": "New"}, timeout=30)
        assert r.status_code == 404

    def test_patch_unauthenticated_401(self, created_lead_ids):
        r = requests.patch(f"{API}/leads/{created_lead_ids[0]}", json={"status": "New"}, timeout=30)
        assert r.status_code == 401


# ---------------- Demo auth: read-only guard ----------------
class TestDemoAuth:
    def test_demo_login_shape_and_cookie(self):
        r = requests.post(f"{API}/auth/demo", timeout=30)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["is_demo"] is True
        assert u["user_id"] == "demo-viewer"
        assert "_id" not in u
        assert "session_token" in r.cookies, r.cookies.get_dict()
        assert r.cookies["session_token"].startswith("demo_")
        sc = r.headers.get("set-cookie", "")
        assert "HttpOnly" in sc and "Secure" in sc and "samesite=none" in sc.lower()

    def test_demo_me(self, demo):
        r = demo.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["is_demo"] is True

    def test_demo_reads_allowed(self, demo):
        for path in ["/issues", "/dashboard", "/impact"]:
            r = demo.get(f"{API}{path}", timeout=60)
            assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"

    def test_demo_blocked_from_leads(self, demo, created_lead_ids):
        r = demo.get(f"{API}/leads", timeout=30)
        assert r.status_code == 403, r.text
        r2 = demo.patch(f"{API}/leads/{created_lead_ids[0]}", json={"status": "New"}, timeout=30)
        assert r2.status_code == 403, r2.text

    def test_demo_blocked_from_issue_mutations(self, demo):
        issues = demo.get(f"{API}/issues", timeout=60).json()
        assert issues, "no issues seeded"
        iid = issues[0]["id"]
        r = demo.patch(f"{API}/issues/{iid}", json={"status": "resolved"}, timeout=30)
        assert r.status_code == 403, r.text
        r = demo.post(f"{API}/issues/{iid}/message", json={"message": "TEST_demo should fail"}, timeout=30)
        assert r.status_code == 403, r.text
        r = demo.post(f"{API}/issues/{iid}/approve-answer", json={"answer": "TEST"}, timeout=30)
        assert r.status_code == 403, r.text


# ---------------- Regression: core triage + resolution memory ----------------
class TestTriageRegression:
    def test_resolve_lane_faq(self, staff):
        r = requests.post(f"{API}/issues", json={
            "name": "TEST_QA9 Resident", "unit": "TEST-909",
            "message": "What time does the pool close?"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["lane"] == "RESOLVE", d
        assert d["status"] == "resolved"
        assert d.get("auto_response")
        TestTriageRegression.resolve_id = d["id"]

    def test_action_lane(self, staff):
        r = requests.post(f"{API}/issues", json={
            "name": "TEST_QA9 Resident2", "unit": "TEST-910",
            "message": "My dishwasher isn't working."}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["lane"] == "ACTION", d
        assert d.get("assigned_team")
        TestTriageRegression.action_id = d["id"]

    def test_resolution_memory_603_reopen_no_duplicate(self, staff):
        before = staff.get(f"{API}/issues", timeout=60).json()
        b603 = [i for i in before if i.get("unit") == "603"]
        assert b603, "Unit 603 seeded issue missing"
        r = requests.post(f"{API}/issues", json={
            "name": "Nathan Brooks", "unit": "603",
            "message": "The sink you fixed is leaking again."}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("matched_existing") is True, d
        assert d["id"] in [i["id"] for i in b603]
        assert d["status"] == "reopened"
        assert d.get("failed_resolution") is True
        after = staff.get(f"{API}/issues", timeout=60).json()
        assert len([i for i in after if i.get("unit") == "603"]) == len(b603), "duplicate 603 issue created"

    def test_cleanup_created_issues(self, staff):
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        env = dotenv_values("/app/backend/.env")

        async def _clean():
            c = AsyncIOMotorClient(env["MONGO_URL"])
            db = c[env["DB_NAME"]]
            res = await db.issues.delete_many({"unit": {"$in": ["TEST-909", "TEST-910"]}})
            c.close()
            return res.deleted_count
        n = asyncio.new_event_loop().run_until_complete(_clean())
        assert n >= 2, f"expected to clean 2 test issues, cleaned {n}"
