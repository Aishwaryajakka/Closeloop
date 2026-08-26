"""Step 3: AI intent understanding tests (real Anthropic call via emergentintegrations)."""
import os
import time

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
SESSION_TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_step2_demo")

backend_env = dotenv_values("/app/backend/.env")
MONGO_URL = backend_env.get("MONGO_URL")
DB_NAME = backend_env.get("DB_NAME")

PRIORITIES = ["P0", "P1", "P2", "P3"]
AI_FIELDS = [
    "primary_intent", "desired_outcome", "category", "priority", "urgency",
    "sentiment", "entities", "human_judgment_required", "human_reason",
    "ai_analyzed", "lane",
]


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
    return s


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


created_issue_ids = []
created_resident_names = []


def create_issue(client, name, unit, message, category=""):
    t0 = time.time()
    r = client.post(f"{API}/issues", json={
        "name": name, "unit": unit, "message": message, "category": category,
    }, timeout=120)
    elapsed = time.time() - t0
    assert r.status_code == 200, f"create failed {r.status_code}: {r.text[:400]}"
    data = r.json()
    created_issue_ids.append(data["id"])
    created_resident_names.append(name)
    print(f"\n[{elapsed:.2f}s] '{message[:50]}' -> intent={data.get('primary_intent')!r} "
          f"cat={data.get('category')!r} prio={data.get('priority')!r} urg={data.get('urgency')!r} "
          f"sent={data.get('sentiment')!r} hjr={data.get('human_judgment_required')} "
          f"lane={data.get('lane')!r} entities={data.get('entities')} reason={data.get('human_reason')!r} "
          f"outcome={data.get('desired_outcome')!r} ai_loc={data.get('ai_location')!r}")
    return data


@pytest.fixture(scope="module")
def checkpoint_issues(client):
    """The three CHECKPOINT 3 messages."""
    m1 = create_issue(client, "TEST_Checkpoint One", "C-101", "Can my friend park overnight?")
    m2 = create_issue(client, "TEST_Checkpoint Two", "C-102", "Someone keeps parking in my assigned space.")
    m3 = create_issue(client, "TEST_Checkpoint Three", "C-103",
                      "I've complained three times about someone parking in my space.")
    return m1, m2, m3


@pytest.fixture(scope="module", autouse=True)
def cleanup(mongo):
    yield
    for iid in created_issue_ids:
        mongo.interactions.delete_many({"issue_id": iid})
        mongo.issues.delete_many({"id": iid})
    for n in set(created_resident_names):
        mongo.residents.delete_many({"name": n})
    print(f"\nCleaned up {len(created_issue_ids)} test issues")


# --- automatic analysis on POST /api/issues ---
class TestAutoAnalysis:
    def test_all_ai_fields_populated(self, checkpoint_issues):
        data = checkpoint_issues[1]
        missing = [f for f in AI_FIELDS if f not in data]
        assert not missing, f"missing fields: {missing}"
        assert data["ai_analyzed"] is True, f"ai_analyzed not true: {data.get('ai_analyzed')}"
        assert data["priority"] in PRIORITIES
        assert isinstance(data["entities"], list)
        assert isinstance(data["human_judgment_required"], bool)
        assert data["primary_intent"]
        assert data["desired_outcome"]
        assert data["sentiment"]
        assert data["urgency"]
        assert data["lane"] in ("REVIEW", "ACTION", "RESOLVE")
        assert "_id" not in data

    def test_interaction_gets_detected_intent(self, client, checkpoint_issues):
        iid = checkpoint_issues[1]["id"]
        r = client.get(f"{API}/issues/{iid}", timeout=60)
        assert r.status_code == 200
        interactions = r.json()["interactions"]
        assert len(interactions) >= 1
        first = interactions[0]
        assert first["detected_intent"] == checkpoint_issues[1]["primary_intent"]
        assert first["detected_sentiment"] == checkpoint_issues[1]["sentiment"]

    def test_analysis_persisted_and_readable_by_staff(self, client, checkpoint_issues):
        iid = checkpoint_issues[0]["id"]
        r = client.get(f"{API}/issues/{iid}", timeout=60)
        assert r.status_code == 200
        got = r.json()
        for f in AI_FIELDS:
            assert got.get(f) == checkpoint_issues[0].get(f) or f == "interactions"


