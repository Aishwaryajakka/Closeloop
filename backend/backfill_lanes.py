import asyncio
import server as s


async def run():
    issues = await s.db.issues.find({}, {"_id": 0}).to_list(1000)
    for issue in issues:
        # remove prior auto system/ai interactions so re-triage doesn't duplicate them
        await s.db.interactions.delete_many({"issue_id": issue["id"], "sender": {"$in": ["system", "ai"]}})
        inter = await s.db.interactions.find_one(
            {"issue_id": issue["id"], "sender": "resident"}, {"_id": 0}, sort=[("created_at", 1)]
        )
        if not inter:
            continue
        # reset lane-outcome fields before re-triage
        await s.db.issues.update_one({"id": issue["id"]}, {"$set": {
            "auto_response": None, "answer_source": None, "answer_confidence": None,
            "acknowledgement": None, "review_summary": None, "review_policy_source": [],
            "resolved_at": None, "status": "open",
        }})
        await s.run_triage(issue["id"], inter["id"], inter["message"])
        doc = await s.db.issues.find_one({"id": issue["id"]}, {"_id": 0})
        print(f"unit {doc['unit']:>4}: lane={doc['lane']:<8} pri={doc['priority']} team={doc.get('assigned_team')} status={doc['status']}")
    s.client.close()
    print("Lane backfill complete.")


if __name__ == "__main__":
    asyncio.run(run())
