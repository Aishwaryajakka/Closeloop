from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

STATUS_VALUES = ["open", "in_progress", "confirmation_pending", "resolved", "reopened"]
LANE_VALUES = ["RESOLVE", "ACTION", "REVIEW"]
PRIORITY_VALUES = ["P0", "P1", "P2", "P3"]
TEAM_VALUES = ["Maintenance", "Plumbing", "Electrical", "HVAC", "Housekeeping", "Leasing Office", "Security"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ------------------- Models -------------------
class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str


class Resident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    property_id: str


class Issue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    resident_id: str
    unit: str
    category: Optional[str] = None
    description: str
    desired_outcome: Optional[str] = None
    priority: str = "P2"
    lane: str = "REVIEW"
    assigned_team: Optional[str] = None
    status: str = "open"
    human_reason: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    resolved_at: Optional[str] = None
    resident_confirmed: bool = False
    resolution_attempts: int = 0


class Interaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_id: str
    resident_id: Optional[str] = None
    sender: str  # "resident" | "staff" | "system"
    message: str
    created_at: str = Field(default_factory=now_iso)
    detected_intent: Optional[str] = None
    detected_sentiment: Optional[str] = None


# ------------------- Request Schemas -------------------
class IssueCreate(BaseModel):
    name: str
    unit: str
    message: str
    category: Optional[str] = None
    property_id: Optional[str] = None


class IssueUpdate(BaseModel):
    status: Optional[str] = None
    lane: Optional[str] = None
    priority: Optional[str] = None
    assigned_team: Optional[str] = None
    human_reason: Optional[str] = None


class StaffMessage(BaseModel):
    message: str


class ResidentLookup(BaseModel):
    name: str
    unit: str


# ------------------- Auth helpers -------------------
async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ------------------- Auth routes -------------------
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session id")

    async with httpx.AsyncClient() as hc:
        r = await hc.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session id")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "created_at": now_iso(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ------------------- Public / Resident routes -------------------
@api_router.get("/config")
async def get_config():
    prop = await db.properties.find_one({}, {"_id": 0})
    return {
        "property": prop,
        "statuses": STATUS_VALUES,
        "lanes": LANE_VALUES,
        "priorities": PRIORITY_VALUES,
        "teams": TEAM_VALUES,
        "categories": ["Plumbing", "Electrical", "HVAC", "Appliance", "Pest Control", "General", "Noise", "Other"],
    }


@api_router.post("/issues", response_model=Issue)
async def create_issue(payload: IssueCreate):
    prop = None
    if payload.property_id:
        prop = await db.properties.find_one({"id": payload.property_id}, {"_id": 0})
    if not prop:
        prop = await db.properties.find_one({}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=400, detail="No property configured")
    property_id = prop["id"]

    name = payload.name.strip()
    unit = payload.unit.strip()
    message = payload.message.strip()
    if not name or not unit or not message:
        raise HTTPException(status_code=400, detail="Name, unit and message are required")

    resident = await db.residents.find_one(
        {"name": name, "unit": unit, "property_id": property_id}, {"_id": 0}
    )
    if not resident:
        resident = Resident(name=name, unit=unit, property_id=property_id).model_dump()
        await db.residents.insert_one(resident)

    issue = Issue(
        property_id=property_id,
        resident_id=resident["id"],
        unit=unit,
        category=payload.category,
        description=message,
    )
    await db.issues.insert_one(issue.model_dump())

    interaction = Interaction(
        issue_id=issue.id,
        resident_id=resident["id"],
        sender="resident",
        message=payload.message,
    )
    await db.interactions.insert_one(interaction.model_dump())
    return issue


@api_router.post("/residents/requests")
async def resident_requests(payload: ResidentLookup):
    prop = await db.properties.find_one({}, {"_id": 0})
    resident = await db.residents.find_one(
        {"name": payload.name, "unit": payload.unit, "property_id": prop["id"] if prop else None},
        {"_id": 0},
    )
    if not resident:
        return {"resident": None, "issues": []}
    issues = await db.issues.find({"resident_id": resident["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"resident": resident, "issues": issues}


@api_router.post("/issues/{issue_id}/reply")
async def resident_reply(issue_id: str, payload: StaffMessage):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    interaction = Interaction(
        issue_id=issue_id,
        resident_id=issue["resident_id"],
        sender="resident",
        message=payload.message,
    )
    await db.interactions.insert_one(interaction.model_dump())
    if issue["status"] in ("resolved", "confirmation_pending"):
        await db.issues.update_one({"id": issue_id}, {"$set": {"status": "reopened"}})
    return interaction


# ------------------- Staff (protected) routes -------------------
async def enrich_issue(issue):
    resident = await db.residents.find_one({"id": issue["resident_id"]}, {"_id": 0})
    issue["resident_name"] = resident["name"] if resident else "Unknown"
    return issue


@api_router.get("/issues")
async def list_issues(user=Depends(get_current_user)):
    issues = await db.issues.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for i in issues:
        await enrich_issue(i)
    return issues


@api_router.get("/issues/{issue_id}")
async def get_issue(issue_id: str, user=Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    await enrich_issue(issue)
    interactions = await db.interactions.find({"issue_id": issue_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    issue["interactions"] = interactions
    return issue


@api_router.patch("/issues/{issue_id}")
async def update_issue(issue_id: str, payload: IssueUpdate, user=Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    updates = {}
    logs = []
    if payload.status is not None:
        if payload.status not in STATUS_VALUES:
            raise HTTPException(status_code=400, detail="Invalid status")
        updates["status"] = payload.status
        logs.append(f"Status changed to {payload.status}")
        if payload.status == "resolved":
            updates["resolved_at"] = now_iso()
    if payload.lane is not None:
        if payload.lane not in LANE_VALUES:
            raise HTTPException(status_code=400, detail="Invalid lane")
        updates["lane"] = payload.lane
        logs.append(f"Lane set to {payload.lane}")
    if payload.priority is not None:
        if payload.priority not in PRIORITY_VALUES:
            raise HTTPException(status_code=400, detail="Invalid priority")
        updates["priority"] = payload.priority
        logs.append(f"Priority set to {payload.priority}")
    if payload.assigned_team is not None:
        if payload.assigned_team and payload.assigned_team not in TEAM_VALUES:
            raise HTTPException(status_code=400, detail="Invalid team")
        updates["assigned_team"] = payload.assigned_team or None
        logs.append(f"Assigned to {payload.assigned_team}" if payload.assigned_team else "Unassigned")
    if payload.human_reason is not None:
        updates["human_reason"] = payload.human_reason

    if updates:
        await db.issues.update_one({"id": issue_id}, {"$set": updates})
    if logs:
        interaction = Interaction(
            issue_id=issue_id,
            sender="system",
            message="; ".join(logs) + f" by {user.get('name', 'Staff')}",
        )
        await db.interactions.insert_one(interaction.model_dump())

    updated = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    await enrich_issue(updated)
    return updated


@api_router.post("/issues/{issue_id}/message")
async def staff_message(issue_id: str, payload: StaffMessage, user=Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    interaction = Interaction(
        issue_id=issue_id,
        sender="staff",
        message=payload.message,
    )
    await db.interactions.insert_one(interaction.model_dump())
    return interaction


@api_router.get("/stats")
async def stats(user=Depends(get_current_user)):
    all_issues = await db.issues.find({}, {"_id": 0}).to_list(5000)
    total = len(all_issues)
    by_status = {}
    for i in all_issues:
        by_status[i["status"]] = by_status.get(i["status"], 0) + 1
    return {
        "total": total,
        "open": by_status.get("open", 0),
        "in_progress": by_status.get("in_progress", 0),
        "resolved": by_status.get("resolved", 0),
    }


@api_router.get("/")
async def root():
    return {"message": "PropTriage API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
