from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import requests
from starlette.concurrency import run_in_threadpool

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

DOCUMENT_TYPES = [
    "Lease", "Resident Handbook", "Pet Policy", "Parking Policy",
    "Amenity Rules", "Maintenance Procedures", "Emergency Procedures", "Move-In/Out Instructions",
]

# ------------------- Object storage (Emergent) -------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "closeloop"
ALLOWED_EXT = {"pdf", "docx", "txt"}
MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}
_storage_key = None


def init_storage(force=False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path, data, content_type):
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def extract_text(data, ext):
    ext = ext.lower()
    try:
        if ext == "pdf":
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        if ext == "docx":
            import docx
            d = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in d.paragraphs)
        if ext == "txt":
            return data.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"extract_text failed: {e}")
    return ""


def chunk_text(text, size=800, overlap=100):
    text = " ".join(text.split())
    if not text:
        return []
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i + size])
        i += size - overlap
    return chunks


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


class PropertyDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    name: str
    doc_type: str
    storage_path: str
    original_filename: str
    content_type: str
    size: int = 0
    processing_status: str = "pending"  # pending | processing | ready | failed
    chunk_count: int = 0
    is_deleted: bool = False
    uploaded_at: str = Field(default_factory=now_iso)
    uploaded_by: Optional[str] = None


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
        "document_types": DOCUMENT_TYPES,
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
    return {"message": "CloseLoop API"}


# ------------------- Property Knowledge (documents) -------------------
async def process_document(doc_id, data, ext):
    await db.property_documents.update_one({"id": doc_id}, {"$set": {"processing_status": "processing"}})
    await db.document_chunks.delete_many({"document_id": doc_id})
    text = await run_in_threadpool(extract_text, data, ext)
    chunks = chunk_text(text)
    if chunks:
        chunk_docs = [{
            "id": str(uuid.uuid4()),
            "document_id": doc_id,
            "chunk_index": idx,
            "text": c,
            "embedding": None,  # reserved for later semantic search
            "created_at": now_iso(),
        } for idx, c in enumerate(chunks)]
        await db.document_chunks.insert_many(chunk_docs)
        await db.property_documents.update_one(
            {"id": doc_id}, {"$set": {"processing_status": "ready", "chunk_count": len(chunks)}}
        )
    else:
        await db.property_documents.update_one(
            {"id": doc_id}, {"$set": {"processing_status": "failed", "chunk_count": 0}}
        )


async def resolve_property(property_id):
    prop = None
    if property_id:
        prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        prop = await db.properties.find_one({}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=400, detail="No property configured")
    return prop


@api_router.get("/documents")
async def list_documents(user=Depends(get_current_user)):
    docs = await db.property_documents.find({"is_deleted": False}, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)
    return docs


@api_router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    doc_type: str = Form(...),
    property_id: Optional[str] = Form(None),
    user=Depends(get_current_user),
):
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "").lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX or TXT.")
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type")
    prop = await resolve_property(property_id)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/{prop['id']}/{uuid.uuid4()}.{ext}"
    result = await run_in_threadpool(put_object, path, data, content_type)
    doc = PropertyDocument(
        property_id=prop["id"],
        name=name.strip() or file.filename,
        doc_type=doc_type,
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=content_type,
        size=result.get("size", len(data)),
        uploaded_by=user.get("name"),
    )
    await db.property_documents.insert_one(doc.model_dump())
    await process_document(doc.id, data, ext)
    return await db.property_documents.find_one({"id": doc.id}, {"_id": 0})


@api_router.put("/documents/{doc_id}/replace")
async def replace_document(doc_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    doc = await db.property_documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "").lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, DOCX or TXT.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/{doc['property_id']}/{uuid.uuid4()}.{ext}"
    result = await run_in_threadpool(put_object, path, data, content_type)
    await db.property_documents.update_one({"id": doc_id}, {"$set": {
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "uploaded_at": now_iso(),
        "uploaded_by": user.get("name"),
        "processing_status": "pending",
        "chunk_count": 0,
    }})
    await process_document(doc_id, data, ext)
    return await db.property_documents.find_one({"id": doc_id}, {"_id": 0})


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    res = await db.property_documents.update_one(
        {"id": doc_id, "is_deleted": False}, {"$set": {"is_deleted": True}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.document_chunks.delete_many({"document_id": doc_id})
    return {"ok": True}


@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user=Depends(get_current_user)):
    doc = await db.property_documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    data, content_type = await run_in_threadpool(get_object, doc["storage_path"])
    return Response(
        content=data,
        media_type=doc.get("content_type", content_type),
        headers={"Content-Disposition": f'inline; filename="{doc["original_filename"]}"'},
    )


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


@app.on_event("startup")
async def startup_storage():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
