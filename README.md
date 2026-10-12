# 3D AI Operations Center

A cyberpunk 3D operations center for Magnium Technology Solutions, built with React, Vite, Three.js, React Three Fiber, Drei, and postprocessing.

The frontend visualizes real Worker, Task, and Activity records from the local Express/SQLite backend. Each backend worker becomes a selectable 3D bot. **There is no AI execution or external service integration.** Task execution and state transitions are manual; only movement and visual effects are animated.

## Local development

Use a supported Node.js 22 or 24 release, at least Node 22.12, and npm. The backend uses `better-sqlite3`; its native dependency may require platform build tools when a matching prebuilt binary is unavailable.

```sh
git clone https://github.com/WallfacerX/3d-ai-operations-center.git
cd 3d-ai-operations-center
npm install
```

Start the backend in one terminal:

```sh
npm run server
```

Start the frontend in another:

```sh
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. The backend listens only on `127.0.0.1:3001`. Vite forwards `/api` to it, so the browser does not need cross-origin API access. Both processes run in their terminals; stop them with Ctrl+C. If port 3001 is occupied, stop the conflicting process first.

No `.env`, API key, cloud service, or authentication setup is required. Do not run either process as root or expose this unauthenticated prototype to the LAN or public internet.

Test backend health:

```sh
curl http://127.0.0.1:3001/api/health
# {"status":"ok"}

# With both servers running, verify the Vite proxy:
curl http://localhost:5173/api/health
```

Use `curl.exe` instead of `curl` if your PowerShell installation aliases it to another command.

## Backend-driven 3D workers

The frontend requests `/api/workers`, `/api/tasks`, and `/api/activity` together on load, then three seconds after each batch finishes. Requests time out after five seconds. A single scheduler avoids overlapping polls, pauses while the tab is hidden, and cancels requests on unmount. No requests run in the animation loop.

The HUD shows connection status and the last successful refresh. On a failed or malformed response, the scene keeps the last valid data, marks it stale, and freezes movement/work animation until reconnection. With no successful response, rooms still render and the workforce stays empty. There is no fallback to invented workers or tasks.

Backend worker IDs, names, roles, departments, statuses, and `currentTaskId` are authoritative. The frontend resolves the current task by ID and displays its stored title, description, requirements, type, status, and progress. Task progress is **not** travel progress. The activity panel displays the newest ten backend records.

Existing department definitions remain the source of scene positions and colors. Task types matching department IDs map directly to rooms; `engineering` maps to Development. Other task types use the worker's department. Unmapped departments use a neutral Management staging position and a warning. Missing or inconsistent task links are shown explicitly.

| Worker state | Visual behavior |
| --- | --- |
| `idle` | Waits at Management staging; affiliation remains its backend department |
| `assigned` | Holds position and shows the task assignment |
| `traveling` | Follows the existing network links toward the task department |
| `working` | Settles at the destination with the existing rotating work ring |
| `awaiting_review` | Amber ring, no work rotation, and “Human review needed” |
| `error` | Holds position with a restrained red state |

Travel is presentation-only: arrival never changes backend state or task progress. A worker can visually arrive while the API still reports `traveling`. Reloading during travel starts its visual trip at staging because location is not persisted. Repeated polls do not restart a trip. Idle transitions return to staging. Department counts describe affiliation and reported status, not authoritative physical location.

## Manual research demonstration

With both servers running, open the frontend and select Research Bot 01 from the scene or workforce list. In a third terminal:

```sh
npm run demo -- setup
npm run demo -- idle
npm run demo -- assigned
npm run demo -- traveling
npm run demo -- working
npm run demo -- review
```

Run these commands **one at a time**, allowing about three seconds for each poll; after `traveling`, allow another 3–4 seconds to observe the trip from Management to Research. `working` sets illustrative task progress to 40%; `review` sets it to 100% and `awaiting_review`. These values are explicit manual demonstration inputs, not AI output or an approval.

`setup` discovers the seeded project/worker and creates or reuses one named research task. Repeating it does not duplicate tasks or advance worker state. `idle` clears the worker's current-task link and resets the demo task to draft/zero progress; it does not erase activity history or the original start timestamp. Run it to repeat the demonstration.

The script only calls fixed endpoints on `127.0.0.1:3001`. It refuses to replace unrelated assignments. Since task and worker PATCH requests are separate transactions, a failed command may leave earlier successful changes saved; inspect the HUD/API before retrying. No background executor runs.

To check offline recovery, stop the backend with Ctrl+C. The scene should show Backend Offline with stale data; restart `npm run server` and allow the next poll to reconnect.

## Database

The backend automatically creates `data/magnium.db` relative to this repository, regardless of the terminal's working directory. The database, SQLite WAL/SHM sidecars, and local `.env` files are ignored by Git. Schema and initialization code are committed.

Schema version 1 creates four tables:

| Table | Fields |
| --- | --- |
| `projects` | `id`, `name`, `client`, `description`, `status`, `createdAt`, `updatedAt` |
| `tasks` | `id`, `projectId`, `title`, `description`, `requirements`, `type`, `assignedWorkerId`, `status`, `progress`, `createdAt`, `startedAt`, `completedAt` |
| `workers` | `id`, `name`, `role`, `department`, `status`, `currentTaskId`, `createdAt`, `updatedAt` |
| `activity` | `id`, `projectId`, `taskId`, `workerId`, `event`, `message`, `timestamp` |

IDs are positive integers generated by SQLite; timestamps are UTC ISO strings. Relationships use foreign keys. Optional assignment, current-task, activity references, and task lifecycle timestamps may be null. WAL mode and a three-second busy timeout support small local workloads.

First initialization seeds one **Internal Prototype** project for Magnium Technology Solutions and one **Research Bot 01**, with role **Technical Research**, department **research**, and status **idle**. Restarting preserves data and never overwrites the seed records. There are no fake tasks. Schema setup and seed insertion run in one transaction; future migrations can extend the SQLite `user_version` mechanism.

## API

All responses are JSON. Collection endpoints return arrays; item endpoints return objects. POST returns `201`, reads and PATCH return `200`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API and database availability |
| GET, POST | `/api/projects` | List or create projects |
| GET | `/api/projects/:id` | Read a project |
| GET, POST | `/api/tasks` | List or create tasks |
| GET, PATCH | `/api/tasks/:id` | Read or manually update a task |
| GET | `/api/workers` | List workers |
| GET, PATCH | `/api/workers/:id` | Read or manually update a worker |
| GET | `/api/activity` | Read the latest 100 events, newest first |

Projects require nonblank `name` and `client`. Optional `description` defaults to empty text; `status` defaults to `active` and is a nonblank string.

Tasks require `projectId`, `title`, and `type`. Optional `description` and `requirements` are plain text; `assignedWorkerId` defaults to null, `status` to `draft`, and `progress` to zero. Project and assigned-worker references must exist. Task type is a nonblank string, such as `research`.

```sh
curl -X POST http://127.0.0.1:3001/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Architecture review","client":"Magnium Technology Solutions"}'

