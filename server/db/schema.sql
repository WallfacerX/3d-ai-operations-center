CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 256),
  client TEXT NOT NULL CHECK(length(trim(client)) BETWEEN 1 AND 256),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(length(trim(status)) BETWEEN 1 AND 256),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE workers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('idle','assigned','traveling','working','awaiting_review','error')),
  currentTaskId INTEGER REFERENCES tasks(id),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  projectId INTEGER NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 256),
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK(length(trim(type)) BETWEEN 1 AND 256),
  assignedWorkerId INTEGER REFERENCES workers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','queued','assigned','traveling','working','awaiting_review','approved','completed','revision_requested','failed','cancelled')),
  progress REAL NOT NULL DEFAULT 0 CHECK(typeof(progress) IN ('integer','real') AND progress BETWEEN 0 AND 100),
  createdAt TEXT NOT NULL,
  startedAt TEXT,
  completedAt TEXT
);
CREATE TABLE activity (
  id INTEGER PRIMARY KEY,
  projectId INTEGER REFERENCES projects(id),
  taskId INTEGER REFERENCES tasks(id),
  workerId INTEGER REFERENCES workers(id),
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
CREATE INDEX tasks_project ON tasks(projectId);
CREATE INDEX tasks_worker ON tasks(assignedWorkerId);
CREATE INDEX workers_task ON workers(currentTaskId);
CREATE INDEX activity_recent ON activity(timestamp DESC, id DESC);
