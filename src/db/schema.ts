export interface Job {
  id: string;
  platform: string;       // linkedin | indeed | computrabajo | manual
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  modality: string;
  salary: string | null;
  skills_json: string;
  match_score: number;
  matched_skills_json: string;
  missing_skills_json: string;
  keyword_hits: number;
  analysis: string;
  applied: number;        // 0 | 1
  cv_path: string | null;
  scraped_at: string;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  cv_path: string;
  score: number;
  status: string;         // pending | sent | failed
  applied_at: string;
  job_title?: string;
  job_company?: string;
  platform?: string;
}
