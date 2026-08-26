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

## Staff workspace + Ops Intelligence + public motion polish (2026-06)
- Staff sidebar restructured into grouped WORKSPACE/ISSUES/OPERATIONS with count badges + active states; one shared BrandMark logo. Issue sub-views driven by /staff?view=needs|review|action|resolved|failed|all (removed the duplicate pill row). Overview compacted: slim shared-incident bar (Overview-only), impact strip, single operational metrics row (replaced the 8-card grid), Needs Your Attention high with "View all". Added a mobile hamburger + drawer (below md) reusing the nav; responsive header.
- Analytics rebuilt as "Operations Intelligence" (client-side from /issues, recharts): time-range toggles, KPI strip, issue-trend area/line chart with series toggles, category breakdown, resolution quality, property hotspots, human attention, repeat & failed table. No backend changes.
- Public site motion/brand polish: global scroll-reveal (per-section, once, prefers-reduced-motion aware), sticky header scrolled state, animated Product dropdown, Pricing card hover (lift/scale/shadow) with teal checks, About headline line-reveal + staggered bullets, tightened How-It-Works flow (max-w-5xl) and Resolution Memory (45/55).
- Fixed iteration_10 items: navigate hook scope, mobile nav/signout gap, header wrap, clipped chart Y-axis, sub-view titles use sidebar labels, shared-incident scoped to Overview, duplicate tracking class.
- QA: iteration_10 frontend 95% pass (staff redesign) + visual verification of public polish (no runtime errors). Mobile drawer verified present in DOM (screenshot tool forces desktop width so drawer open not captured).

## Staff dashboard visual-system cleanup (2026-06)
- Centralized a restrained enterprise badge system in constants.js (neutral badges + tiny semantic accents): LANE badges neutral with a small dot (teal/blue/amber), PRIORITY/STATUS neutral with P0/Reopened accents, one analytical score pill (severity via text color only, no gamified tiles). Propagates across all issue tables + IssueDetailSheet.
- StaffDashboard: removed full-row pink/amber tints (white rows, subtle hover; extremely subtle tint only for critical), white Needs-Attention cards with 2px severity edge, Run Demo button → CloseLoop blue, Business Impact numbers → navy (teal/red only where meaningful), metrics-row icons de-rainbowed, shared-incident banner recolored from purple → CloseLoop blue. ~85-90% neutral, blue-led. Verified: Overview + All Issues render clean, no runtime errors.

## Demo experience polish (2026-06)
- DemoMode: replaced anonymous progress dots with a numbered workflow step indicator (01 Inbox → 05 Dashboard, clickable, labels collapse on mobile); aligned the shell to CloseLoop blue (logo + primary/exit buttons); applied teal/red semantic palette to the Resolution Memory timeline and softened the failed-resolution panel from saturated orange to pale red. Icons remain lucide SVG (no emoji). Demo logic/sequence unchanged.

## UI consolidation + brand logo (2026-06)
- Replaced BrandMark with the uploaded CloseLoop interlocking two-arrow loop mark (square 32-viewBox, currentColor). Because BrandMark is the single shared logo, the new mark propagates to staff sidebar, Staff Login, public header/footer, Demo, mobile drawer, and Resident Portal at once.
- Removed unicode-glyph icons: "▶ Run Demo" → lucide Play icon; demo "confirmed resolution ✓" glyph removed (timeline node already shows a Check). Verified zero ▶/✓/★ glyph icons remain in pages/components.
- Confirmed typography already unified (Manrope headings / Inter body) and shared systems (staff shell, one issues table, constants pills, IssueDetailSheet drawer) already consistent from prior passes — no rebuilds needed.

## Full-app visual pass to ZIP references (2026-06)
- Applied approved ZIP redesign to the EXISTING app via shared components (no rebuilds, no logic/API changes). Demo (DemoMode) and public Home already matched the references — left untouched.
- StaffLayout shell: new top bar with global search (?q= wired to All Issues table search), notification bell (→ Needs Attention, red dot when >0) and help; sidebar active state changed to neutral gray + brand left indicator + brand icon. Propagates to every staff route (Overview, all issue queues, Knowledge Base, Analytics).
- StaffDashboard Overview: Business Impact re-rendered as 3 accent KPI cards (Handled without management/teal, Estimated time saved/indigo, Resident-confirmed resolution/amber) with icon containers + left accent bars, plus repeat/failed chips; greeting personalized ("Good morning, {firstName}") with reference subtitle. Snapshot + View Impact preserved.
- constants.js: PRIORITY P1 pill → amber (semantic consistency P0 coral / P1 amber / P2-P3 slate). All queue tables (Needs/Review/Action/AI Resolved/Failed/All Issues) use one shared table and inherit this.
- Verified: Overview, Review table, Analytics, Knowledge shell, Home, Login, Demo render cleanly, no runtime errors, no desktop overflow.

## Homepage visual pass to reference (2026-06)
- Home.jsx rewritten to match the provided visual reference (ServiceNow-inspired operational clarity, unmistakably CloseLoop): 2-col hero with a dark AI-triage product preview (incoming resident message → glowing indigo/violet orb "CloseLoop is triaging…" → teal/blue/amber lane chips → floating status badge); RESOLVE/ACTION/REVIEW cards with 4px semantic top borders + example→arrow; Resolution Memory timeline (indigo nodes, teal confirm, coral PREVIOUS RESOLUTION FAILED); dark architecture band with highlighted "CloseLoop Intelligence" pill; indigo→violet metrics strip (94% / <2m / 100%); final demo CTA.
- Brand navy kept as primary; indigo/violet used only as AI/intelligence accents (per DESIGN.md semantics). All icons lucide SVG (no emoji/unicode/material). No routes/auth/demo/API touched; content preserved.
- Verified desktop + mobile (no horizontal overflow) via screenshots.

## Final contest polish + QA (2026-06)
- App.js: global ScrollToTop on route change (smooth-scrolls to #hash element when present, else top).
- PublicLayout: Product dropdown now hides the item matching the current pathname (Overview hidden on /product); "How It Works" points to /product#flow; footer "View Demo" is now a button that launches the demo (was a /contact link); footer logo size standardized.
- StaffLogin: removed the "← Are you a resident?" CTA link.
- DemoMode: NEW judge-facing "Submit a resident request" entry on Act 0 — deterministic client-side classifier (classifyDemo, NO backend/LLM call), injects a "You"-tagged row at top of the Act 1 inbox with a lane badge + result banner. Keywords: again/still/emergency→REVIEW, pool/hours/policy/etc→RESOLVE, else→ACTION. Restart clears the custom row. Mobile: control bar wraps (flex-wrap), Act 1 table is overflow-x-auto (min-w 560), submit disabled until all fields filled.
- QA: iteration_11 frontend 95% pass (all requested polish verified; zero /api calls on demo submit). Fixed the 3 reported mobile/validation items afterward and self-verified.

## Next Tasks
- Optional: move lead rate-limit counter to a shared/Mongo TTL store (survives restarts, multi-worker).
- Optional: split server.py (1686 lines) into routers.
- Begin Phase 2 AI intelligence when requested.
