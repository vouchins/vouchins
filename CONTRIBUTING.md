# Contributing to Vouchins

Thank you for your interest in contributing to Vouchins.

This repository represents a **trust-sensitive system**, so contributions prioritize **correctness, clarity, and security** over speed or feature volume.

---

## Guiding Principles

* **Trust First**: Any change must preserve identity verification and accountability.
* **Database-Enforced Security**: Authorization lives primarily in RLS, not UI logic.
* **Minimal Surface Area**: Avoid introducing unnecessary abstractions.
* **Readable Over Clever**: Optimize for maintainability and auditability.

---

## Development Workflow

1. Create a feature branch from `main`
2. Keep changes focused and scoped
3. Prefer small, reviewable commits
4. Add comments where behavior may not be obvious
5. Avoid mixing refactors with functional changes

---

## What to Avoid

* Introducing anonymous or partially verified flows
* Storing sensitive data outside Supabase Auth
* Client-side authorization logic
* Premature optimizations
* UI changes that obscure identity or context

---

## Database Changes

* Schema changes must be made via migrations
* RLS changes must be reviewed carefully
* Never bypass RLS for convenience

---

## Code Style

* TypeScript strictness is intentional
* Explicit is better than implicit
* Defensive rendering is preferred over assumptions

---

## Reporting Issues

When reporting a bug, include:

* Steps to reproduce
* Expected vs actual behavior
* Screenshots or logs (if applicable)

---

By contributing, you agree to uphold the trust and safety principles that define Vouchins.
