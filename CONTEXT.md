# ReplyFlow — Project Context

## What is ReplyFlow?

ReplyFlow is an **AI-powered email auto-reply SaaS** built for e-commerce businesses. It automatically reads incoming customer support emails, generates contextual responses using GPT-4o, and sends replies — with zero manual intervention for the majority of cases. The primary business goal is to **reduce chargebacks, automate tier-1 support, and escalate only truly complex cases to human review**.

The system is designed especially for e-commerce stores (dropshipping, fashion, etc.) that receive high volumes of complaints about product quality, delivery delays, and refund/chargeback threats.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| Database | Firebase Firestore (via Admin SDK on server) |
| AI | OpenAI GPT-4o (`openai` SDK v6) |
| Email Inbound | ImapFlow (IMAP) |
| Email Outbound | Nodemailer (SMTP) |
| Auth | JWT via `jose` (HS256, cookie-based, 8h session) |
| Encryption | AES-256-GCM (Node.js `crypto` module) |
| Deployment | Vercel (with native Cron Jobs) |

---

## Architecture Overview

### Data Flow

```
Vercel Cron (every 2 min)
    → /api/cron/fetch-emails
        → IMAP: fetch new emails per active account
        → Spam filter (headers-based)
        → AI classification (ignore / alert / normal)
        → Customer match/create (Firestore)
        → Save EmailDoc (status: "pending", reply scheduled in 10 min)

Vercel Cron (every 1 min)
    → /api/cron/process-replies
        → Query: emails where status="pending" AND scheduledReplyAt <= now
        → Fetch customer history + Shopify order data
        → GPT-4o generates reply
        → SMTP sends email
        → Update EmailDoc (status: "sent")
        → Extract AI flags → create TaskDoc if human action needed
```

### Firestore Collections

| Collection | Purpose |
|---|---|
| `accounts` | Email account configs (IMAP/SMTP), encrypted credentials, optional Shopify integration |
| `emails` | All inbound emails with full lifecycle status tracking |
| `customers` | Deduplicated customer profiles linked to emails |
| `tasks` | Human-action tasks created by AI when manual review is needed |
| `config/context` | The editable AI system prompt stored as `systemPrompt` field |

---

## Core Modules

### `/src/lib/email/imap.ts`
Fetches new emails via IMAP using `ImapFlow`. On first run (lastUid=0) fetches from account creation date; subsequently fetches only emails with UID > lastUid. Runs spam/automated-email filtering before returning results.

### `/src/lib/email/smtp.ts`
Sends replies via SMTP using `nodemailer`. Handles threading headers (`In-Reply-To`, `References`).

### `/src/lib/email/spam-filter.ts`
Header-based filter to drop bulk mail, newsletters, and automated responses before they enter the pipeline. Checks: `List-Unsubscribe`, `Precedence`, `Auto-Submitted`, `X-AutoReply`, no-reply sender addresses.

### `/src/lib/ai/openai.ts`
All AI interactions:
- `classifyEmail()` — Determines if an email should be processed, ignored, or flagged as a critical alert.
- `generateReply()` — Generates a customer support reply using GPT-4o. Injects full customer history, current email, and Shopify order data. Strips quoted reply text from email threads.
- `extractFlags()` — Parses the AI response to extract internal action flags (chargeback_risk, manual_review, refund_pending, photos_received, etc.).

**AI Behavior rules (enforced via system prompt):**
- Always replies in **English** regardless of customer language
- Never reveals it's an AI
- Focuses on chargeback prevention (offer solutions before chargeback is opened)
- Signature always ends with the store name (never a hardcoded agent name)
- When customer accepts an offer, confirms it — does NOT escalate to a higher offer

### `/src/lib/customer/identifier.ts`
Customer deduplication engine:
1. Exact email match
2. Order number match (extracted from email body via regex)
3. Fuzzy name match (Levenshtein distance)
4. Creates new customer if no match found
Also provides `getCustomerEmailHistory()` for building AI context.

### `/src/lib/shopify/client.ts`
Shopify Admin REST API integration (v2024-10). Looks up orders by order number or customer email. Formats order data (fulfillment status, tracking, line items, days in transit) for injection into AI prompt.

### `/src/lib/crypto/encryption.ts`
AES-256-GCM encryption for sensitive stored values (email passwords, Shopify tokens). Key derived from `ENCRYPTION_KEY` env var. Format: `iv:tag:ciphertext` (hex-encoded).

### `/src/lib/auth/session.ts`
JWT session management using `jose`. Cookie name: `rf_session`. 8-hour expiry. Single-user admin system (no user accounts, just one admin login).

### `/src/lib/firebase/admin.ts`
Singleton Firebase Admin SDK initialization. Lazy-initialized Firestore instance.

---

## API Routes

### Cron (protected by `CRON_SECRET` header, not session)
- `GET/POST /api/cron/fetch-emails` — Fetches new emails from all active accounts
- `GET/POST /api/cron/process-replies` — Processes pending emails and sends AI replies

### Auth
- `POST /api/auth/login` — Validates admin credentials, sets JWT cookie
- `POST /api/auth/logout` — Clears session cookie

