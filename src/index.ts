import { Hono } from "hono";
import { cors } from "hono/cors";
import { MatchEngine } from "./matcher/matchEngine";
import { LinkedInScraper } from "./scrapers";
import type { ScrapeOptions } from "./scrapers";
import { JobSchema, ApplicationSchema } from "./db/schema";

export type Bindings = {
  DB: D1Database;
  MATCH_THRESHOLD: string;
  MAX_APPLICATIONS_DAY: string;
  LINKEDIN_EMAIL?: string;
  LINKEDIN_PASSWORD?: string;
  ANTHROPIC_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/*", cors({
  origin: ["http://localhost:3000", "https://job-agent.alejandrogtzz93.workers.dev", "https://alemty.eth.limo"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ---------------------------
// Health check
// ---------------------------
app.get("/", (c) =>
  c.json({
    ok: true,
    agent: "Job Agent v0.1",
    status: "online",
    timestamp: new Date().toISOString(),
  })
);

// ---------------------------
// Jobs CRUD
// ---------------------------

// GET /jobs — List jobs with filters
app.get("/jobs", async (c) => {
  const { platform, minScore, applied, limit = "50" } = c.req.query();
  const db = c.env.DB;

  let query = "SELECT * FROM jobs WHERE 1=1";
  const params: any[] = [];

  if (platform) {
    query += " AND platform = ?";
    params.push(platform);
  }
  if (minScore) {
    query += " AND match_score >= ?";
    params.push(Number(minScore));
  }
  if (applied !== undefined) {
    query += applied === "true" ? " AND applied = 1" : " AND applied = 0";
  }

  query += " ORDER BY match_score DESC LIMIT ?";
  params.push(Number(limit));

  const { results } = await db.prepare(query).bind(...params).all();
  return c.json({ ok: true, jobs: results, total: results.length });
});

// GET /jobs/:id
app.get("/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const job = await c.env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
  if (!job) return c.json({ ok: false, error: "Job not found" }, 404);
  return c.json({ ok: true, job });
});

// POST /jobs — Add scraped jobs
app.post("/jobs", async (c) => {
  const body = await c.req.json();
  const jobs = Array.isArray(body) ? body : [body];
  const db = c.env.DB;
  const engine = new MatchEngine();

  let added = 0;
  for (const job of jobs) {
    // Check duplicate by URL
    const existing = await db.prepare("SELECT id FROM jobs WHERE url = ?").bind(job.url).first();
    if (existing) continue;

    // Run matching
    const match = engine.calculateMatch(job);

    await db.prepare(
      `INSERT INTO jobs (id, platform, title, company, location, description, url, modality, salary, skills_json, match_score, matched_skills_json, missing_skills_json, keyword_hits, analysis, scraped_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      job.id || crypto.randomUUID(),
      job.platform || "manual",
      job.title || "",
      job.company || "",
      job.location || "",
      job.description || "",
      job.url || "",
      job.modality || "",
      job.salary || null,
      JSON.stringify(job.skills || []),
      match.score,
      JSON.stringify(match.matched),
      JSON.stringify(match.missing),
      match.keywordHits,
      match.analysis,
      new Date().toISOString()
    ).run();
    added++;
  }

  return c.json({ ok: true, added });
});

// PATCH /jobs/:id — Update job (e.g. mark applied)
app.patch("/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.DB;

  const updates: string[] = [];
  const params: any[] = [];

  if (body.applied !== undefined) {
    updates.push("applied = ?");
    params.push(body.applied ? 1 : 0);
  }
  if (body.match_score !== undefined) {
    updates.push("match_score = ?");
    params.push(body.match_score);
  }
  if (body.cv_path !== undefined) {
    updates.push("cv_path = ?");
    params.push(body.cv_path);
  }

  if (updates.length === 0) {
    return c.json({ ok: false, error: "No fields to update" }, 400);
  }

  params.push(id);
  await db.prepare(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
  return c.json({ ok: true, updated: updates.length });
});

// ---------------------------
// Applications
// ---------------------------

// POST /applications — Record an application
app.post("/applications", async (c) => {
  const { jobId, cvPath, score } = await c.req.json();
  const db = c.env.DB;
  const maxDay = Number(c.env.MAX_APPLICATIONS_DAY) || 20;

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await db.prepare(
    "SELECT COUNT(*) as count FROM applications WHERE DATE(applied_at) = ?"
  ).bind(today).first<any>();

  if (count >= maxDay) {
    return c.json({ ok: false, error: "Daily application limit reached", limit: maxDay, today: count }, 429);
  }

  const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await db.prepare(
    "INSERT INTO applications (id, job_id, cv_path, score, applied_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, jobId, cvPath, score, new Date().toISOString()).run();

  // Mark job as applied
  await db.prepare("UPDATE jobs SET applied = 1, cv_path = ? WHERE id = ?").bind(cvPath, jobId).run();

  return c.json({ ok: true, application: { id, jobId, score } });
});

// GET /applications
app.get("/applications", async (c) => {
  const { status, limit = "50" } = c.req.query();
  const db = c.env.DB;

  let query = `SELECT a.*, j.title as job_title, j.company as job_company, j.platform
               FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE 1=1`;
  const params: any[] = [];

  if (status) {
    query += " AND a.status = ?";
    params.push(status);
  }

  query += " ORDER BY a.applied_at DESC LIMIT ?";
  params.push(Number(limit));

  const { results } = await db.prepare(query).bind(...params).all();
  return c.json({ ok: true, applications: results, total: results.length });
});

// ---------------------------
// Stats
// ---------------------------

// GET /stats
app.get("/stats", async (c) => {
  const db = c.env.DB;

  const [totalJobs, appliedJobs, pendingApps, todayCount, matchAvg, byPlatform] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM jobs").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM jobs WHERE applied = 1").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'pending'").first<any>(),
    db.prepare("SELECT COUNT(*) as c FROM applications WHERE DATE(applied_at) = DATE('now')").first<any>(),
    db.prepare("SELECT COALESCE(AVG(match_score), 0) as avg FROM jobs WHERE match_score > 0").first<any>(),
    db.prepare("SELECT platform, COUNT(*) as count FROM jobs GROUP BY platform").all(),
  ]);

  return c.json({
    ok: true,
    stats: {
      totalJobs: totalJobs?.c || 0,
      appliedJobs: appliedJobs?.c || 0,
      pendingApplications: pendingApps?.c || 0,
      todayApplications: todayCount?.c || 0,
      maxDailyApplications: Number(c.env.MAX_APPLICATIONS_DAY) || 20,
      averageMatchScore: Math.round((matchAvg?.avg || 0) * 100) / 100,
      byPlatform: byPlatform.results || [],
      lastRun: null,
    },
  });
});

// ---------------------------
// Match engine (manual)
// ---------------------------

// POST /match — Analyze a job description
app.post("/match", async (c) => {
  const { title, description, skills } = await c.req.json();
  const engine = new MatchEngine();
  const result = engine.calculateMatch({ title, description, skills: skills || [] });

  return c.json({
    ok: true,
    match: {
      score: result.score,
      matched: result.matched,
      missing: result.missing,
      analysis: result.analysis,
      keywordHits: result.keywordHits,
    },
  });
});

// ---------------------------
// Scrape (LinkedIn via Browser Rendering)
// ---------------------------

// POST /api/scrape — Trigger job scraping
app.post("/api/scrape", async (c) => {
  const body = await c.req.json<{
    keywords?: string[];
    location?: string;
    maxResults?: number;
    daysBack?: number;
    autoMatch?: boolean;
    apiKey?: string;
  }>();

  const email = c.env.LINKEDIN_EMAIL;
  const password = c.env.LINKEDIN_PASSWORD;

  if (!email || !password) {
    return c.json({ ok: false, error: "LinkedIn credentials not configured. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD secrets." }, 400);
  }

  const options: ScrapeOptions = {
    keywords: body.keywords || ["Web3", "Solidity", "Blockchain", "Smart Contract", "Full Stack Developer", "React Developer", "JavaScript", "TypeScript"],
    location: body.location || "Monterrey",
    maxResults: body.maxResults || 25,
    daysBack: body.daysBack || 7,
  };

  // Scrape LinkedIn
  const scraper = new LinkedInScraper(email, password);
  const jobs = await scraper.scrapeJobs(options);

  // Optionally run matching and store
  let matched = 0;
  let stored = 0;

  if (body.autoMatch !== false) {
    const engine = new MatchEngine();
    const db = c.env.DB;

    for (const job of jobs) {
      // Check duplicate
      const existing = await db.prepare("SELECT id FROM jobs WHERE url = ?").bind(job.url).first();
      if (existing) continue;

      const match = engine.calculateMatch({
        title: job.title,
        description: job.description,
        skills: job.skills,
      });

      if (match.score >= Number(c.env.MATCH_THRESHOLD || 60)) {
        await db.prepare(
          `INSERT INTO jobs (id, platform, title, company, location, description, url, modality, salary, skills_json, match_score, matched_skills_json, missing_skills_json, keyword_hits, analysis, scraped_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          "linkedin",
          job.title,
          job.company,
          job.location,
          job.description,
          job.url,
          job.modality,
          job.salary,
          JSON.stringify(job.skills),
          match.score,
          JSON.stringify(match.matched),
          JSON.stringify(match.missing),
          match.keywordHits,
          match.analysis,
          new Date().toISOString()
        ).run();
        stored++;
      }
      matched++;
    }
  }

  return c.json({
    ok: true,
    scrape: {
      total: jobs.length,
      matched,
      stored,
      threshold: Number(c.env.MATCH_THRESHOLD || 60),
      keywords: options.keywords,
      location: options.location,
    },
    jobs: jobs.slice(0, 5).map((j) => ({
      title: j.title,
      company: j.company,
      location: j.location,
      url: j.url,
    })),
  });
});

// GET /api/scrape/status — Check scrape status
app.get("/api/scrape/status", async (c) => {
  const email = c.env.LINKEDIN_EMAIL;
  const password = c.env.LINKEDIN_PASSWORD;

  return c.json({
    ok: true,
    config: {
      linkedinConfigured: !!email && !!password,
      threshold: Number(c.env.MATCH_THRESHOLD || 60),
      maxDaily: Number(c.env.MAX_APPLICATIONS_DAY || 20),
    },
  });
});

// ---------------------------
// SPA fallback — serve index.html for non-API routes
// ---------------------------

app.all("*", async (c) => {
  // If it's an API route, return 404
  if (c.req.path.startsWith("/api/")) {
    return c.json({ ok: false, error: "Not found" }, 404);
  }

  // For SPA routes (non-API, non-file), redirect to /
  return c.redirect("/");
});

export default app;
