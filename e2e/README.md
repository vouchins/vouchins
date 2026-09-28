# Vouchins On - Demand End - to - End (E2E) Test Suite

This directory contains the automated end - to - end test suite designed to validate the critical user journeys of the Vouchins application against active backend APIs and database constraints.

## Quick Start

Make sure your local Next.js dev server is running:

```bash
npm run dev
```

Run the complete E2E test suite in a separate terminal:

```bash
npm run test:e2e
```

## Architectural Overview

The test suite runs against the live local application server (`http://127.0.0.1:3000`) and the connected Supabase instance configured in `.env.local`.

### Workflows Tested

1. **Flow 1: Signup & Login (`e2e/flows/01-signup-login.ts`)**
   - Tests `/api/auth/signup` with unique credentials.
   - Asserts Supabase profile provisioning (`is_verified: false`, `onboarded: false`).
   - Authenticates via `/api/auth/login` and captures session cookies.

2. **Flow 2: Unverified User Security Gating (`e2e/flows/02-unverified-gates.ts`)**
   - Asserts `403 Forbidden` response when an unverified user tries to access `/api/posts/saved`.
   - Asserts `403 Forbidden` response when an unverified user tries to apply for jobs via `/api/jobs/apply`.

3. **Flow 3: OTP Verification, Rate Limiting & Account Upgrade (`e2e/flows/03-otp-verification.ts`)**
   - Dispatches a real email via AWS SES with `/api/auth/send-otp`.
   - Tests progressive attempt counter decrements (4, 3, 2, 1).
   - Tests 5th attempt lockout (`429`) and immediate OTP purge from the database.
   - Tests IP sliding-window rate limit throttling (`429 Too many verification attempts from this IP` with `Retry-After`).
   - Submits a valid code to upgrade the user account to `is_verified: true` with corporate domain association.

4. **Flow 4: Feed Pulse, Posts & View Impressions (`e2e/flows/04-feed-and-posts.ts`)**
   - Fetches feed metrics via `/api/feed/pulse`.
   - Fetches paginated feed posts via `/api/posts/get-posts`.
   - Creates a post adhering to category constraints (`referrals` / `offering_referral`).
   - Submits view impression via `/api/posts/views` and validates row in `post_views`.

5. **Flow 5: Saved Posts (Bookmarks) Workflow (`e2e/flows/05-saved-posts.ts`)**
   - Bookmarks post in `saved_posts`.
   - Fetches `/api/posts/saved` (confirms verified user now receives `200 OK` and post is listed).
   - Unsaves post and verifies removal.

6. **Flow 6: Jobs Discovery, Impressions & Verified Application (`e2e/flows/06-jobs.ts`)**
   - Fetches active job listings via `/api/jobs`.
   - Logs job impression via `/api/jobs/view`.
   - Applies to job via `/api/jobs/apply` (succeeds with `200 OK` now that user is verified).
   - Validates duplicate application guard returns `409 Conflict`.

7. **Flow 7: Direct Messaging & Read Receipts (`e2e/flows/07-messaging.ts`)**
   - Sends a message between test user and active recipient.
   - Queries conversation history.
   - Updates message read receipt and verifies state persistence.

8. **Flow 8: Storage Buckets & File Uploads (`e2e/flows/08-file-uploads.ts`)**
   - Tests file upload and public asset resolution for `post-images` and `avatars`.
   - Tests private authenticated uploads and signed URL creation for `resumes` and `verification-docs`.
   - Cleans up all test binary assets upon completion.

### Teardown & Isolation Guarantee

The suite executes inside a `try ... finally` block managed by `e2e/helpers/cleanup.ts`. Regardless of whether tests pass or fail:
- All test user records, applications, impressions, bookmarks, posts, messages, and OTP records are purged from the database.
- Any temporarily aliased admin accounts are restored.
- In - memory IP rate limit windows are flushed.