### Dashboard API (protected by session)
- `GET/POST /api/accounts` — List and create email accounts
- `GET/PUT/DELETE /api/accounts/[id]` — Account management
- `GET/PUT /api/context` — Read/write AI system prompt
- `GET /api/emails` — List emails with filters
- `GET /api/emails/[id]` — Single email detail
- `POST /api/emails/[id]/send` — Manually trigger reply for an email
- `POST /api/emails/[id]/cancel` — Cancel a pending reply
- `GET/POST /api/customers` — Customer list and creation
- `GET/PUT /api/customers/[id]` — Customer detail
- `GET/POST /api/tasks` — Task list and creation
- `GET/PUT /api/tasks/[id]` — Task detail
- `POST /api/admin/trigger` — Dashboard trigger for manually running cron jobs (force mode)
- `POST /api/translate` — Translation helper

### Shopify OAuth
- `GET /api/shopify/install` — Initiates OAuth flow
- `GET /api/shopify/callback` — OAuth callback, stores encrypted token
- `GET /api/shopify/test` — Tests Shopify connection for an account

---

## Dashboard Pages

All pages are under the `(dashboard)` route group with a shared sidebar layout.

| Route | Description |
|---|---|
| `/` | Main email inbox — lists emails grouped by customer, with status badges, real-time countdown to scheduled reply, account/status filters |
| `/tasks` | Human review tasks grouped by customer, sorted by priority (high/medium/low), with flag badges |
| `/context` | Editable AI system prompt (stored in Firestore `config/context`) |
| `/accounts` | Email account management (add/edit/delete accounts, Shopify OAuth) |
| `/customers` | Customer CRM — list and detail views |
| `/emails/[id]` | Individual email detail with full thread and AI response preview |

---

## Email Status Lifecycle

```
pending → processing → sent
                     → failed
         cancelled
```

- `pending`: Email saved, waiting for scheduledReplyAt
- `processing`: Being processed by cron (prevents duplicate processing)
- `sent`: Reply successfully sent via SMTP
- `failed`: Error during processing (logged in `error` field)
- `cancelled`: Manually cancelled from dashboard

---

## AI System Prompt / Context

The file `prompt.md` at the root is the **reference template** for the AI system prompt. It defines the customer support workflow used in production. The actual live prompt is stored in Firestore at `config/context.systemPrompt` and is editable via the `/context` dashboard page.

The prompt defines escalation flows for:
- Fake/quality complaints: request photos → 40% refund → 50% → 70% → 100% on chargeback threat
- Delivery issues: tracking info, carrier delays, neighbor delivery
- Chargeback/PayPal disputes: immediate resolution offer
- Address changes: create `manual_review` flag for human team

---

## Task Flags

When the AI detects situations requiring human intervention, it sets flags on `TaskDoc`:

| Flag | Meaning |
|---|---|
| `chargeback_risk` | Customer threatened chargeback/dispute |
| `manual_review` | Needs human decision (address change, special case) |
| `refund_pending` | Refund was promised, needs processing |
| `photos_received` | Customer sent product photos |
| `carrier_problem` | Shipping carrier issue detected |
| `address_problem` | Delivery address issue |

---

## Environment Variables

```env
# OpenAI
OPENAI_API_KEY=

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Auth
JWT_SECRET=                  # min 32 chars
ADMIN_EMAIL=                 # dashboard login email
ADMIN_PASSWORD=              # dashboard login password

# Encryption
ENCRYPTION_KEY=              # 32-byte hex key for AES-256-GCM

# Cron protection
CRON_SECRET=                 # shared secret between Vercel cron and the app

# Shopify (optional)
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
```

---

## Key Design Decisions

1. **Single-user admin system** — No multi-tenancy. One admin login protects all routes.
2. **10-minute reply delay** — Intentional. Avoids instant robot-like responses and allows manual cancellation before sending.
3. **Batch processing (5 emails/cron run)** — Prevents Vercel function timeouts. With 1-minute cron frequency, any backlog drains quickly.
4. **Encrypted credentials in Firestore** — IMAP passwords and Shopify tokens are AES-256-GCM encrypted before storage; the encryption key never leaves the server environment.
5. **Customer deduplication** — One customer profile aggregates all emails across different addresses/order numbers to give the AI full context on repeat contacts.
6. **Shopify is optional per account** — Each account independently can be linked to a Shopify store. Order data enriches AI replies but is non-blocking if unavailable.
7. **All AI replies in English** — Hard-coded rule in the system prompt, cannot be overridden by customer language or store context templates.

---

## Project Conventions

- All server-side code uses **Firebase Admin SDK** (`@/lib/firebase/admin`)
- All client components are marked with `"use client"` — server components are default
- API routes follow **Next.js App Router** conventions (`route.ts` files)
- Tailwind CSS v4 with a dark theme (`bg-gray-950` base, indigo accent)
- TypeScript strict mode; all Firestore documents have typed interfaces in `src/lib/types.ts`
- No ORM — raw Firestore queries throughout
- `pnpm` is the package manager
