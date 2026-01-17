# Vouchins

**Vouchins** is a trust-based community platform for verified corporate professionals to exchange recommendations, housing leads, and buy/sell requests — without anonymity, spam, or broker noise.

Unlike open forums or anonymous apps, every interaction on Vouchins is tied to a **real person, real company, and verified corporate identity**.

---

## Why Vouchins

Professionals rely on informal office groups, internal Slack channels, or word-of-mouth for:

* finding flatmates
* buying or selling items
* getting trusted recommendations

These solutions **do not scale beyond a single company** and break down the moment you leave that network.

Vouchins extends the trust of your workplace into a **location-based, cross-company professional network**, while preserving accountability.

---

## Core Principles

* **Verified by Default**
  Only corporate email addresses are allowed. No personal email domains.

* **Accountability Over Anonymity**
  Real names and company affiliation create high-signal interactions.

* **Text-First, Signal-First**
  No feeds optimized for engagement farming. Content over cosmetics.

* **Local + Professional Context**
  See posts from colleagues in your company and professionals in your city.

---

## Product Capabilities

* **Verified Signup Flow**

  * Corporate email verification
  * Mandatory onboarding before access

* **Structured Posting**

  * Categories: Housing, Buy/Sell, Recommendations
  * Visibility controls: company-only or cross-company

* **Built-in Trust Controls**

  * Database-level access control
  * No anonymous posting
  * Ownership-based edits and deletes

* **Auto-Moderation**

  * Posts containing broker-like language or phone numbers are automatically flagged
  * Human review before any action

* **Admin & Safety Tooling**

  * Reported content review
  * User activity controls
  * No automated bans

---

## Technical Overview (High-Level)

This repository represents a **production-grade MVP**, optimized for correctness, security, and clarity.

* **Frontend**

  * Next.js (App Router)
  * TypeScript
  * Tailwind CSS
  * shadcn/ui

* **Backend & Data**

  * PostgreSQL (Supabase)
  * Row Level Security (RLS) enforced at database level
  * Server-side privileged operations isolated

* **Authentication**

  * Supabase Auth
  * Corporate email verification
  * No password storage outside the auth provider

* **Deployment**

  * Vercel-ready
  * Stateless, horizontally scalable

This repo intentionally avoids premature abstractions and focuses on **clean boundaries between trust, identity, and application state**.

---

## Security & Trust Model

* Email ownership is verified **before** account creation
* Application permissions are enforced **in the database**, not just in code
* Users can only access content they are entitled to
* Sensitive flows (verification, moderation) are server-only

This architecture minimizes:

* spam
* impersonation
* privilege escalation
* data leakage

---

## What This Repo Is (and Is Not)

**This is:**

* A functional MVP
* A reference architecture for verified communities
* Built with long-term scalability in mind

**This is not:**

* A growth-hacked consumer app
* A fully polished product
* A final UX or feature set

Several features are intentionally deferred to maintain focus.

---

## Roadmap (Non-MVP)

The following are deliberately excluded at this stage:

* Direct messaging
* Payments or transactions
* Ratings / reviews
* AI-driven recommendations
* Mobile applications
* Influencer or creator mechanics

The current focus is **trust density**, not feature breadth.

---

## Status

Vouchins is in active development and early validation.

This repository is public to demonstrate:

* product thinking
* security discipline
* engineering quality

Business logic, growth strategy, and go-to-market details are intentionally kept outside the codebase.

---

## Documentation

* 📄 **Developer Setup**: `docs/Vouchins_Developer_Setup_Guide.pdf`
* 🏗 **Architecture**: `ARCHITECTURE.md`
* 🔐 **Security Overview**: `SECURITY.md`
* 🤝 **Contributing**: `CONTRIBUTING.md`

These documents are intentionally high-level and safe for a public repository.

---

## License

Proprietary.
All rights reserved.

---

Built with a focus on **trust, accountability, and professional signal**.
