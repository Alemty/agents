-- Initial schema for Job Agent
-- Run: wrangler d1 execute jobs-db --file=migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  modality TEXT NOT NULL DEFAULT '',
  salary TEXT,
  skills_json TEXT NOT NULL DEFAULT '[]',
  match_score INTEGER NOT NULL DEFAULT 0,
  matched_skills_json TEXT NOT NULL DEFAULT '[]',
  missing_skills_json TEXT NOT NULL DEFAULT '[]',
  keyword_hits INTEGER NOT NULL DEFAULT 0,
  analysis TEXT NOT NULL DEFAULT '',
  applied INTEGER NOT NULL DEFAULT 0,
  cv_path TEXT,
  scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  cv_path TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score);
CREATE INDEX IF NOT EXISTS idx_jobs_applied ON jobs(applied);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(applied_at);
