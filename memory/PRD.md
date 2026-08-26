# PropTriage — PRD

## Original Problem Statement
Phase 1 (skeleton, NO AI): MVP web app for multifamily property management. Resident side (no login) submits name + unit + free-text message + optional category and can track their requests/status. Staff side (login-protected dashboard) lists all issues in a table (Unit, Resident, Category, Priority, Lane, Status, Assigned team, Created time), can open an issue, change status, assign a team, and view the full interaction timeline.

## Architecture
- Backend: FastAPI + MongoDB (motor). All routes under `/api`.
- Frontend: React 19 + React Router + Tailwind + Shadcn UI + sonner.
- Auth: Emergent-managed Google login (session_token cookie + Bearer fallback).
- Collections: properties, residents, issues, interactions, users, user_sessions.

## User Choices
- Staff login: Emergent Google login. Residents: no login. Design: clean/professional (slate theme).
- Seed: 1 property (Rivergate Commons), 50 residents, 5 issues.
- Owner account: aishwaryajakka@hotmail.com

## Data Model
- Properties(id, name, address)
- Residents(id, name, unit, property_id)
- Issues(id, property_id, resident_id, unit, category, description, desired_outcome, priority[P0-P3], lane[RESOLVE/ACTION/REVIEW], assigned_team, status[open/in_progress/confirmation_pending/resolved/reopened], human_reason, created_at, resolved_at, resident_confirmed, resolution_attempts)
- Interactions(id, issue_id, resident_id, sender, message, created_at, detected_intent, detected_sentiment)

## Implemented — Step 2 (2026-06): Property Knowledge Base + rebrand
- Rebranded PropTriage → **CloseLoop** ("Close problems, not tickets." / "Every resident issue, followed through to resolution.") across resident portal, staff login, sidebar, page title.
- Property Knowledge page (/staff/knowledge) with staff sidebar nav: table of name, type, uploaded date, processing status; upload / replace / remove.
- Backend: Emergent object storage (EMERGENT_LLM_KEY + INTEGRATION_PROXY_URL) for PDF/DOCX/TXT; on upload extracts text + splits into chunks (document_chunks, embedding field reserved) → processing_status pending/processing/ready/failed. Non-blocking via run_in_threadpool. Endpoints: GET/POST /api/documents, PUT /replace, DELETE (soft-delete), GET /download.
- Seeded 4 demo PDF policy docs (parking, pets, amenities, maintenance/emergencies), all indexed/ready.
- Tested: 48/48 backend + all frontend flows pass. No AI auto-answering yet (per scope).

## Implemented (2026-06)
- Resident portal: submit request (optional category), track requests by name+unit with status badges.
- Public issue creation auto-creates resident + issue + resident interaction; server-side required-field validation.
- Staff Google login + protected dashboard: stats, searchable/filterable issues table, detail Sheet with status/priority/lane/team controls, staff messaging, system-logged changes, interaction timeline.
- Seed script (1 property, 50 residents, 5 issues). Tested: 23/24 backend + all frontend flows passing.

## Backlog (later phases)
- P1: AI triage (auto category/priority/lane/intent/sentiment), resident chat replies UI.
- P2: multi-property scoping, batch resident lookups (N+1), staff roles/permissions.

## Next Tasks
- Begin Phase 2 AI intelligence when requested.