# Replace projectId with the ID returned above; worker 1 exists in a fresh database.
curl -X POST http://127.0.0.1:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"projectId":2,"title":"Review local architecture","type":"research","requirements":"Document tradeoffs","assignedWorkerId":1,"status":"queued"}'

curl http://127.0.0.1:3001/api/tasks
curl http://127.0.0.1:3001/api/workers
curl http://127.0.0.1:3001/api/activity
```

Task PATCH accepts only `status`, `progress`, and `assignedWorkerId`. Worker PATCH accepts only `status` and `currentTaskId`. Use IDs returned by the API:

```sh
curl -X PATCH http://127.0.0.1:3001/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"working","progress":25}'

curl -X PATCH http://127.0.0.1:3001/api/workers/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"working","currentTaskId":1}'
```

Supported task states:

```text
draft, queued, assigned, traveling, working, awaiting_review, approved,
completed, revision_requested, failed, cancelled
```

Supported worker states:

```text
idle, assigned, traveling, working, awaiting_review, error
```

These are stored states, not an automated workflow. Task state does not automatically change worker state, advance progress, or perform work. `startedAt` is set on first entry into `working`; `completedAt` is set upon entry into `completed` and cleared when leaving it. Direct creation in either state follows the same rule. Creating a completed task does not invent a start time.

A worker's current task must be assigned to that worker. Clear `currentTaskId` with null before reassigning/unassigning an active task. Task assignment, worker state, and worker current-task changes remain explicit API operations. Repeating unchanged values produces no duplicate activity.

Writes and their activity records commit together. Invalid input returns `400`; missing item IDs return `404`; assignment conflicts return `409`; nonlocal hosts/origins return `403`; bodies over 64 KB return `413`. Unexpected errors return `500` with a generic message, never a stack trace. Errors use `{ "error": "message" }`.

Validation rejects unknown fields, client-supplied IDs/timestamps, invalid references, invalid statuses, and progress outside 0–100. Short strings are limited to 256 characters; descriptions and requirements to 10,000. POST/PATCH requests must use JSON object bodies and `Content-Type: application/json`.

## Architecture and checks

- `src/api/`: validated API reads and polling lifecycle.
- `src/hooks/useOperations.js`: React subscription to the polling snapshot.
- `src/data/workerScene.js`: backend-to-scene adapter; `src/scene/workerMotion.js`: reusable routing and visual motion.
- `src/scene/` and `src/ui/`: existing facility rendering and backend-driven inspector. The previous simulation engine remains tested but is disconnected from the active application.
- `scripts/demo.js`: fixed-purpose manual demonstration commands.
- `server/index.js`: loopback listener and shutdown; `server/app.js`: Express setup and error handling.
- `server/api/`: small route modules with prepared SQL and transactional writes.
- `server/db/`: SQLite initialization, schema, seeds, and activity insertion.
- `server/validation.js`: input validation and supported states.
- `server/backend.test.js`: isolated HTTP/database integration tests.

```sh
npm test
npm run lint
npm run build
npm run preview
```

Tests create temporary databases and temporary loopback HTTP servers; they do not modify `data/magnium.db`. They cover seeds, persistence, CRUD reads/creates, manual state updates, activity, invalid input, assignment conflicts, rollback, and request boundaries, alongside API-client, polling, mapping, motion, and existing simulation tests.

`npm run build` builds the frontend; it does not bundle the backend. `npm run preview` previews static frontend output only; the documented API proxy is a development-server feature. The existing Three.js production bundle can trigger Vite's size warning.

## Limitations and next milestone

This is a local-only prototype with no authentication, authorization, worker execution, approval records, or external integrations. The API contains no shell/command execution or filesystem-browsing endpoints, makes no outbound service requests, and includes no analytics or credentials. Local processes with access to the API can modify records; loopback binding is not authentication.

Project/task lists are unpaginated; activity reads are limited to 100 while history remains stored. Synchronous SQLite operations are appropriate for this small local foundation, not high-concurrency deployment. Visual positions are local to each browser and are not synchronized or persisted. Changes between polling snapshots can be missed; there is no event streaming. Task and worker state remain separately editable, so the HUD displays both rather than silently resolving inconsistent statuses.

The next milestone can introduce structured task results and explicit human review/approval records. It is not implemented here. Contributions should stay small, include relevant tests, and preserve the existing frontend.
