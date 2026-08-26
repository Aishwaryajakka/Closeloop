"""Step 2: Property Knowledge Base (property documents) API tests."""
import io
import os
import time

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

SESSION_TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_step2_demo")

EXPECTED_TYPES = [
    "Lease", "Resident Handbook", "Pet Policy", "Parking Policy",
    "Amenity Rules", "Maintenance Procedures", "Emergency Procedures",
    "Move-In/Out Instructions",
]

CREATED_DOC_IDS = []


@pytest.fixture(scope="session")
def anon():
    return requests.Session()


@pytest.fixture(scope="session")
def auth():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
    return s


@pytest.fixture(scope="session")
def cookie_client():
    s = requests.Session()
    s.cookies.set("session_token", SESSION_TOKEN)
    return s


def txt_file(content=b"Parking rules. " * 200, name="TEST_doc.txt"):
    return {"file": (name, io.BytesIO(content), "text/plain")}


# ---------------- /api/config document_types ----------------
class TestConfigDocumentTypes:
    def test_config_document_types(self, anon):
        r = anon.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        types = r.json().get("document_types")
        assert types is not None, "document_types missing from /api/config"
        assert types == EXPECTED_TYPES, types
        assert len(types) == 8


# ---------------- GET /api/documents ----------------
class TestListDocuments:
    def test_requires_auth(self, anon):
        r = anon.get(f"{BASE_URL}/api/documents")
        assert r.status_code == 401

    def test_invalid_token(self, anon):
        r = anon.get(f"{BASE_URL}/api/documents", headers={"Authorization": "Bearer bogus_token"})
        assert r.status_code == 401

    def test_cookie_auth_works(self, cookie_client):
        r = cookie_client.get(f"{BASE_URL}/api/documents")
        assert r.status_code == 200

    def test_seeded_demo_docs(self, auth):
        r = auth.get(f"{BASE_URL}/api/documents")
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        seeded = [d for d in docs if not d["name"].startswith("TEST_")]
        assert len(seeded) >= 4, f"expected >=4 seeded docs, got {len(seeded)}"
        for d in seeded:
            assert "_id" not in d
            assert d["processing_status"] == "ready", (d["name"], d["processing_status"])
            assert d["chunk_count"] > 0, d["name"]
            assert d["doc_type"] in EXPECTED_TYPES
            assert d["is_deleted"] is False
            assert d["storage_path"] and isinstance(d["storage_path"], str)
            assert d["size"] > 0
            assert d["uploaded_at"]
        # sorted desc by uploaded_at
        ua = [d["uploaded_at"] for d in docs]
        assert ua == sorted(ua, reverse=True)
        # expected demo topics
        blob = " ".join(d["name"].lower() + " " + d["doc_type"].lower() for d in seeded)
        for topic in ["parking", "pet", "amenity", "maintenance"]:
            assert topic in blob, f"missing demo doc topic: {topic}"


