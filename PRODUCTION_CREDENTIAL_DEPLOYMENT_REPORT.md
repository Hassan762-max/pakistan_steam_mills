# PRODUCTION CREDENTIAL DEPLOYMENT REPORT

**Product:** Pakistan Steel Mills Management System  
**Audit date:** 2026-09-19  
**Scope:** Environment variables, secrets, Git exposure, frontend/backend leakage, Docker, deployment readiness  
**Method:** Static inspection of repository configuration, source, docs, and Git tracking status  
**Constraint:** No credential values are reproduced in this report.

---

## Executive verdict

**Not safe to deploy to production as currently configured.**

Several **production blockers** must be fixed first (weak secret fallbacks, demo password material in client UI/docs/seed, recovery tokens returned to the browser, unignored credential-adjacent files, no production env separation).

Git currently tracks only the initial Next.js scaffold. Most application code (including risky demo credentials) is still **untracked**. That means history is clean *today*, but a careless first commit of the working tree would introduce demo passwords and leave `credentials.txt` / SQLite DB eligible for commit.

---

## Credential Inventory

| Variable | Secret? | Client/Server | Environment | Risk | Status |
|---|---|---|---|---|---|
| `DATABASE_URL` | Yes (connection string) | Server-only | Dev local `.env` (SQLite file URL in example) | High if leaked; binds DB access | Present locally; **not** in Git index |
| `AUTH_SECRET` | Yes | Server-only | Dev local `.env` | Critical — session/token integrity | Present locally; **not** in Git index; **unsafe code fallback** if unset |
| `APP_URL` | No (config) | Server-intended | Dev local `.env` | Low | Present in `.env.example` as localhost placeholder |
| `SESSION_MAX_AGE_HOURS` | No | Server-only | Dev / example | Low | Optional; defaults in code |
| `PASSWORD_MIN_LENGTH` | No | Server-only | Dev / example | Low | Optional; defaults in code |
| `MAX_FAILED_LOGINS` | No | Server-only | Dev / example | Low | Optional; defaults in code |
| `LOCKOUT_MINUTES` | No | Server-only | Dev / example | Low | Optional; defaults in code |
| `NODE_ENV` | No | Server/runtime | Platform-provided | Low | Used for cookie `secure` + Prisma logging |
| Seeded demo account password | Yes (demo shared secret) | Appears in **client UI**, seed script, README draft | Development demo | Critical if reused in prod | Hardcoded demo string in source/docs (not committed yet) |
| Email verification / password-reset tokens | Yes (bearer capability) | Returned to **browser** in demo flows | Development | High | Returned by server actions to client |

**No `NEXT_PUBLIC_*` variables found** in application source — good for secret isolation (Next.js would otherwise embed those in the client bundle).

---

## Findings

