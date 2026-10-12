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

## Operator Console

**Task orchestration is functional. Actual AI task execution is not implemented yet.**

The right-hand HUD has Operations and Inspector tabs. The 3D facility remains visible and navigable. No terminal demo command is needed for the normal workflow:

1. In Operations, expand **New project**. Enter name and client (required by the existing database), optional description, and status (defaults to `active`). Creation selects the new project; existing project rows also select it.
2. Enter a task title and type (`research` by default), plus your own description and requirements. **Create draft task** saves an unassigned task and opens its inspector.
3. Select an available worker and choose **Assign worker**. Availability requires idle status, no current task, and no other nonterminal assignment.
4. Choose **Start task** to begin travel. Watch the bot move, then choose **Begin work**. Arrival alone never changes persisted state or executes work.
5. Active Work lists nonterminal tasks with project, worker, status, and progress. Select an entry to inspect it. Progress is stored task progress, not a timer or distance measurement.
6. While working, expand **Enter manual result**, enter the result of manual work, and **Submit for review**. Summary is required; other narrative fields and source rows are optional. No result is generated for you.
7. Review Queue displays the saved summary/version. **Review** opens the existing Approve / Request revision / Reject controls.
8. A revision request retains the worker and displays the human note. **Resume task** returns to working with progress zero; submit a new result version when ready. History is preserved.

Cancellation uses an inline confirmation and releases only the task's linked worker. Pending review must be rejected through the review controls instead. Completed/cancelled tasks stay visible when selected; existing worker history remains accessible. Project/task editing, reassignment, reporting, and automatic execution are outside this milestone.

Forms retain drafts across Operations/Inspector tab switches and failed requests. Offline state disables writes while retaining the last valid data. Writes are never retried automatically; a timeout may mean a write committed before its response was lost, so inspect refreshed state before retrying.

## Backend-driven 3D workers

The frontend requests `/api/workers`, `/api/tasks`, `/api/activity`, and `/api/projects` together on load, then three seconds after each batch finishes. Requests time out after five seconds. A single scheduler avoids overlapping polls, pauses while the tab is hidden, and cancels requests on unmount. No requests run in the animation loop.

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

## Optional scripted research demonstration

With both servers running, open the frontend and select Research Bot 01 from the scene or workforce list. In a third terminal:

```sh
npm run demo -- setup
npm run demo -- idle
npm run demo -- assigned
npm run demo -- traveling
npm run demo -- working
npm run demo -- result
```

Run these commands **one at a time**, allowing about three seconds for each poll; after `traveling`, allow another 3–4 seconds to observe the trip from Management to Research. `working` enters manual work without inventing progress; `result` saves a clearly labeled sample structured result and atomically sets the task to 100% and `awaiting_review`, with its linked worker awaiting review. `review` remains an alias for `result`. These are manual demonstration inputs, not researched facts or AI output. Inspect the result in the HUD and choose Approve, Request revision (with a note), or Reject.

`setup` discovers the seeded project/worker and creates or reuses one named research task. Repeating it does not duplicate tasks or advance worker state. `idle` checks that the demo task is still draft and the worker is unassigned; it does not reset active work. Pending and terminal reviews cannot be reset this way. After approval or rejection, use `npm run demo -- new`, then repeat `assigned`, `traveling`, `working`, and `result`. After a revision request, run `working` and `result` to submit a new version. Existing results and decisions remain available in Decision history; repeated `result` while pending does not create duplicates.

The script only calls fixed endpoints on `127.0.0.1:3001`. It refuses to replace unrelated assignments. Assignment and work transitions use the same atomic operator endpoints as the UI. Each command commits separately; inspect the HUD/API before retrying a failed command. No background executor runs.

To check offline recovery, stop the backend with Ctrl+C. The scene should show Backend Offline with stale data; restart `npm run server` and allow the next poll to reconnect.

## Database

The backend automatically creates `data/magnium.db` relative to this repository, regardless of the terminal's working directory. The database, SQLite WAL/SHM sidecars, and local `.env` files are ignored by Git. Schema and initialization code are committed.

