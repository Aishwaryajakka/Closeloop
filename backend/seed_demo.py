import asyncio
import uuid
from datetime import datetime, timezone, timedelta
import server as s

NOW = datetime.now(timezone.utc)


def iso(days=0, hours=0, minutes=0):
    return (NOW - timedelta(days=days, hours=hours, minutes=minutes)).isoformat()


async def ensure_resident(prop_id, name, unit):
    r = await s.db.residents.find_one({"name": name, "unit": unit, "property_id": prop_id}, {"_id": 0})
    if r:
        return r
    r = {"id": str(uuid.uuid4()), "name": name, "unit": unit, "property_id": prop_id}
    await s.db.residents.insert_one(dict(r))
    return r


def base_issue(prop_id, resident_id, unit, desc, created, **kw):
    d = {
        "id": str(uuid.uuid4()), "property_id": prop_id, "resident_id": resident_id, "unit": unit,
        "category": None, "description": desc, "desired_outcome": None, "priority": "P2",
        "lane": "REVIEW", "assigned_team": None, "status": "open", "human_reason": None,
        "created_at": created, "resolved_at": None, "resident_confirmed": False, "resolution_attempts": 0,
        "primary_intent": None, "urgency": None, "sentiment": None, "entities": [], "ai_location": None,
        "human_judgment_required": False, "ai_analyzed": True, "is_emergency": False,
        "auto_response": None, "answer_source": None, "answer_confidence": None, "answer_passage": None,
        "acknowledgement": None, "review_summary": None, "review_policy_source": [],
        "policy_conflict": False, "conflicting_documents": [], "suggested_response": None,
        "similar_cases": [], "repeat_complaint": None, "failed_resolution": False,
        "first_reported_at": created, "previous_resolved_at": None, "contact_count": 1,
        "confirmation_requested_at": None, "confirmed_at": None, "human_attention_score": 0,
        "attention_reasons": [], "safety_risk": False, "legal_or_financial": False,
        "multiple_residents_affected": False, "interpersonal": False, "ai_uncertain": False,
        "incident_id": None,
    }
    d.update(kw)
    score, reasons = s.compute_attention(d)
    d["human_attention_score"] = score
    d["attention_reasons"] = reasons
    return d


async def add(prop_id, name, unit, desc, created, interactions, **kw):
    resident = await ensure_resident(prop_id, name, unit)
    issue = base_issue(prop_id, resident["id"], unit, desc, created, **kw)
    await s.db.issues.insert_one(dict(issue))
    for sender, msg, ts, extra in interactions:
        doc = {"id": str(uuid.uuid4()), "issue_id": issue["id"],
               "resident_id": resident["id"] if sender == "resident" else None,
               "sender": sender, "message": msg, "created_at": ts,
               "detected_intent": extra.get("intent"), "detected_sentiment": extra.get("sentiment")}
        await s.db.interactions.insert_one(doc)
    return issue