| ID | Issue | Severity | Evidence | Recommendation | Status |
|---|---|---|---|---|---|
| F01 | `AUTH_SECRET` falls back to hardcoded weak defaults when unset | **Critical / Blocker** | `src/server/auth/crypto.ts` uses `process.env.AUTH_SECRET ?? "dev-secret"`; `src/server/audit/service.ts` uses `process.env.AUTH_SECRET ?? "dev"` | Fail startup in production if `AUTH_SECRET` missing or too short; never ship static fallbacks | Open |
| F02 | Demo password embedded in client login UI | **Critical / Blocker** | `src/components/auth/login-form.tsx` displays and autofills a shared demo password | Remove demo fill UI for production builds (`NODE_ENV===production` or feature flag); never ship shared passwords in client bundles | Open |
| F03 | Demo password documented for all seed users | **High / Blocker for prod** | `README.md` (working tree), `prisma/seed.ts` comment + `console.log` | Keep seed passwords out of production deploys; use unique secrets; strip from README for prod docs | Open |
| F04 | Signup returns raw `verificationToken` to the client | **High / Blocker** | `signupAction` / `signup()` return token; signup form forwards it in URL | Send token only via email/SMS in production; never return raw token in API/action payload | Open |
| F05 | Forgot-password returns reset `token` to the client | **High / Blocker** | `forgotPasswordAction` returns token; forgot-password form renders demo reset link | Same as F04 — email-only delivery; do not echo token to browser | Open |
| F06 | `credentials.txt` exists and is **not** Git-ignored | **High** | File present on disk; `git check-ignore` does not match it; status shows untracked | Add to `.gitignore`; delete from workspace if unused; never commit | Open |
| F07 | SQLite database file `prisma/dev.db` is **not** Git-ignored | **High** | Untracked DB file on disk; not matched by `.gitignore` | Ignore `*.db`, `prisma/*.db`, `*.db-journal`; never commit local DB | Open |
| F08 | `.gitignore` uses `.env*` which also ignores `.env.example` | **Medium** | `git check-ignore -v .env.example` matches `.env*` | Change to ignore `.env` / `.env.local` / `.env.*.local` and allow `!.env.example` | Open |
| F09 | No production vs staging vs development env separation | **High** | Single local `.env` pattern; no `.env.production.example`, no hosting config | Define separate secrets per environment in host secret store (Vercel/Azure/etc.) | Open |
| F10 | Default seeded super-admin identity is public knowledge in UI/docs | **High** if deployed with seed | Login placeholder + README table of demo emails | Do not seed production; create admin via secure bootstrap; force password change | Open |
| F11 | No Docker / no `.dockerignore` | **Info** | No Dockerfile / compose / dockerignore found | N/A until Docker is introduced; add `.dockerignore` excluding `.env*` and `*.db` if added | N/A |
| F12 | Application mostly untracked in Git | **Medium (process risk)** | `git ls-files` shows only scaffold; large app tree untracked | Before first commit: fix ignore rules (F06–F08), scrub demo secrets, then commit deliberately | Open |
| F13 | Hardcoded default header user email string | **Low** | `app-header.tsx` default prop email | Remove demo default; require real session user props only | Open |
| F14 | Seed script logs default password to console | **Medium** | `prisma/seed.ts` `console.log` of default password | Gate behind `NODE_ENV!=='production'`; never run seed against prod | Open |
| F15 | No startup validation that production secrets exist | **High** | No boot-time assert for `AUTH_SECRET` / `DATABASE_URL` | Add `src/server/env.ts` with Zod schema; throw on invalid prod config | Open |

---

## CHECK RESULTS (evidence-based)

### CHECK 1 — Git

| Item | Result | Evidence |
|---|---|---|
| `.env` ignored | **PASS** | `.gitignore` contains `.env*`; `git check-ignore` matches `.env` |
| Production `.env` not tracked | **PASS** | `git ls-files` does not list any `.env` file |
| `.env.example` placeholders only | **PASS (content)** / **WARN (ignore)** | Example uses placeholder wording for `AUTH_SECRET` and localhost `APP_URL`; however `.env.example` is also ignored by `.env*` |
| No credentials in tracked source | **PASS (current index)** | Tracked files are scaffold-only; demo password not in `HEAD` README |
| No credentials in documentation (working tree) | **FAIL** | Working-tree `README.md` contains shared demo password |
| No credentials in Git history (accessible) | **PASS (for tracked history)** | Only initial Create Next App commit; no `.env` history; demo password not in committed history yet |
| Credential files excluded appropriately | **FAIL** | `credentials.txt` and `prisma/dev.db` are **not** ignored |

**Note:** If demo passwords / local `.env` are committed later without fixes, treat them as **compromised and rotate**.

### CHECK 2 — Frontend exposure

