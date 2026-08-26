import asyncio, os, json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
client = AsyncIOMotorClient(env["MONGO_URL"])
db = client[env["DB_NAME"]]

async def main():
    print("issues", await db.issues.count_documents({}))
    print("interactions", await db.interactions.count_documents({}))
    print("residents", await db.residents.count_documents({}))
    prop = await db.properties.find_one({}, {"_id": 0})
    print("property", prop.get("name") if prop else None)
    async for i in db.issues.find({"unit": "603"}, {"_id": 0}):
        print(json.dumps({k: i.get(k) for k in ["id","unit","status","lane","description","resident_confirmed","failed_resolution","resolution_attempts","resolved_at","created_at","contact_count","human_attention_score"]}, indent=1))
    async for r in db.residents.find({"unit": "603"}, {"_id": 0}):
        print("resident", r["name"], r["unit"], r["id"])

asyncio.run(main())
