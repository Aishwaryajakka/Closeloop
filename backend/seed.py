import asyncio
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

FIRST = ["Maria", "James", "Priya", "David", "Aisha", "Liam", "Sofia", "Noah", "Emma", "Kenji",
         "Fatima", "Lucas", "Grace", "Omar", "Chloe", "Mateo", "Zoe", "Ethan", "Nina", "Raj"]
LAST = ["Garcia", "Chen", "Patel", "Nguyen", "Kim", "Johnson", "Rossi", "Silva", "Okafor", "Brown",
        "Martinez", "Khan", "Anderson", "Lopez", "Singh", "Murphy", "Cohen", "Reyes", "Wright", "Ali"]


def now():
    return datetime.now(timezone.utc)


async def run():
    await db.properties.delete_many({})
    await db.residents.delete_many({})
    await db.issues.delete_many({})
    await db.interactions.delete_many({})

    prop = {"id": str(uuid.uuid4()), "name": "Rivergate Commons", "address": "1200 Rivergate Blvd, Austin, TX 78701"}
    await db.properties.insert_one(dict(prop))

    # 50 residents across units on 5 floors
    residents = []
    used_units = set()
    for _ in range(50):
        while True:
            unit = f"{random.randint(1,5)}{random.randint(0,4)}{random.randint(1,9)}"
            if unit not in used_units:
                used_units.add(unit)
                break
        r = {
            "id": str(uuid.uuid4()),
            "name": f"{random.choice(FIRST)} {random.choice(LAST)}",
            "unit": unit,
            "property_id": prop["id"],
        }
        residents.append(r)
    await db.residents.insert_many([dict(r) for r in residents])

    seed_requests = [
        {"msg": "The kitchen faucet has been dripping non-stop for two days and the cabinet below is getting damp.",
         "cat": "Plumbing", "priority": "P1", "lane": "ACTION", "team": "Plumbing", "status": "open"},
        {"msg": "No power in half of my living room outlets since last night. Breaker keeps tripping.",
         "cat": "Electrical", "priority": "P0", "lane": "RESOLVE", "team": "Electrical", "status": "in_progress"},
        {"msg": "AC is blowing warm air and the apartment is 82 degrees. Please help, I have a toddler.",
         "cat": "HVAC", "priority": "P1", "lane": "ACTION", "team": "HVAC", "status": "in_progress"},
        {"msg": "The dishwasher won't drain and there's standing water at the bottom.",
         "cat": "Appliance", "priority": "P2", "lane": "REVIEW", "team": "Maintenance", "status": "confirmation_pending"},
        {"msg": "I've seen a couple of roaches near the pantry this week. Would like pest control to take a look.",
         "cat": "Pest Control", "priority": "P2", "lane": "REVIEW", "team": None, "status": "open"},
    ]

    for idx, req in enumerate(seed_requests):
        resident = residents[idx]
        created = now() - timedelta(hours=random.randint(2, 72))
        issue_id = str(uuid.uuid4())
        issue = {
            "id": issue_id,
            "property_id": prop["id"],
            "resident_id": resident["id"],
            "unit": resident["unit"],
            "category": req["cat"],
            "description": req["msg"],
            "desired_outcome": None,
            "priority": req["priority"],
            "lane": req["lane"],
            "assigned_team": req["team"],
            "status": req["status"],
            "human_reason": None,
            "created_at": created.isoformat(),
            "resolved_at": None,
            "resident_confirmed": False,
            "resolution_attempts": 0,
        }
        await db.issues.insert_one(dict(issue))
        interactions = [{
            "id": str(uuid.uuid4()),
            "issue_id": issue_id,
            "resident_id": resident["id"],
            "sender": "resident",
            "message": req["msg"],
            "created_at": created.isoformat(),
            "detected_intent": None,
            "detected_sentiment": None,
        }]
        if req["status"] != "open":
            interactions.append({
                "id": str(uuid.uuid4()),
                "issue_id": issue_id,
                "resident_id": None,
                "sender": "staff",
                "message": "Thanks for reporting this. We've logged the request and a team member will follow up shortly.",
                "created_at": (created + timedelta(hours=1)).isoformat(),
                "detected_intent": None,
                "detected_sentiment": None,
            })
        await db.interactions.insert_many(interactions)

    print("Seed complete: 1 property, 50 residents, 5 issues with interactions.")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
