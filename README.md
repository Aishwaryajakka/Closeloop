# CloseLoop

### AI-powered resident operations that remembers whether problems were actually solved.

CloseLoop is an AI resident-operations platform for residential properties. It understands resident requests, resolves routine questions, routes operational work, and detects failed or recurring issues that need human attention.

> **Closing a ticket isn't the same as solving the problem.**

## Live Demo

**CloseLoop:** https://triage-skeleton.emergent.host

No staff account required — select **View Demo Dashboard** to explore the seeded demo environment.

---

## The Problem

Resident operations generate a constant stream of requests:

- “What time does the pool close?”
- “My dishwasher stopped working.”
- “There’s water leaking under my sink.”
- “The upstairs neighbors are loud again.”
- “The AC you fixed is broken again.”

Traditional systems are good at creating and closing tickets, but they often lose the context between interactions.

A ticket can be marked **resolved** while the resident's actual problem isn't.

CloseLoop is designed around the **lifecycle of the problem**, not just the lifecycle of the ticket.

---

## How CloseLoop Works

Every resident request is understood and routed into one of three operational lanes:

### RESOLVE
Routine questions are answered automatically using approved property knowledge.

**Example:**  
“What time does the pool close?”

→ CloseLoop provides the resident-facing answer.

### ACTION
Operational requests are structured and routed to the appropriate team.

**Example:**  
“My dishwasher stopped working.”

→ Routed to Maintenance.

### REVIEW
Issues requiring judgment, escalation, or additional context are surfaced to staff.

**Example:**  
“The sink you fixed is leaking again.”

→ Previous resolution detected → Human Review.

---

## Resolution Memory

**Resolution Memory** is the core idea behind CloseLoop.

Instead of treating every new message as an unrelated ticket, CloseLoop maintains context across the resolution lifecycle.

```text
Resident reports issue
        ↓
CloseLoop triages it
        ↓
Work is completed
        ↓
Resident confirms resolution
        ↓
Resolution is remembered
        ↓
Problem returns
        ↓
PREVIOUS RESOLUTION FAILED
        ↓
Same issue reopened + elevated for review
```

### Example

A resident reports:

> “My kitchen sink is leaking.”

Maintenance repairs it and the resident confirms the issue is resolved.

Later, the resident says:

> **“The sink you fixed is leaking again.”**

CloseLoop recognizes the previous issue instead of treating the message as unrelated.

The original issue is reopened, its history is preserved, and staff see that the **previous resolution failed**.

---

## Key Features

- **AI Request Triage** — understands resident intent, category, priority, sentiment, and desired outcome
- **RESOLVE / ACTION / REVIEW** — separates automation, operational work, and human judgment
- **Property Knowledge** — answers routine questions using property-specific information
- **Resolution Memory** — remembers previous resolutions and recognizes recurring problems
- **Failed Resolution Detection** — identifies when a supposedly resolved issue returns
- **Human Attention** — prioritizes issues that require staff judgment
- **Resident Confirmation** — tracks whether residents confirm that an issue was actually resolved
- **Emergency Escalation** — surfaces high-priority/P0 situations
- **Operational Work Queues** — Review, Action, AI Resolved, Failed Resolutions, and All Issues
- **Operations Intelligence** — visibility into issue patterns and resolution quality
- **Demo Environment** — seeded experience available without staff authentication

---

## Human-in-the-Loop by Design

CloseLoop is not designed to automate every resident interaction.

AI handles situations where automation is appropriate while escalating cases involving:

- failed resolutions
- recurring complaints
- safety concerns
- high-priority incidents
- frustrated residents
- ambiguous requests
- situations requiring human judgment

The goal is not to replace property teams.

The goal is to remove routine coordination so people can focus their attention where it matters.

---

## Product Flow

```text
                 Resident Request
                        │
                        ▼
              CloseLoop Intelligence
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
          RESOLVE     ACTION     REVIEW
             │          │          │
        Auto-answer   Route      Human
             │        work      judgment
             └──────────┼──────────┘
                        ▼
                   Resolution
                        │
                        ▼
              Resident Confirmation
                        │
                        ▼
                Resolution Memory
                   │           │
                   ▼           ▼
               Resolved     Reopened
                               │
                               ▼
                     Human Attention
```

---

## Demo It

For the clearest demonstration of CloseLoop, enter the demo environment and try the recurring-issue scenario:

> **The sink you fixed is leaking again.**

Watch how CloseLoop connects the interaction to the existing issue and previous resolution instead of treating it as an unrelated request.

Then explore the operational dashboard to see how the issue is presented to staff.

---

## Product Philosophy

CloseLoop is built around four ideas:

**Automate the routine.**  
Routine requests shouldn't consume unnecessary management attention.

**Route the work.**  
AI should move requests toward operational outcomes, not simply classify messages.

**Keep humans in control.**  
Risk, ambiguity, escalation, and judgment belong with people.

**Remember what happened.**  
If a supposedly resolved problem returns, that history matters.

---

## Current Status

CloseLoop is currently a prototype demonstrating an AI-native approach to residential operations, human-in-the-loop automation, and resolution intelligence.

The demo environment uses seeded data and is isolated from authenticated staff data.

---

## Security

API keys, database credentials, authentication secrets, and other sensitive environment variables should never be committed to this repository.

Use environment configuration for secrets and keep `.env` files out of version control.

---

## Built With

CloseLoop combines a modern web application, backend APIs, persistent issue data, AI-assisted triage, property knowledge, operational workflows, and resolution tracking into a unified resident-operations experience.

---

## The Idea in One Line

### **CloseLoop handles the routine, routes the work, and remembers when a supposedly solved problem comes back.**