async def run():
    prop = await s.db.properties.find_one({}, {"_id": 0})
    if not prop:
        print("Run seed.py first."); return
    pid = prop["id"]
    await s.db.issues.delete_many({})
    await s.db.interactions.delete_many({})
    await s.db.incidents.delete_many({})

    # ---------- RESOLVE (auto-answered from documents) ----------
    resolves = [
        ("Elena Petrova", "118", "What time does the pool close?", "amenity", "wants information",
         "The pool closes at 10:00 PM daily.", "Amenity Rules", "Know pool hours"),
        ("Marcus Reed", "244", "Can a guest use visitor parking overnight?", "parking", "wants permission",
         "Guests may park in visitor stalls for up to 48 hours; overnight is allowed if registered with the office.", "Parking Policy", "Confirm overnight guest parking"),
        ("Priya Nair", "355", "What is the weight limit for dogs here?", "pet", "wants information",
         "Up to two pets per unit, combined weight not to exceed 100 lbs.", "Pet Policy", "Confirm pet weight limit"),
        ("Tom Becker", "402", "What do I need to do for move-in day?", "move-in/out", "wants information",
         "Register your vehicle, collect keys at the leasing office, and review the move-in checklist in your handbook.", "Resident Handbook", "Understand move-in steps"),
        ("Sara Lin", "521", "How do I reserve the clubhouse?", "amenity", "wants a reservation",
         "Reserve the clubhouse via the resident portal with 72 hours notice and a refundable $150 deposit.", "Amenity Rules", "Reserve the clubhouse"),
    ]
    for name, unit, msg, cat, intent, ans, src, outcome in resolves:
        created = iso(days=1, hours=2)
        await add(pid, name, unit, msg, created,
                  [("resident", msg, created, {"intent": intent, "sentiment": "neutral"}),
                   ("ai", ans, iso(days=1, hours=2, minutes=-1), {})],
                  category=cat, lane="RESOLVE", status="resolved", resolved_at=iso(days=1, hours=1, minutes=59),
                  priority="P3", sentiment="neutral", primary_intent=intent, urgency="administrative",
                  desired_outcome=outcome, auto_response=ans, answer_source=src, answer_confidence="high",
                  answer_passage=ans, resident_confirmed=True, confirmed_at=iso(days=1, hours=1),
                  entities=[src])

    # ---------- ACTION (routed to a team) ----------
    actions = [
        ("Dana White", "133", "My dishwasher won't turn on at all.", "maintenance", "Maintenance", "P2", "wants something fixed", ["dishwasher"]),
        ("Owen Cruz", "209", "The hallway light on the 2nd floor is out.", "maintenance", "Maintenance", "P2", "wants something fixed", ["hallway light", "2nd floor"]),
        ("Mia Torres", "318", "The bathroom drain is really slow.", "maintenance", "Maintenance", "P2", "wants something fixed", ["bathroom drain"]),
        ("Jack Nolan", "426", "My package says delivered but it's not at the front desk.", "package", "Concierge", "P2", "wants action taken", ["package", "front desk"]),
        ("Lena Ford", "512", "My key fob stopped working at the north gate.", "amenity", "Concierge", "P1", "wants something fixed", ["key fob", "north gate"]),
    ]
    for name, unit, msg, cat, team, pri, intent, ents in actions:
        created = iso(hours=6)
        ack = f"Thanks — your request has been sent to {team}. We'll keep you updated here."
        await add(pid, name, unit, msg, created,
                  [("resident", msg, created, {"intent": intent, "sentiment": "neutral"}),
                   ("system", ack, iso(hours=5, minutes=58), {})],
                  category=cat, lane="ACTION", status="open", assigned_team=team, priority=pri,
                  sentiment="neutral", primary_intent=intent, urgency="normal", acknowledgement=ack,
                  desired_outcome="Get it fixed", entities=ents)

    def brief(what, wants, hist, policy, why, action):
        return {"what_happened": what, "resident_wants": wants, "relevant_history": hist,
                "relevant_policy": policy, "why_human_needed": why, "suggested_next_action": action}

    # ---------- REVIEW ----------
    # Ambiguous complaint
    await add(pid, "Ruth Adler", "228", "Things just haven't felt right in my unit lately.", iso(hours=9),
              [("resident", "Things just haven't felt right in my unit lately.", iso(hours=9), {"intent": "wants to report a problem", "sentiment": "anxious"})],
              category="complaint", lane="REVIEW", priority="P2", sentiment="anxious",
              primary_intent="wants to report a problem", human_judgment_required=True, ai_uncertain=True,
              human_reason="Message is vague; staff should follow up to clarify.",
              review_summary=brief("Resident reports a vague, unspecified problem.", "To feel heard and have someone look into it.",
                                   "No prior reports from this unit.", "No specific policy found.",
                                   "The request is ambiguous and needs a person to clarify.", "Call the resident to identify the specific concern."))
    # REVIEW with a staff-approvable suggested answer (Answer Approval demo)
    await add(pid, "Grace Kim", "610", "Is there a fee to use the rooftop terrace after 10 PM?", iso(hours=8),
              [("resident", "Is there a fee to use the rooftop terrace after 10 PM?", iso(hours=8), {"intent": "wants information", "sentiment": "neutral"})],
              category="amenity", lane="REVIEW", priority="P3", sentiment="neutral",
              primary_intent="wants information", human_judgment_required=True, ai_uncertain=True,
              desired_outcome="Know rooftop terrace after-hours rules", answer_source="Amenity Rules",
              answer_confidence="medium",
              suggested_response="Amenity quiet hours end at 10 PM; the amenity rules don't list a specific after-hours fee for the rooftop terrace, so please confirm with the leasing office before booking after 10 PM.",
              human_reason="A draft answer exists but confidence is medium; staff must confirm before sending.",
              similar_cases=[{"issue_id": "seed", "issue": "Clubhouse reservation after hours", "previous_answer": "After-hours amenity use requires office approval.", "outcome": "resolved", "resident_confirmed": True}],
              review_summary=brief("Resident asks whether the rooftop terrace has a fee after 10 PM.",
                                   "A clear answer on after-hours rooftop fees.", "First contact on this topic.",
                                   "Amenity Rules cover quiet hours (10 PM) but not an explicit after-hours fee.",
                                   "Answer is only medium-confidence from the documents.",
                                   "Confirm the after-hours policy and approve the drafted reply."))

    # Policy conflict
    await add(pid, "Victor Hale", "337", "Can my guest park overnight? I got two different answers.", iso(hours=12),
              [("resident", "Can my guest park overnight? I got two different answers.", iso(hours=12), {"intent": "wants information", "sentiment": "frustrated"})],
              category="parking", lane="REVIEW", priority="P2", sentiment="frustrated",
              primary_intent="wants information", human_judgment_required=True, policy_conflict=True,
              conflicting_documents=["Parking Policy", "Resident Handbook"],
              human_reason="Uploaded property documents conflict; staff must resolve the policy conflict.",
              review_summary=brief("Resident asks about overnight guest parking.", "A clear yes/no on overnight guest parking.",
                                   "First contact on this topic.", "Parking Policy allows 48h; Handbook says no overnight parking — conflict.",
                                   "Documents contradict each other, so AI cannot answer confidently.", "Reconcile the two documents and reply with the correct rule."))
    # Angry resident after multiple contacts
    await add(pid, "Gloria Mensah", "451", "This is the fourth time I'm asking about my A/C. I'm done waiting.", iso(days=2),
              [("resident", "My A/C isn't cooling.", iso(days=6), {"intent": "wants something fixed", "sentiment": "neutral"}),
               ("system", "Thanks — your request has been sent to Maintenance.", iso(days=6, minutes=-2), {}),
               ("staff", "Technician visited and reset the unit.", iso(days=5), {}),
               ("resident", "It's still not cooling properly.", iso(days=4), {"intent": "wants to escalate a prior issue", "sentiment": "frustrated"}),
               ("resident", "This is the fourth time I'm asking about my A/C. I'm done waiting.", iso(days=2), {"intent": "wants to escalate a prior issue", "sentiment": "angry"})],
              category="complaint", lane="REVIEW", priority="P1", sentiment="angry", contact_count=3,
              resolution_attempts=1, failed_resolution=True, human_judgment_required=True,
              primary_intent="wants to escalate a prior issue", first_reported_at=iso(days=6),
              human_reason="Repeated contacts and an angry resident after a failed repair.",
              repeat_complaint={"first_contact": iso(days=6), "contact_count": 3,
                                "previous_actions": ["Sent to Maintenance", "Technician reset the unit"],
                                "current_sentiment": "angry", "intervention_worked": False},
              review_summary=brief("A/C not cooling after a prior repair; resident now angry on 4th contact.",
                                   "A working A/C and acknowledgement of the delay.", "Reported 4 days ago; one failed technician visit.",
                                   "Maintenance procedures cover HVAC response times.", "Repeated failed resolution with a frustrated resident.",
                                   "Escalate to the maintenance lead and call the resident with a firm timeline."))
    # Potential emergency
    await add(pid, "Henry Voss", "504", "I smell gas in my kitchen and feel dizzy.", iso(hours=2),
              [("resident", "I smell gas in my kitchen and feel dizzy.", iso(hours=2), {"intent": "wants management intervention", "sentiment": "anxious"})],
              category="safety", lane="REVIEW", priority="P0", is_emergency=True, sentiment="anxious",
              safety_risk=True, human_judgment_required=True, urgency="emergency",
              primary_intent="wants management intervention", desired_outcome="Immediate safety response",
              entities=["gas smell", "kitchen"], review_policy_source=["Emergency Procedures"],
              human_reason="Possible gas leak — potential life-safety emergency requiring immediate human action.",
              review_summary=brief("Resident reports a gas smell and dizziness.", "Immediate help and to be safe.",
                                   "No prior related reports.", "Emergency Procedures: evacuate, call 911, contact the 24-hour line.",
                                   "Life-safety emergency; AI must not handle high-risk decisions.", "Dispatch emergency response now and advise the resident to evacuate and call 911."))

    # ---------- Repeated noise complaint (Step 11) ----------
    await add(pid, "Carla Dunn", "412", "The upstairs neighbors are loud again late at night.", iso(days=1),
              [("resident", "There's loud noise from the unit above me at night.", iso(days=13), {"intent": "wants to report a problem", "sentiment": "frustrated"}),
               ("staff", "Security spoke with the upstairs unit.", iso(days=12), {}),
               ("resident", "It happened again last night.", iso(days=7), {"intent": "wants to escalate a prior issue", "sentiment": "frustrated"}),
               ("staff", "Security intervened a second time.", iso(days=6), {}),
               ("resident", "The upstairs neighbors are loud again late at night.", iso(days=1), {"intent": "wants to escalate a prior issue", "sentiment": "frustrated"})],
              category="noise", lane="REVIEW", priority="P1", sentiment="frustrated", contact_count=3,
              resolution_attempts=2, failed_resolution=True, human_judgment_required=True, interpersonal=True,
              primary_intent="wants to escalate a prior issue", first_reported_at=iso(days=13),
              human_reason="Repeat noise complaint unresolved after two security interventions.",
              repeat_complaint={"first_contact": iso(days=13), "contact_count": 3,
                                "previous_actions": ["Security spoke with upstairs unit", "Security intervened a second time"],
                                "current_sentiment": "frustrated", "intervention_worked": False},
              review_summary=brief("Unit 412 reports recurring nighttime noise from the unit above; 3 reports in 14 days.",
                                   "The noise to stop for good.", "3 reports in 14 days; 2 security interventions.",
                                   "Resident Handbook quiet hours are 10 PM–7 AM.", "Multiple interventions have not resolved it; needs management action.",
                                   "Meet with both residents and issue a formal quiet-hours notice."))

    # ---------- Building-wide water outage (Step 12) ----------
    for i, unit in enumerate(["701", "702", "703", "704"]):
        created = iso(hours=1, minutes=10 - i * 3)
        await add(pid, f"Water Report {unit}", unit, "There's no water coming out of any tap in my unit.", created,
                  [("resident", "There's no water coming out of any tap in my unit.", created, {"intent": "wants to report a problem", "sentiment": "anxious"})],
                  category="maintenance", lane="REVIEW", priority="P1", sentiment="anxious",
                  multiple_residents_affected=True, human_judgment_required=True,
                  primary_intent="wants to report a problem", entities=["no water", "tap"],
                  human_reason="Multiple units report no water — possible building-wide outage.")

    # ---------- Resolution Memory storyline: Unit 603 kitchen sink ----------
    resident = await ensure_resident(pid, "Nathan Brooks", "603")
    d1, d2, d4 = iso(days=4), iso(days=3), iso(days=0, hours=3)
    issue = base_issue(pid, resident["id"], "603", "My kitchen sink is leaking.", d1,
                       category="maintenance", lane="REVIEW", status="reopened", priority="P1",
                       sentiment="frustrated", primary_intent="wants to escalate a prior issue",
                       assigned_team="Maintenance", desired_outcome="A sink that stays fixed",
                       entities=["kitchen sink", "leak"], first_reported_at=d1, previous_resolved_at=d2,
                       resolved_at=None, resolution_attempts=1, failed_resolution=True, resident_confirmed=False,
                       contact_count=2, human_judgment_required=True,
                       human_reason="Resident reports the previously resolved leak has returned — second attempt.",
                       repeat_complaint={"first_contact": d1, "contact_count": 2,
                                         "previous_actions": ["Sent to Maintenance", "Repair completed", "Resident confirmed fixed"],
                                         "current_sentiment": "frustrated", "intervention_worked": True},
                       review_summary=brief("A kitchen sink leak that was repaired and confirmed fixed is leaking again.",
                                            "A permanent fix for the recurring leak.", "Reported Day 1, fixed Day 2 (resident-confirmed), recurred Day 4.",
                                            "Maintenance procedures cover repeat repairs.", "The prior repair failed — a repeat failure needs a human decision.",
                                            "Send a senior plumber and inspect for an underlying cause, not just a reseal."))
    await s.db.issues.insert_one(dict(issue))
    story = [
        ("resident", "My kitchen sink is leaking.", d1, resident["id"]),
        ("system", "Thanks — your request has been sent to Maintenance. We'll keep you updated here.", iso(days=4, minutes=-2), None),
        ("staff", "Plumber replaced the drain seal and confirmed no active leak.", d2, None),
        ("system", "Marked complete — awaiting resident confirmation by Maintenance", iso(days=3, minutes=-2), None),
        ("ai", "Is everything working now? Please confirm in your resident portal.", iso(days=3, minutes=-4), None),
        ("resident", "✓ Confirmed resolved — everything is working now.", iso(days=3, minutes=-6), resident["id"]),
        ("resident", "The sink you fixed is leaking again.", d4, resident["id"]),
        ("system", "Previous resolution failed — issue reopened and routed to REVIEW.", iso(days=0, hours=2, minutes=59), None),
    ]
    for sender, msg, ts, rid in story:
        await s.db.interactions.insert_one({"id": str(uuid.uuid4()), "issue_id": issue["id"], "resident_id": rid,
                                            "sender": sender, "message": msg, "created_at": ts,
                                            "detected_intent": None, "detected_sentiment": None})

    n_issues = await s.db.issues.count_documents({})
    n_inter = await s.db.interactions.count_documents({})
    print(f"Demo seed complete: {n_issues} issues, {n_inter} interactions.")
    s.client.close()


if __name__ == "__main__":
    asyncio.run(run())
