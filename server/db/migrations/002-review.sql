CREATE TABLE task_results (
 id INTEGER PRIMARY KEY,
 taskId INTEGER NOT NULL REFERENCES tasks(id),
 version INTEGER NOT NULL CHECK(version > 0),
 summary TEXT NOT NULL CHECK(length(trim(summary)) BETWEEN 1 AND 10000),
 recommendation TEXT NOT NULL DEFAULT '',
 reasoning TEXT NOT NULL DEFAULT '',
 securityConsiderations TEXT NOT NULL DEFAULT '',
 limitations TEXT NOT NULL DEFAULT '',
 sources TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(sources) AND json_type(sources) = 'array'),
 rawOutput TEXT NOT NULL DEFAULT '',
 createdAt TEXT NOT NULL,
 updatedAt TEXT NOT NULL,
 UNIQUE(taskId, version),
 UNIQUE(taskId, id)
);
CREATE TABLE approvals (
 id INTEGER PRIMARY KEY,
 taskId INTEGER NOT NULL REFERENCES tasks(id),
 resultId INTEGER NOT NULL UNIQUE,
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','revision_requested')),
 notes TEXT NOT NULL DEFAULT '',
 createdAt TEXT NOT NULL,
 updatedAt TEXT NOT NULL,
 FOREIGN KEY(taskId,resultId) REFERENCES task_results(taskId,id)
);
CREATE INDEX approvals_task ON approvals(taskId,id DESC);
