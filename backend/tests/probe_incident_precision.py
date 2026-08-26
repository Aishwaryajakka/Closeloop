"""Adversarial precision probe for /api/incidents/detect keyword clustering (iteration 6)."""
import os
import requests
from dotenv import dotenv_values

API = (dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/") + "/api"
auth = {"Authorization": "Bearer test_session_step2_demo"}

msgs = [
    ("QA6_Gen1", "9701", "My apartment door lock is broken, please help."),
    ("QA6_Gen2", "9702", "The apartment gym treadmill is broken, please fix it."),
    ("QA6_Gen3", "9703", "Please hold my package at the front desk, apartment 9703."),
]
ids = []
for n, u, m in msgs:
    r = requests.post(f"{API}/issues", json={"name": n, "unit": u, "message": m}, timeout=240)
    print(n, r.status_code, r.json().get("category"), r.json().get("lane"))
    ids.append(r.json()["id"])

d = requests.get(f"{API}/incidents/detect", headers=auth, timeout=90).json()
for inc in d["incidents"]:
    overlap = len(set(ids) & set(inc["issue_ids"]))
    print("INCIDENT", inc["keyword"], inc["category"], "count", inc["count"], "residents", inc["resident_count"],
          "window", inc["window_minutes"], "units", inc["units"], "overlap_with_generic_trio", overlap)
bad = [i for i in d["incidents"] if len(set(ids) & set(i["issue_ids"])) >= 3]
print("GENERIC_FALSE_POSITIVE" if bad else "NO_GENERIC_FALSE_POSITIVE")
