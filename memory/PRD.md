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

## Implemented — Steps 4-12 (2026-06): AI resolution engine + Attention Dashboard
- Step 4 lanes: RESOLVE (doc-grounded auto-answer), ACTION (auto-route Maintenance/Leasing/Concierge + acknowledgement), REVIEW (staff brief); P0 emergency escalation.
- Step 5 Citations/Confidence: answer + source doc + passage + confidence; only HIGH auto-sends; else REVIEW; contradictory docs → POLICY CONFLICT.
- Step 6 Resolution Memory: AI-match new messages to existing issues (no duplicates); returning-after-resolved reopens the SAME issue. CHECKPOINT 6 verified.
- Step 7 Confirmation: ACTION complete → confirmation_pending + resident Yes/No; silence stays pending. CHECKPOINT 7 verified.
- Step 8 Historical precedent: similar resolved cases + staff-only suggested_response (docs authoritative).
- Step 9 Attention Dashboard: "What needs your attention?" + 8 cards + Needs Attention ranking + 6 tabs + reopened highlighting.
- Step 10 Human Attention Score 0-100 with visible reasons.
- Step 11 Repeat complaint banner. Step 12 Shared incident detection + merge.
- Tested: 34/34 backend pytest incl. Checkpoints 5/6/7; full frontend UI verified; post-fix re-verified.

## Implemented (2026-06)
- Resident portal: submit request (optional category), track requests by name+unit with status badges.
- Public issue creation auto-creates resident + issue + resident interaction; server-side required-field validation.
- Staff Google login + protected dashboard: stats, searchable/filterable issues table, detail Sheet with status/priority/lane/team controls, staff messaging, system-logged changes, interaction timeline.
- Seed script (1 property, 50 residents, 5 issues). Tested: 23/24 backend + all frontend flows passing.

## Backlog (later phases)
- P1: AI triage (auto category/priority/lane/intent/sentiment), resident chat replies UI.
- P2: multi-property scoping, batch resident lookups (N+1), staff roles/permissions.

## Contest polish (2026-06)
- Added compact Business Impact strip to Staff Dashboard Overview (data-testid=impact-strip): 5 dynamic metrics from GET /api/impact (Handled without management %, Estimated time saved h, Resident-confirmed resolution %, Repeat issues detected, Failed resolutions surfaced), DEMO ENVIRONMENT badge + tooltips, "View Impact" -> /staff/insights. Placed above "Needs Your Attention" (kept as primary section). Mobile = 2-col grid, desktop = divided flex strip.
- Aligned /api/impact resident_confirmed_rate to compute over status==resolved (matches dashboard Confirmed Resolution card; was diverging 0% vs 100%).
- Polish: resident submission-result now renders the RESOLVE auto_response + Source immediately (submission-answer); Demo Mode Act 3 numbers aligned to live 603 record (attempts 1, attention 96); renamed seeded "Water Report 70x" residents to real names (units 701-704); fixed property doc footer to "Riverside Luxury Residences".
- QA: testing_agent iteration_8 -> 15/15 backend pytest PASS, all asserted frontend flows PASS (impact strip, Resolution Memory 603 reopen with no duplicate, RESOLVE/ACTION/REVIEW/P0 triage, confirmation Yes/No, demo mode acts 1-5, resident submit + My Requests, desktop+mobile). No critical/UI bugs.

## Known non-blocking notes
- /api/impact internally calls dashboard() (N+1 FRT loop runs twice per Overview load); cheap at current volume.
- Resolution Memory matching is LLM-only (no deterministic fallback) - headline feature depends on Claude availability.
- Public resident portal fires /api/auth/me -> 401 on load (harmless console noise).

## Visual polish + Productization (2026-06)
### Design system
- Restrained deep-blue brand palette added (tailwind `brand.*`, index.css --primary 222 62% 30%). Applied to logo tiles, primary buttons, active nav, focus rings.
- Semantic colors normalized in constants.js: green=resolved, amber=warning/reopened & REVIEW lane & P1, red=P0/failed, slate=neutral. Needs-Attention cards use left-accent borders; IssueDetail "PREVIOUS RESOLUTION FAILED" now a strong red-header banner. Resident portal + login rebranded.
- Staff Impact strip: animated count-up numbers, live refresh (polls /api/impact every 4s on Overview), "Snapshot" PNG export (html2canvas), "Reset Demo Data" button (POST /api/demo/reset).

### Commercial layer
- Public marketing site: routes / (Home), /product, /pricing, /about, /contact, /privacy, /terms with shared PublicLayout (header nav + "View Demo" + footer). Resident portal MOVED to /portal.
- Read-only Demo login: POST /api/auth/demo mints an isolated is_demo session (no Google). require_staff_write blocks demo (403) on all mutations + /leads. "View Demo" buttons call demoLogin then route to /staff. Sidebar shows DEMO ENVIRONMENT badge; Demo Requests nav hidden for demo; /staff/leads shows not-authorized state for demo.
- Lead capture: POST /api/leads (public, validated, rate-limited 5/hr via X-Forwarded-For) saves to db.leads; admin notification email to LEAD_NOTIFY_EMAIL via managed Resend (best-effort, never blocks form). Admin Leads view at /staff/leads (GET/PATCH /api/leads, staff-only) with status New/Contacted/Qualified/Closed.
- Resolution Fallback: deterministic_match() same-unit keyword safety net merges/reopens when the AI matcher returns nothing.

### QA
- iteration_9: 25/27 backend + 95% frontend pass. Fixed post-QA: rate-limit via X-Forwarded-For (verified 6th=429), reject empty email local part (verified 400), /staff/leads demo guard, /api/auth/me 401 noise skipped on public routes, App.js `React is not defined` runtime error.

## Design refinement — public site (2026-06)
- Refined CloseLoop brand mark (geometric incomplete resolution ring + completion check) in BrandMark.jsx — propagates to all surfaces (public header/footer, resident portal, staff login/dashboard, demo).
- Redesigned Product/"How It Works" page: compact editorial hero + mini product-concept visual (message → CloseLoop → RESOLVE/ACTION/REVIEW → reopened), horizontal 5-stage Intelligence Flow (Intake→Intelligence→Decision→Execution→Resolution) with the Intelligence stage as a deep-blue glow center, SVG connector line, concise per-stage captions, and a scroll-triggered reveal (~800-1100ms, once). Converts to vertical on mobile. Semantic lane accents: RESOLVE=teal, ACTION=brand blue, REVIEW=champagne. Tightened spacing; editorial two-column sections replace stacked boxes.
- Public nav: Product is now a compact dropdown (Overview / How It Works / Resolution Memory→/#resolution-memory) with chevron; homepage "See How It Works" -> /product. Flow animation keyframes added to index.css.

## Next Tasks
- Optional: move lead rate-limit counter to a shared/Mongo TTL store (survives restarts, multi-worker).
- Optional: split server.py (1686 lines) into routers.
- Begin Phase 2 AI intelligence when requested.