Schema version 2 contains six tables:

| Table | Fields |
| --- | --- |
| `projects` | `id`, `name`, `client`, `description`, `status`, `createdAt`, `updatedAt` |
| `tasks` | `id`, `projectId`, `title`, `description`, `requirements`, `type`, `assignedWorkerId`, `status`, `progress`, `createdAt`, `startedAt`, `completedAt` |
| `workers` | `id`, `name`, `role`, `department`, `status`, `currentTaskId`, `createdAt`, `updatedAt` |
| `activity` | `id`, `projectId`, `taskId`, `workerId`, `event`, `message`, `timestamp` |
| `task_results` | `id`, `taskId`, `version`, `summary`, `recommendation`, `reasoning`, `securityConsiderations`, `limitations`, `sources`, `rawOutput`, `createdAt`, `updatedAt` |
| `approvals` | `id`, `taskId`, `resultId`, `decision`, `notes`, `createdAt`, `updatedAt` |

IDs are positive integers generated by SQLite; timestamps are UTC ISO strings. Relationships use foreign keys. Optional assignment, current-task, activity references, and task lifecycle timestamps may be null. WAL mode and a three-second busy timeout support small local workloads.

First initialization seeds one **Internal Prototype** project for Magnium Technology Solutions and one **Research Bot 01**, with role **Technical Research**, department **research**, and status **idle**. Restarting preserves data and never overwrites the seed records. There are no fake tasks. Initialization applies `server/db/migrations/002-review.sql` transactionally to existing version-1 databases without deleting or reseeding their records. Fresh databases receive the original schema/seed plus this migration. SQLite `user_version` records version 2; restarting does not repeat the migration. No database reset is required.

## API

All responses are JSON. Collection endpoints return arrays; item endpoints return objects. Creation returns `201`; reads, PATCH and review decisions return `200`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API and database availability |
| GET, POST | `/api/projects` | List or create projects |
| GET | `/api/projects/:id` | Read a project |
| GET, POST | `/api/tasks` | List or create tasks |
| GET, PATCH | `/api/tasks/:id` | Read task/queue summaries or apply validated compatibility updates |
| POST | `/api/tasks/:id/assign` | Assign with `{ "workerId": 1 }` |
| POST | `/api/tasks/:id/start` | Assigned → traveling |
| POST | `/api/tasks/:id/begin-work` | Traveling → working |
| POST | `/api/tasks/:id/resume` | Revision requested → working |
| POST | `/api/tasks/:id/cancel` | Cancel pre-review work and release linked worker |
| GET | `/api/workers` | List workers |
| GET, PATCH | `/api/workers/:id` | Read or manually update a worker |
| GET | `/api/activity` | Read the latest 100 events, newest first |
| GET, POST | `/api/tasks/:id/result` | Read latest result or submit a new version |
| GET | `/api/tasks/:id/result?version=1` | Read a historical version |
| GET | `/api/tasks/:id/approvals` | Read decisions newest first |
| POST | `/api/tasks/:id/approve` | Approve and complete |
| POST | `/api/tasks/:id/revise` | Request revision with a note |
| POST | `/api/tasks/:id/reject` | Reject and cancel |

Projects require nonblank `name` and `client`. Optional `description` defaults to empty text; `status` defaults to `active` and is a nonblank string.

Tasks require `projectId`, `title`, and `type`. Optional `description` and `requirements` are plain text; `assignedWorkerId` defaults to null, `status` to `draft`, and `progress` to zero. Project and assigned-worker references must exist. Task type is a nonblank string, such as `research`. Creation only accepts unassigned draft/queued tasks; use Assign afterward. Task reads add nullable `latestResult` (`id`, `version`, `summary`) and `latestRevision` (`id`, `notes`, `createdAt`) summaries for queues. No per-task HTTP polling is needed.

