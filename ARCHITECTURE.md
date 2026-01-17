# Vouchins – System Architecture

This document explains the architectural decisions behind Vouchins, with a focus on **trust, security, and long-term scalability**.

---

## Core Design Goal

Vouchins is designed to support **high-trust interactions between real professionals**, not anonymous engagement.

Every architectural decision flows from this requirement.

---

## Identity & Trust Model

Vouchins separates the user lifecycle into three distinct phases:

1. **Verification** – Proving email ownership
2. **Authentication** – Creating a secure session
3. **Application State** – Managing profile and content access

These phases are intentionally decoupled.

---

## Authentication Architecture

* Supabase Auth manages:

  * Password storage
  * Session creation
  * Token rotation
* Application code never stores passwords
* Admin APIs are used only for server-side, privileged operations

This reduces attack surface and operational risk.

---

## Authorization Strategy

Authorization is enforced primarily at the **database level** using Row Level Security (RLS):

* UI components assume minimal privileges
* API routes do not act as the source of truth
* Policies are explicit, readable, and auditable

This prevents:

* privilege escalation
* accidental data leaks
* logic drift between frontend and backend

---

## Data Model Philosophy

* `auth.users` → identity & credentials
* `users` → application-level state
* `email_otps` → temporary verification only
* Content tables are immutable by default

No table has mixed responsibility.

---

## Why This Matters

This architecture:

* scales cleanly across companies and geographies
* supports regulatory scrutiny
* enables safe feature expansion
* reduces moderation overhead

It is intentionally conservative.

---

## Trade-offs

* Slightly more upfront complexity
* Slower feature iteration initially

In exchange, Vouchins gains:

* long-term correctness
* institutional trust
* enterprise readiness

This is a deliberate choice.