| Variable / secret material | Classification | Reaches browser? |
|---|---|---|
| `DATABASE_URL` | SENSITIVE / SERVER-ONLY | No `NEXT_PUBLIC_` usage found |
| `AUTH_SECRET` | SENSITIVE / SERVER-ONLY | Server-only reads; **but** unsafe fallback string exists in server source (not a browser leak by itself) |
| `APP_URL`, session/policy knobs | SERVER-ONLY / non-secret config | Not prefixed `NEXT_PUBLIC_` |
| Demo account password | SENSITIVE | **Yes** — client component login form |
| Verification / reset tokens | SENSITIVE | **Yes** — returned via server actions to client UI |

**Blockers:** F02, F04, F05.

### CHECK 3 — Backend

| Check | Result |
|---|---|
| Secrets loaded from runtime env | **Partial** — reads `process.env.*` but falls back to hardcoded strings |
| Hardcoded fallbacks | **FAIL** — F01 |
| Default passwords | **FAIL** — seed + login UI demo password |
| Default API keys | **PASS** — none found |
| Secrets in config files | **PASS** for tracked config; local `.env` present but ignored |
| Secrets logged | **FAIL** — seed logs default password; error boundary logs error objects (risk if errors ever include secrets) |
| Secrets in API responses | **FAIL** — verification/reset tokens returned to client; `passwordHash` stripped in user services (good) |

Health route returns only `{ status: "ok" }` — **PASS** for that endpoint.

### CHECK 4 — Docker

| Check | Result |
|---|---|
| Docker used | **No** — no Dockerfile / compose / `.dockerignore` |
| Verdict | **N/A** — no Docker image to bake secrets into today |

When Docker is added: exclude `.env*`, `credentials.txt`, `*.db`, `.git` via `.dockerignore`; inject secrets at runtime only.

### CHECK 5 — Deployment expectations

How production variables should be supplied: **hosting provider secret / environment configuration** (e.g. Vercel Project Env, Azure App Settings, AWS SSM/Secrets Manager, Kubernetes Secrets). Do **not** commit or upload `.env` to public storage.

| Variable | Required? | Secret? | Server/Client | Production Source | Validation |
|---|---|---|---|---|---|
| `DATABASE_URL` | **Yes** | Yes | Server | Managed Postgres connection string from provider secret store | Must be Postgres URL (not `file:` SQLite) in prod; TLS preferred |
| `AUTH_SECRET` | **Yes** | Yes | Server | Cryptographically random secret (≥32 bytes) from provider secret store | Refuse boot if missing/short; no code fallback |
| `APP_URL` | Yes | No | Server | Public canonical HTTPS origin | Must match production domain |
| `SESSION_MAX_AGE_HOURS` | No | No | Server | Optional platform env | Positive number |
| `PASSWORD_MIN_LENGTH` | No | No | Server | Optional | ≥ 10 recommended |
| `MAX_FAILED_LOGINS` | No | No | Server | Optional | Positive integer |
| `LOCKOUT_MINUTES` | No | No | Server | Optional | Positive integer |
| `NODE_ENV` | Yes (platform) | No | Server | Set by host to `production` | Ensures Secure cookies |

Email provider credentials (not present today) will be required once F04/F05 are fixed.

### CHECK 6 — Environment separation

| Expectation | Result |
|---|---|
| Dev / staging / prod credentials separate | **FAIL** — not implemented |
| Prod credentials not used locally unnecessarily | **Unknown / not enforced** |
| Dev credentials cannot access prod resources | **Not enforced** — depends entirely on operator discipline |

### CHECK 7 — Credential permissions

| Credential | Observed permission posture | Recommendation |
|---|---|---|
| `DATABASE_URL` (planned Postgres) | App uses full Prisma ORM access (effectively broad DB rights) | Use least-privilege DB role (DML on app schemas only; no superuser); separate migration role |
| `AUTH_SECRET` | Application-wide signing/integrity key | Single-purpose secret; rotate with session invalidation plan; restrict who can read host secrets |
| Seeded `super_admin` | Full permission catalog | Do not seed into production; bootstrap one admin then remove bootstrap path |
| No third-party API keys found | N/A | When added, scope keys to minimum APIs |

### CHECK 8 — Credential rotation

