"""Restore the seeded Unit 603 demo record to exact seed_demo.py values after the
live Resolution Memory test mutated derived fields (score/reasons/repeat_complaint/review_summary)."""
import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
client = AsyncIOMotorClient(env["MONGO_URL"])
db = client[env["DB_NAME"]]


async def main():
    issue = await db.issues.find_one({"unit": "603"}, {"_id": 0})
    created = issue["created_at"]
    d1 = created
    brief = {
        "what_happened": "A kitchen sink leak that was repaired and confirmed fixed is leaking again.",
        "what_resident_wants": "A permanent fix for the recurring leak.",
        "relevant_history": "Reported Day 1, fixed Day 2 (resident-confirmed), recurred Day 4.",
        "relevant_policy": "Maintenance procedures cover repeat repairs.",
        "why_human": "The prior repair failed — a repeat failure needs a human decision.",
        "suggested_action": "Send a senior plumber and inspect for an underlying cause, not just a reseal.",
    }
    existing_brief = issue.get("review_summary") or {}
    # keep the seed's key names if they differ
    keys = list(existing_brief.keys())
    if len(keys) == 6:
        brief = dict(zip(keys, list(brief.values())))
    await db.issues.update_one({"unit": "603"}, {"$set": {
        "contact_count": 2,
        "resolution_attempts": 1,
        "human_attention_score": 96,
        "attention_reasons": [
            "Resident is frustrated",
            "1 previous resolution attempt(s) failed",
            "Previous resolution failed",
            "2 resident contacts on this issue",
            "Human judgment flagged by AI",
            "Repeat complaint pattern",
        ],
        "repeat_complaint": {
            "first_contact": d1, "contact_count": 2,
            "previous_actions": ["Sent to Maintenance", "Repair completed", "Resident confirmed fixed"],
            "current_sentiment": "frustrated", "intervention_worked": True,
        },
        "review_summary": brief,
        "human_reason": "Resident reports the previously resolved leak has returned — second attempt.",
    }})
    print("issues", await db.issues.count_documents({}), "interactions", await db.interactions.count_documents({}))
    i = await db.issues.find_one({"unit": "603"}, {"_id": 0})
    print({k: i[k] for k in ["status", "lane", "resolution_attempts", "contact_count", "human_attention_score"]})
    print("--- thread order ---")
    async for x in db.interactions.find({"issue_id": i["id"]}, {"_id": 0}).sort("created_at", 1):
        print(x["created_at"], x["sender"], x["message"][:60])

asyncio.run(main())