# ---------------- POST /api/documents ----------------
class TestUploadDocument:
    def test_requires_auth(self, anon):
        r = anon.post(f"{BASE_URL}/api/documents", files=txt_file(),
                      data={"name": "TEST_x", "doc_type": "Pet Policy"})
        assert r.status_code == 401

    def test_upload_txt_ready_with_chunks(self, auth):
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(name="TEST_upload.txt"),
                      data={"name": "TEST_Upload Doc", "doc_type": "Parking Policy"})
        assert r.status_code == 200, r.text
        d = r.json()
        CREATED_DOC_IDS.append(d["id"])
        assert "_id" not in d
        assert d["name"] == "TEST_Upload Doc"
        assert d["doc_type"] == "Parking Policy"
        assert d["original_filename"] == "TEST_upload.txt"
        assert d["content_type"] == "text/plain"
        assert d["processing_status"] == "ready", d
        assert d["chunk_count"] > 0
        assert d["size"] > 0
        assert d["is_deleted"] is False
        assert d["storage_path"].endswith(".txt")

        # persisted in list
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        match = [x for x in docs if x["id"] == d["id"]]
        assert len(match) == 1
        assert match[0]["chunk_count"] == d["chunk_count"]
        assert match[0]["processing_status"] == "ready"

    def test_upload_pdf(self, auth):
        pdf = _make_pdf("TEST PDF policy content for chunking. " * 40)
        r = auth.post(f"{BASE_URL}/api/documents",
                      files={"file": ("TEST_policy.pdf", io.BytesIO(pdf), "application/pdf")},
                      data={"name": "TEST_PDF Doc", "doc_type": "Amenity Rules"})
        assert r.status_code == 200, r.text
        d = r.json()
        CREATED_DOC_IDS.append(d["id"])
        assert d["content_type"] == "application/pdf"
        assert d["processing_status"] == "ready", d
        assert d["chunk_count"] > 0

    @pytest.mark.parametrize("fname,ctype", [
        ("TEST_bad.exe", "application/octet-stream"),
        ("TEST_bad.png", "image/png"),
        ("TEST_noext", "application/octet-stream"),
    ])
    def test_rejects_bad_extension(self, auth, fname, ctype):
        r = auth.post(f"{BASE_URL}/api/documents",
                      files={"file": (fname, io.BytesIO(b"junk"), ctype)},
                      data={"name": "TEST_bad", "doc_type": "Pet Policy"})
        assert r.status_code == 400, r.text
        assert "detail" in r.json()

    def test_rejects_invalid_doc_type(self, auth):
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(name="TEST_dt.txt"),
                      data={"name": "TEST_bad type", "doc_type": "TEST_NotAType"})
        assert r.status_code == 400, r.text
        assert "Invalid document type" in r.json()["detail"]

    def test_missing_fields_422(self, auth):
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(name="TEST_m.txt"))
        assert r.status_code == 422


# ---------------- PUT /api/documents/{id}/replace ----------------
class TestReplaceDocument:
    def test_replace_resets_and_reprocesses(self, auth):
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(b"original short text " * 10, "TEST_orig.txt"),
                      data={"name": "TEST_Replace Doc", "doc_type": "Pet Policy"})
        assert r.status_code == 200, r.text
        original = r.json()
        CREATED_DOC_IDS.append(original["id"])
        doc_id = original["id"]

        time.sleep(1)
        big = b"Replaced pet policy content with many more words. " * 300
        r2 = auth.put(f"{BASE_URL}/api/documents/{doc_id}/replace",
                      files={"file": ("TEST_replaced.txt", io.BytesIO(big), "text/plain")})
        assert r2.status_code == 200, r2.text
        updated = r2.json()
        assert updated["id"] == doc_id
        assert updated["original_filename"] == "TEST_replaced.txt"
        assert updated["uploaded_at"] > original["uploaded_at"]
        assert updated["storage_path"] != original["storage_path"]
        assert updated["processing_status"] == "ready"
        assert updated["chunk_count"] > original["chunk_count"], (updated["chunk_count"], original["chunk_count"])
        assert updated["name"] == "TEST_Replace Doc"  # name preserved

        # persisted
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        got = next(x for x in docs if x["id"] == doc_id)
        assert got["original_filename"] == "TEST_replaced.txt"
        assert got["chunk_count"] == updated["chunk_count"]

        # new file bytes are downloadable
        dl = auth.get(f"{BASE_URL}/api/documents/{doc_id}/download")
        assert dl.status_code == 200
        assert b"Replaced pet policy content" in dl.content

    def test_replace_404(self, auth):
        r = auth.put(f"{BASE_URL}/api/documents/does-not-exist/replace",
                     files=txt_file(name="TEST_x.txt"))
        assert r.status_code == 404

    def test_replace_bad_ext(self, auth):
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        doc_id = docs[0]["id"]
        r = auth.put(f"{BASE_URL}/api/documents/{doc_id}/replace",
                     files={"file": ("TEST_bad.exe", io.BytesIO(b"x"), "application/octet-stream")})
        assert r.status_code == 400

    def test_replace_requires_auth(self, anon, auth):
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        r = anon.put(f"{BASE_URL}/api/documents/{docs[0]['id']}/replace", files=txt_file(name="TEST_x.txt"))
        assert r.status_code == 401