# --- CHECKPOINT 3: three parking messages must yield distinct intents ---
class TestCheckpoint3:
    def test_msg1_permission_or_information(self, checkpoint_issues):
        d = checkpoint_issues[0]
        assert d["primary_intent"] in ("wants permission", "wants information"), d["primary_intent"]
        assert d["category"] == "parking", d["category"]
        assert d["priority"] in ("P2", "P3"), d["priority"]

    def test_msg2_wants_action_taken(self, checkpoint_issues):
        d1, d2 = checkpoint_issues[0], checkpoint_issues[1]
        assert d2["primary_intent"] == "wants action taken", d2["primary_intent"]
        assert d2["category"] == "parking", d2["category"]
        # higher priority = lower number
        assert PRIORITIES.index(d2["priority"]) < PRIORITIES.index(d1["priority"]), \
            f"msg2 priority {d2['priority']} not higher than msg1 {d1['priority']}"

    def test_msg3_escalation_requires_human(self, checkpoint_issues):
        d = checkpoint_issues[2]
        assert d["primary_intent"] == "wants to escalate a prior issue", d["primary_intent"]
        assert d["human_judgment_required"] is True
        reason = (d["human_reason"] or "").lower()
        assert any(k in reason for k in
                   ("repeat", "prior", "three", "multiple", "escalat", "previous", "unresolved")), reason
        assert d["lane"] == "REVIEW"

    def test_three_intents_are_distinct(self, checkpoint_issues):
        intents = [d["primary_intent"] for d in checkpoint_issues]
        assert len(set(intents)) == 3, f"intents not distinct: {intents}"


# --- resident reply re-analysis with context ---
class TestReplyReanalysis:
    def test_reply_triggers_reanalysis(self, client):
        base = create_issue(client, "TEST_Reply Resident", "R-201",
                            "The kitchen faucet is dripping slowly.")
        assert base["ai_analyzed"] is True
        r = client.post(f"{API}/issues/{base['id']}/reply",
                        json={"message": "I have reported this twice already and nobody has come."},
                        timeout=120)
        assert r.status_code == 200, r.text[:300]
        interaction = r.json()
        detail = client.get(f"{API}/issues/{base['id']}", timeout=60).json()
        print(f"\nreply -> intent={detail.get('primary_intent')!r} hjr={detail.get('human_judgment_required')} "
              f"lane={detail.get('lane')!r} reason={detail.get('human_reason')!r}")
        assert detail["ai_analyzed"] is True
        assert detail["primary_intent"] == "wants to escalate a prior issue"
        assert detail["human_judgment_required"] is True
        last = detail["interactions"][-1]
        assert last["id"] == interaction["id"]
        assert last["detected_intent"] == detail["primary_intent"]
        assert last["detected_sentiment"] == detail["sentiment"]


# --- seeded issues were backfilled ---
class TestSeededBackfill:
    def test_seeded_issues_have_ai_fields(self, client):
        r = client.get(f"{API}/issues", timeout=60)
        assert r.status_code == 200
        issues = [i for i in r.json() if not (i.get("resident_name") or "").startswith("TEST_")]
        assert len(issues) == 5, f"expected 5 seeded issues, got {len(issues)}"
        for i in issues:
            assert i.get("ai_analyzed") is True, f"{i['id']} not analyzed"
            assert i.get("primary_intent"), i["id"]
            assert i.get("desired_outcome"), i["id"]
            assert i.get("priority") in PRIORITIES
            assert i.get("sentiment"), i["id"]
            assert i.get("urgency"), i["id"]
            assert isinstance(i.get("entities"), list)
            assert isinstance(i.get("human_judgment_required"), bool)
            assert i.get("human_reason"), i["id"]
            print(f"\nseeded {i['unit']}: {i['primary_intent']} / {i['priority']} / {i['lane']} / hjr={i['human_judgment_required']}")

    def test_seeded_detail_returns_ai_fields(self, client):
        r = client.get(f"{API}/issues", timeout=60)
        seeded = [i for i in r.json() if not (i.get("resident_name") or "").startswith("TEST_")]
        d = client.get(f"{API}/issues/{seeded[0]['id']}", timeout=60)
        assert d.status_code == 200
        got = d.json()
        for f in AI_FIELDS:
            assert f in got, f
        assert "_id" not in got

    def test_detail_requires_auth(self):
        r = requests.get(f"{API}/issues", timeout=30)
        assert r.status_code == 401


# --- emergency should be higher priority (sanity on priority spread) ---
class TestPrioritySpread:
    def test_emergency_message_gets_p0_or_p1(self, client):
        d = create_issue(client, "TEST_Emergency Resident", "E-301",
                         "Water is pouring out of the ceiling and there is smoke coming from the outlet!")
        assert d["priority"] in ("P0", "P1"), d["priority"]
        assert d["urgency"] in ("emergency", "urgent"), d["urgency"]
