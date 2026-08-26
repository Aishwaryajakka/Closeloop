import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
db = AsyncIOMotorClient(env["MONGO_URL"])[env["DB_NAME"]]


async def main():
    async for r in db.residents.find({"name": {"$regex": "^TEST"}}, {"_id": 0}):
        async for i in db.issues.find({"resident_id": r["id"]}, {"_id": 0}):
            await db.interactions.delete_many({"issue_id": i["id"]})
            await db.issues.delete_one({"id": i["id"]})
            print("deleted issue", i["id"], i["unit"], i["description"][:40])
        await db.residents.delete_one({"id": r["id"]})
        print("deleted resident", r["name"])
    async for i in db.issues.find({"unit": {"$regex": "^TEST"}}, {"_id": 0}):
        await db.interactions.delete_many({"issue_id": i["id"]})
        await db.issues.delete_one({"id": i["id"]})
        print("deleted stray TEST issue", i["id"])
    print("issues", await db.issues.count_documents({}), "interactions", await db.interactions.count_documents({}),
          "residents", await db.residents.count_documents({}))

asyncio.run(main())