```sh
curl -X POST http://127.0.0.1:3001/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Architecture review","client":"Magnium Technology Solutions"}'

# Replace projectId with the ID returned above; worker 1 exists in a fresh database.
curl -X POST http://127.0.0.1:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"projectId":2,"title":"Review local architecture","type":"research","requirements":"Document tradeoffs","status":"queued"}'

curl http://127.0.0.1:3001/api/tasks
curl http://127.0.0.1:3001/api/workers
curl http://127.0.0.1:3001/api/activity
```

Operator action POSTs accept an empty JSON object except Assign, which accepts only `workerId`. They return `{ "task": { ... }, "worker": { ... } }` (worker may be null). Start requires assigned task/worker, Begin Work requires traveling, and Resume requires revision_requested with its retained assigned worker. Cancel accepts draft, queued, assigned, traveling, working, or revision_requested; repeated/invalid transitions return `409`. Every action commits task, worker, and activity together.

```sh
# Replace 1 with IDs returned by your local API.
curl -X POST http://127.0.0.1:3001/api/tasks/1/assign -H 'Content-Type: application/json' -d '{"workerId":1}'
curl -X POST http://127.0.0.1:3001/api/tasks/1/start -H 'Content-Type: application/json' -d '{}'
curl -X POST http://127.0.0.1:3001/api/tasks/1/begin-work -H 'Content-Type: application/json' -d '{}'
```

**Compatibility change:** task PATCH still has a strict allowlist, but no longer permits arbitrary lifecycle jumps. A single assignedWorkerId update delegates to Assign; traveling/working/cancelled status updates delegate to Start/Begin Work (or Resume)/Cancel. Mixed workflow updates are rejected. Progress alone may be updated only while working. Worker PATCH only permits idle/error state and a null task link on unlinked workers; use task actions for assignment and linked state. Old demo commands have been updated accordingly. Existing database records are preserved; inconsistent legacy assignments produce clear conflicts rather than silent repair.

Supported task states:

```text
draft, queued, assigned, traveling, working, awaiting_review, approved,
completed, revision_requested, failed, cancelled
```

Supported worker states:

```text
idle, assigned, traveling, working, awaiting_review, error
```

Work remains manual. `startedAt` is set on first entry into `working`. Review-managed states (`awaiting_review`, `approved`, `completed`, `revision_requested`) cannot be set through task POST/PATCH. Pending review tasks and reviewed terminal tasks cannot be edited through PATCH. Submit a result and use the explicit decision routes instead. Existing legacy records remain readable.

## Structured results and human review

A result requires a nonblank `summary`; optional narrative fields default to empty strings. Each narrative field is limited to 10,000 characters. `sources` is an array of up to 20 `{ "label": "Demo source", "url": "https://example.invalid/demo" }` objects; URL is optional and must use HTTP(S) without credentials. Sources are stored as JSON and displayed as text, without fetching them. `rawOutput` is persisted but omitted from the HUD.

Results are immutable versions, numbered per task. Submission is allowed from `working` or `revision_requested`; a legacy `awaiting_review` task without a result may receive its first result. It moves the task and currently linked worker to awaiting review in one transaction. Only the latest unreviewed result may be decided.

Each decision body is `{ "resultId": 1, "notes": "Optional note" }`. A revision note is required; notes are limited to 2,000 characters. The exact result ID prevents a stale browser from approving a newer result accidentally. Repeated, conflicting or stale decisions return `409` without changing records.

| Action | Task lifecycle | Linked worker |
| --- | --- | --- |
| Approve | `working → awaiting_review → approved → completed` | `idle`, current task cleared |
| Request revision | `working → awaiting_review → revision_requested` | `assigned`, task link retained |
| Reject | `working → awaiting_review → cancelled` | `idle`, current task cleared |

Approval and completion occur in one transaction; both activities are recorded, and `completedAt` is set. Revision performs no automatic work. A human can move the task/worker back to working and submit a new result version. A worker already associated with another task is never modified by these decisions. The task's assigned worker ID remains for history.

The selected bot HUD loads its result and decision history after successful operations polls, supports viewing previous versions, and keeps completed/cancelled tasks available under Recent tasks. Controls disable while offline, saving, loading, or viewing history. Successful decisions trigger an immediate data refresh; failed writes are never automatically retried. Notes are stored in approval records; activity messages omit notes and raw output.

