# Pakistan Steel Mills Management System

Enterprise management platform for **Pakistan Steel Mills** — production, inventory, HR, procurement, maintenance, quality, safety, finance, workflows, and administration.

## Stack

| Layer | Choice |
|---|---|
| App framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + Radix primitives + custom design system |
| Data | Prisma 6 + SQLite (dev) — PostgreSQL-ready schema |
| Auth | Custom secure session auth (httpOnly cookies, hashed tokens) |
| Authorization | Permission-based RBAC (`module.resource.action`) |
| Validation | Zod |
| Tables / data | TanStack Table + TanStack Query |
| Charts | Recharts |

## Quick start

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

Password for all seeded users: `Password@123`

| Account | Role |
|---|---|
| `admin@psm.gov.pk` / `admin` | Super Administrator |
| `plant.manager@psm.gov.pk` | Plant Manager |
| `hr.manager@psm.gov.pk` | HR Manager |
| `finance.manager@psm.gov.pk` | Finance Manager |
| `procurement@psm.gov.pk` | Procurement Manager |
| `production@psm.gov.pk` | Production Manager |
| `employee@psm.gov.pk` | Employee |
| `auditor@psm.gov.pk` | Auditor |

## Architecture

```
src/
  app/(auth)/          Auth pages (login, signup, reset, verify…)
  app/(app)/           Protected enterprise modules
  components/ui/       Design system
  components/layout/   Shell, sidebar, command palette
  server/auth/         Sessions, passwords, lockout
  server/authorization/ Permission resolution
  server/services/     Domain business logic
  server/actions/      Server actions (mutations)
  server/audit/        Tamper-resistant audit logging
  lib/permissions.ts   Permission catalog + system roles
prisma/                Schema + seed
```

Authorization is enforced in **server services** (never UI-only). Navigation is filtered by effective permissions.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset DB + seed |

## Security highlights

- HttpOnly session cookies, hashed session tokens
- Password strength policy + bcrypt hashing
- Failed login tracking and temporary account lockout
- Email verification / password reset token flow
- Logout / logout-all-devices via session revocation
- Integrity-hashed audit trail
- Permission checks on every sensitive service method
- Mass-assignment avoided via Zod-validated inputs

## Production notes

- Set a strong `AUTH_SECRET` in `.env`
- Switch `DATABASE_URL` to PostgreSQL for production deployments
- Configure real email delivery for verification / reset tokens (demo currently returns tokens in-app for local testing)
- Place file uploads behind authenticated, scanned storage with access control
