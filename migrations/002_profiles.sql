-- Migration 002: Multi-user profiles & per-user CV data
-- Adds user profiles table so each user can have their own CV data,
-- keywords, and professional information
-- Run: wrangler d1 execute jobs-db --file=migrations/002_profiles.sql

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  web_url TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  skills_json TEXT NOT NULL DEFAULT '[]',
  experience_json TEXT NOT NULL DEFAULT '[]',
  achievements_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add profile_id to jobs table (nullable for backward compatibility)
ALTER TABLE jobs ADD COLUMN profile_id TEXT REFERENCES profiles(id);
ALTER TABLE jobs ADD COLUMN user_keywords_json TEXT NOT NULL DEFAULT '[]';

-- Add profile_id to applications table
ALTER TABLE applications ADD COLUMN profile_id TEXT REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_jobs_profile_id ON jobs(profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_profile_id ON applications(profile_id);