# ---------------- GET /api/documents/{id}/download ----------------
class TestDownload:
    def test_download_txt(self, auth):
        content = b"TEST download content marker 12345 " * 20
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(content, "TEST_dl.txt"),
                      data={"name": "TEST_Download Doc", "doc_type": "Emergency Procedures"})
        assert r.status_code == 200, r.text
        doc_id = r.json()["id"]
        CREATED_DOC_IDS.append(doc_id)

        dl = auth.get(f"{BASE_URL}/api/documents/{doc_id}/download")
        assert dl.status_code == 200
        assert dl.headers["content-type"].startswith("text/plain")
        assert dl.content == content

    def test_download_seeded_pdf(self, auth):
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        pdf_docs = [d for d in docs if d["content_type"] == "application/pdf"]
        assert pdf_docs, "no PDF documents found"
        dl = auth.get(f"{BASE_URL}/api/documents/{pdf_docs[0]['id']}/download")
        assert dl.status_code == 200
        assert dl.headers["content-type"].startswith("application/pdf")
        assert dl.content[:4] == b"%PDF"

    def test_download_requires_auth(self, anon, auth):
        docs = auth.get(f"{BASE_URL}/api/documents").json()
        r = anon.get(f"{BASE_URL}/api/documents/{docs[0]['id']}/download")
        assert r.status_code == 401

    def test_download_404(self, auth):
        r = auth.get(f"{BASE_URL}/api/documents/nope-nope/download")
        assert r.status_code == 404


# ---------------- DELETE /api/documents/{id} ----------------
class TestDeleteDocument:
    def test_soft_delete_removes_chunks(self, auth):
        r = auth.post(f"{BASE_URL}/api/documents", files=txt_file(b"delete me content " * 50, "TEST_del.txt"),
                      data={"name": "TEST_Delete Doc", "doc_type": "Lease"})
        assert r.status_code == 200, r.text
        doc_id = r.json()["id"]
        assert r.json()["chunk_count"] > 0

        d = auth.delete(f"{BASE_URL}/api/documents/{doc_id}")
        assert d.status_code == 200
        assert d.json() == {"ok": True}

        docs = auth.get(f"{BASE_URL}/api/documents").json()
        assert doc_id not in [x["id"] for x in docs]

        # soft delete: record still present, chunks gone
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        mc = MongoClient(env["MONGO_URL"])
        db = mc[env["DB_NAME"]]
        rec = db.property_documents.find_one({"id": doc_id}, {"_id": 0})
        assert rec is not None, "record hard-deleted instead of soft-deleted"
        assert rec["is_deleted"] is True
        assert db.document_chunks.count_documents({"document_id": doc_id}) == 0
        mc.close()

        # deleted doc is not downloadable / replaceable
        assert auth.get(f"{BASE_URL}/api/documents/{doc_id}/download").status_code == 404
        assert auth.put(f"{BASE_URL}/api/documents/{doc_id}/replace",
                        files=txt_file(name="TEST_x.txt")).status_code == 404
        CREATED_DOC_IDS.append(doc_id)

    def test_delete_404(self, auth):
        r = auth.delete(f"{BASE_URL}/api/documents/nonexistent-id-123")
        assert r.status_code == 404

    def test_delete_requires_auth(self, anon):
        r = anon.delete(f"{BASE_URL}/api/documents/whatever")
        assert r.status_code == 401


def _make_pdf(text):
    """Minimal single-page PDF with extractable text."""
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 800
    for i in range(0, len(text), 90):
        c.drawString(40, y, text[i:i + 90])
        y -= 14
        if y < 40:
            c.showPage()
            y = 800
    c.save()
    return buf.getvalue()


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    try:
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        mc = MongoClient(env["MONGO_URL"])
        db = mc[env["DB_NAME"]]
        ids = [d["id"] for d in db.property_documents.find({"name": {"$regex": "^TEST_"}}, {"id": 1})]
        ids = list(set(ids + CREATED_DOC_IDS))
        db.document_chunks.delete_many({"document_id": {"$in": ids}})
        db.property_documents.delete_many({"id": {"$in": ids}})
        mc.close()
    except Exception as e:
        print(f"cleanup failed: {e}")