A worker's current task must be assigned to that worker. Operator actions maintain both sides of this relationship atomically. Repeated decisions/transitions are rejected; unchanged progress updates do not duplicate activity.

Writes and their activity records commit together. Invalid input returns `400`; missing item IDs return `404`; assignment conflicts return `409`; nonlocal hosts/origins return `403`; bodies over 64 KB return `413`. Unexpected errors return `500` with a generic message, never a stack trace. Errors use `{ "error": "message" }`.

Validation rejects unknown fields, client-supplied IDs/timestamps, invalid references, invalid statuses, and progress outside 0–100. Short strings are limited to 256 characters; descriptions and requirements to 10,000. POST/PATCH requests must use JSON object bodies and `Content-Type: application/json`.

## Architecture and checks

- `src/api/`: validated API reads/writes and polling lifecycle.
- `src/hooks/useOperations.js`: React subscription to the polling snapshot.
- `src/ui/OperationsPanel.jsx`, `OperatorForms.jsx`, and `TaskActions.jsx`: compact operator UI, manual result entry, and explicit task actions.
- `src/hooks/useOperatorAction.js`: write locking, inline errors, and refresh.
- `src/data/operatorState.js`: pure action/availability helpers.
- `src/hooks/useTaskReview.js` and `src/ui/TaskReviewPanel.jsx`: cancellable result/history reads, explicit review writes, and HUD controls.
- `src/data/workerScene.js`: backend-to-scene adapter; `src/scene/workerMotion.js`: reusable routing and visual motion.
- `src/scene/` and `src/ui/`: existing facility rendering and backend-driven inspector. The previous simulation engine remains tested but is disconnected from the active application.
- `scripts/demo.js`: fixed-purpose manual demonstration commands.
- `server/index.js`: loopback listener and shutdown; `server/app.js`: Express setup and error handling.
- `server/api/`: small route modules with prepared SQL and transactional writes.
- `server/db/`: SQLite initialization, schema, versioned migrations, seeds, and activity insertion.
- `server/services/operations.js`: atomic task actions and queue projections.
- `server/services/review.js`: transactional result submission and human decision rules.
- `server/validation.js`: input validation and supported states.
- `server/backend.test.js` and `server/review.test.js`: isolated HTTP/database integration tests.

```sh
npm test
npm run lint
npm run build
npm run preview
```

Tests create temporary databases and temporary loopback HTTP servers; they do not modify `data/magnium.db`. They cover seeds, persistence, CRUD reads/creates, manual state updates, activity, invalid input, assignment conflicts, rollback, and request boundaries, result versions, migration preservation, review decisions, stale/concurrent decisions and transactional rollback, alongside API-client, polling, mapping, motion, and existing simulation tests.

`npm run build` builds the frontend; it does not bundle the backend. `npm run preview` previews static frontend output only; the documented API proxy is a development-server feature. The existing Three.js production bundle can trigger Vite's size warning.

## Limitations and next milestone

This is a local-only prototype with no authentication, authorization, worker execution, verified reviewer identities, or external integrations. The API contains no shell/command execution or filesystem-browsing endpoints, makes no outbound service requests, and includes no analytics or credentials. Local processes with access to the API can modify records; loopback binding is not authentication.

Project/task lists are unpaginated; activity reads are limited to 100 while history remains stored. Synchronous SQLite operations are appropriate for this small local foundation, not high-concurrency deployment. Visual positions are local to each browser and are not synchronized or persisted. Changes between polling snapshots can be missed; there is no event streaming. Legacy inconsistent task/worker associations remain visible and cause action conflicts; there is no automatic repair or reassignment UI.

A suggested next milestone is scoped task editing/reassignment with audit history and recovery controls for legacy inconsistent assignments, plus a decision on reviewer identity before any AI integration. It is not implemented here. Results remain manual/sample data; no AI provider is configured. Contributions should stay small, include relevant tests, and preserve the existing frontend.