| Credential | Rotatable? | Longevity | Notes |
|---|---|---|---|
| `AUTH_SECRET` | Yes | Long-lived unless rotated | Rotation invalidates integrity expectations for old audit hashes / sessions — plan dual-key or force re-login |
| `DATABASE_URL` password | Yes | Often long-lived | Rotate via provider; update host env; rolling restart |
| User passwords | Yes | Per-user | App supports change/reset flows |
| Demo shared password | Must not exist in prod | N/A | Remove before prod |
| Verification/reset tokens | Short-lived by design | Hours | Already time-bounded in code |

**Before production:** generate a new `AUTH_SECRET`, new DB credentials, no seed demo users/passwords.

App can pick up new env vars on process restart (typical Node/Next host) — **no special hot-reload secret rotation** implemented.

### CHECK 9 — Logging

| Channel | Finding |
|---|---|
| Seed console output | Logs default demo password — **risk** |
| `src/app/(app)/error.tsx` | `console.error(error)` — ensure errors never include secrets/tokens |
| Auth actions | Do not appear to log passwords (good) |
| CI/CD logs | No CI workflows found — **N/A** |
| API health | No secrets — **PASS** |

### CHECK 10 — Production readiness artifacts

This document: `PRODUCTION_CREDENTIAL_DEPLOYMENT_REPORT.md`

---

## Deployment Requirements (must configure before production)

1. Host-managed **PostgreSQL** `DATABASE_URL` (not SQLite `file:`).
2. Host-managed high-entropy **`AUTH_SECRET`** (no code fallback).
3. Set **`APP_URL`** to production HTTPS origin.
4. Set **`NODE_ENV=production`**.
5. **Do not run** `db:seed` against production; provision admin securely.
6. Configure real **email delivery** for verify/reset; stop returning tokens to clients.
7. Remove demo password UI and documentation from production builds.
8. Ensure `.gitignore` excludes `credentials.txt`, `*.db`, and keeps local `.env` out of Git; allow a placeholder-only `.env.example`.
9. Store secrets only in the hosting provider’s secret mechanism.
10. Add boot-time env validation that fails closed in production.

---

## Production Blockers

1. **F01** — Weak `AUTH_SECRET` fallbacks (`dev-secret` / `dev`).
2. **F02 / F03 / F10 / F14** — Shared demo password in client UI, seed, and docs.
3. **F04 / F05** — Auth capability tokens returned to the browser.
4. **F06 / F07** — `credentials.txt` and `prisma/dev.db` not ignored (commit risk).
5. **F09 / F15** — No env separation / no production env validation.
6. Process risk: large secret-bearing working tree not yet carefully prepared for first commit.

Until these are resolved, **do not deploy**.

---

## Final Checklist

| Item | Result |
|---|---|
| `.env` excluded from Git | **PASS** (verified ignored; not in index) |
| No secrets in source | **FAIL** (demo password + secret fallbacks in source) |
| No secrets in frontend | **FAIL** (demo password + token echo to client) |
| No secrets in Docker image | **N/A** (no Docker) |
| No secrets in logs | **FAIL** (seed password log; generic error logging risk) |
| Production secrets externally configured | **FAIL** (not implemented / not validated) |
| Environment separation implemented | **FAIL** |
| Least privilege reviewed | **PARTIAL** (recommendations only; no prod DB role evidence) |
| Credential rotation procedure documented | **PASS** (this report) |
| Production configuration validated | **FAIL** |

---

## Recommended immediate remediation order

1. Update `.gitignore` for `credentials.txt`, `*.db`, and `!.env.example`.
2. Remove hard `AUTH_SECRET` fallbacks; add fail-fast env validation.
3. Strip demo password from login UI / seed console / production docs.
4. Stop returning verification & reset tokens to the client; integrate email.
5. Confirm `credentials.txt` is not needed; delete or relocate outside the repo.
6. Only then commit application source and deploy with host-managed secrets.

---

*End of report. No credential values were included by design.*
