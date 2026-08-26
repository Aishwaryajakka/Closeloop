import asyncio
import server as s


async def run():
    issues = await s.db.issues.find({}, {"_id": 0}).to_list(1000)
    for issue in issues:
        inter = await s.db.interactions.find_one(
            {"issue_id": issue["id"], "sender": "resident"}, {"_id": 0}, sort=[("created_at", 1)]
        )
        if not inter:
            continue
        analysis = await s.apply_analysis(issue["id"], inter["id"], inter["message"])
        status = "ok" if analysis else "FAILED"
        intent = analysis.get("primary_intent") if analysis else "-"
        print(f"[{status}] unit {issue['unit']}: intent={intent}")
    s.client.close()
    print("Backfill complete.")


if __name__ == "__main__":
    asyncio.run(run())
