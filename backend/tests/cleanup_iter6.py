"""Cleanup + DB state verification for iteration 6 QA data.

Usage: python /app/backend/tests/cleanup_iter6.py
Removes residents matching ^QA (and their issues/interactions) plus any QA documents+chunks,
then prints the final DB counts.
"""
import re
import sys
from pymongo import MongoClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
db = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]

rx = re.compile(r"^(QA|TEST)", re.I)
res_ids = [r["id"] for r in db.residents.find({"name": {"$regex": "^(QA|TEST)", "$options": "i"}}, {"id": 1})]
issue_ids = [i["id"] for i in db.issues.find({"resident_id": {"$in": res_ids}}, {"id": 1})]
print("residents:", len(res_ids), "issues:", len(issue_ids))
if issue_ids:
    print("interactions removed:", db.interactions.delete_many({"issue_id": {"$in": issue_ids}}).deleted_count)
    print("issues removed:", db.issues.delete_many({"id": {"$in": issue_ids}}).deleted_count)
if res_ids:
    print("residents removed:", db.residents.delete_many({"id": {"$in": res_ids}}).deleted_count)

docs = list(db.property_documents.find({"name": {"$regex": "^(QA|TEST)", "$options": "i"}}, {"id": 1, "name": 1}))
doc_ids = [d["id"] for d in docs]
if doc_ids:
    print("chunks removed:", db.document_chunks.delete_many({"document_id": {"$in": doc_ids}}).deleted_count)
    print("docs removed:", db.property_documents.delete_many({"id": {"$in": doc_ids}}).deleted_count)
print("incidents removed:", db.incidents.delete_many({}).deleted_count)

counts = {
    "issues": db.issues.count_documents({}),
    "residents": db.residents.count_documents({}),
    "documents": db.property_documents.count_documents({"is_deleted": False}),
    "chunks": db.document_chunks.count_documents({}),
    "incidents": db.incidents.count_documents({}),
    "interactions": db.interactions.count_documents({}),
}
print("FINAL:", counts)
ok = counts["issues"] == 5 and counts["residents"] == 50 and counts["documents"] == 4
print("STATE_OK" if ok else "STATE_MISMATCH")
for i in db.issues.find({}, {"_id": 0, "lane": 1, "human_attention_score": 1, "description": 1}):
    print(" ", i.get("lane"), i.get("human_attention_score"), i.get("description", "")[:50])
sys.exit(0 if ok else 1)
