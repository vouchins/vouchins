# Security Overview

Security is a core product feature of Vouchins, not an afterthought.

This document outlines the high-level security posture without exposing sensitive implementation details.

---

## Threat Model

Vouchins is designed to mitigate:

* impersonation
* spam and broker abuse
* privilege escalation
* data leakage across organizations

---

## Key Controls

### Identity Verification

* Corporate email verification required
* Personal email domains blocked
* Verification required before access

### Authentication

* Managed exclusively by Supabase Auth
* Secure password hashing
* Automatic session rotation

### Authorization

* Enforced at database level via RLS
* Ownership-based access controls
* Admin privileges explicitly gated

### Data Isolation

* Company-scoped content visibility
* No cross-tenant data access
* No anonymous interactions

---

## Operational Safety

* Privileged operations are server-only
* No secrets committed to the repository
* Environment-specific credentials required

---

## Disclosure

This repository intentionally omits:

* production infrastructure details
* incident response procedures
* monitoring and alerting specifics

These are maintained privately.

---

## Reporting Vulnerabilities

Security issues should be reported privately and responsibly.

Please do not open public issues for potential vulnerabilities.
