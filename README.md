# CityWatch AI Traffic Management Portal

An enhancement of the original React + Vite + Express City Police portal. The existing visual identity, login page, role dashboards, and overview are retained. Added operational screens use a persistent local JSON store and private evidence directory for a single-instance demonstration.

## Requirements
- Node.js 20+ (Node 22 recommended)
- npm

## Windows: install and run
1. Extract the ZIP to a writable folder.
2. Install Node.js LTS from https://nodejs.org/.
3. Open PowerShell in the project folder.
4. Run `npm install`.
5. Copy `.env.example` to `.env` and set a unique long `SESSION_SECRET` for any non-local use. Do not commit `.env`.
6. Run `npm run dev` and open http://localhost:5173.
7. Check backend health at http://localhost:4000/api/health.

Stop with Ctrl+C in the terminal. If port 4000 or 5173 is occupied, stop the other process or change the relevant port/proxy configuration.

## Development demo accounts
These fictional credentials are currently seeded by the development server code. Use only locally; do not expose them publicly.

| Role | User ID | Password |
|---|---|---|
| Administrator | `admin.demo` | `AdminDemo@123` |
| Traffic Police | `traffic.demo` | `TrafficDemo@123` |
| Control Room Operator | `control.demo` | `ControlDemo@123` |

The current sign-in account set remains the original three roles. The access-request endpoint records and reviews requests but approval does not provision a login account yet. Remove demo accounts and replace in-memory user/session management with a database-backed identity workflow before public deployment.

## Features implemented
- Searchable camera network with camera details and status; administrator create/update/delete actions.
- Camera deletion is blocked while a violation references it; use Offline/Maintenance instead.
- Persistent violation records, manual case creation, editing, status filters through search, evidence upload (PNG/JPEG/WebP, max 5 MB), and reviewer decision history.
- Rejection requires a reason. Administrator and Authority Reviewer can approve/reject/return cases for review. Approved cases are locked against non-admin edits.
- Private evidence route requires authentication; uploaded files are stored in `uploads/evidence`, metadata in the JSON store.
- Clearly labelled simulated rule-based AI analysis. No trained model, live video, or actual computer vision is connected.
- Configurable demo confidence threshold and categories; administrative audit events and access request review endpoints/screens.
- Express validation, bcrypt password hashes for demo users, rate-limited login, HttpOnly session cookie, CSRF check for logout, role checks on operational APIs.

## Data and limitations
- `data/citywatch-store.json` is initialized from sample records on first run and persists records across local restarts. It is a **single-instance JSON persistence adapter, not a relational database**; it is not suitable for concurrent multi-instance production deployments. Replace it with PostgreSQL/managed database and migrations before production.
- Evidence files are stored separately in `uploads/evidence`. Back up both `data/` and `uploads/`. Evidence files are served only through an authenticated route.
- Access request approval is recorded but does not create a password/login account. A full account provisioning workflow remains to be completed.
- No actual live CCTV, trained AI inference, real fine/challan, notices, payments, or citizen records are integrated. All cases are demo data and all review actions are demonstrative.
- Sessions and users remain in memory; sessions are lost when the server restarts. Configure a persistent session store and database-backed users before production.

## Build and production preview
`npm run build` creates the Vite frontend in `dist`. Set `NODE_ENV=production`, a strong random `SESSION_SECRET`, and a correct `CLIENT_ORIGIN`, then run `npm start`. The Express server serves the build and API from one origin in production.

## Docker
Copy `.env.example` to `.env`, generate a secret, then run:

```powershell
# Generate a secret with Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Put the generated value in .env as SESSION_SECRET=...
docker compose up --build
```

Open http://localhost:4000. Stop with `docker compose down`; named volumes preserve `data/` and uploaded evidence. `docker compose down -v` deletes persistent volumes, so do not use it if you need the records.

## API overview
- `GET /api/cameras`, `POST /api/cameras`, `PUT /api/cameras/:id`, `DELETE /api/cameras/:id`
- `GET /api/violations`, `POST /api/violations`, `PUT /api/violations/:id`, `POST /api/violations/:id/review`, `POST /api/violations/:id/evidence`
- `GET /api/ai/analyze`, `GET/PUT /api/rules`, `GET /api/audit`
- `POST /api/access-requests`, `GET /api/access-requests`, `POST /api/access-requests/:id/decision`
- `GET /api/health`

## Free-tier deployment guidance
A static-only host cannot run Express. Use a Node-capable web service plus a managed PostgreSQL database and persistent object storage for evidence. Free tiers may sleep, impose bandwidth/storage/database limits, or change terms; ephemeral filesystem storage can erase uploaded evidence on redeploy. Do not deploy the current JSON adapter or demo credentials as a public operational system. For production, configure HTTPS, exact CORS origin, secure cookie/session store, persistent database migrations, object storage access controls, backups, monitoring, and security review. Test login/logout, unauthorized API calls, CRUD, evidence access from a signed-in session, rejection reasons, audit records, restart persistence, and mobile layout after deployment.
