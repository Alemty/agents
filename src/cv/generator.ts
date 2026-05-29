/**
 * CV Generator - Creates HTML/dashboard-ready CV profiles
 * For actual file generation, uses a two-step approach:
 * 1. Generate HTML CV content
 * 2. Convert to PDF via a rendering endpoint
 */

import { MatchEngine, JobInput } from "../matcher/matchEngine";

export interface CVData {
  jobId: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  analysis: string;
}

export class CVGenerator {
  private engine: MatchEngine;

  constructor() {
    this.engine = new MatchEngine();
  }

  /**
   * Generate CV data for a specific job match
   */
  generateCVData(job: JobInput): CVData {
    const match = this.engine.calculateMatch(job);
    const profile = this.engine.getProfile();

    return {
      jobId: "",
      jobTitle: job.title,
      company: "",
      matchScore: match.score,
      matchedSkills: match.matched,
      missingSkills: match.missing,
      analysis: match.analysis,
    };
  }

  /**
   * Generate HTML CV content (can be rendered as PDF or printed)
   */
  generateHTML(cvData: CVData): string {
    const profile = this.engine.getProfile();
    const matchClass = cvData.matchScore >= 60 ? "high" : cvData.matchScore >= 30 ? "mid" : "low";

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>CV - ${profile.name} - ${cvData.jobTitle}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 10pt; line-height: 1.5; color: #1a1a2e; }
    .header { border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18pt; color: #6366f1; }
    .header .subtitle { font-size: 10pt; color: #666; margin-top: 4px; }
    .header .contact { font-size: 9pt; color: #555; margin-top: 6px; }
    .section { margin-bottom: 14px; }
    .section h2 { font-size: 12pt; color: #6366f1; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
    .skill-group { margin-bottom: 6px; }
    .skill-group .group-name { font-weight: 600; font-size: 9pt; color: #444; margin-bottom: 3px; }
    .skill-group .skills { font-size: 9pt; color: #333; }
    .skill-tag { display: inline-block; padding: 1px 6px; margin: 1px 2px; border-radius: 3px; font-size: 8pt; }
    .skill-advanced { background: #6366f120; color: #4338ca; }
    .skill-intermediate { background: #f59e0b20; color: #b45309; }
    .skill-basic { background: #6b728020; color: #4b5563; }
    .match-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
    .high { background: #065f4620; color: #065f46; }
    .mid { background: #713f1220; color: #92400e; }
    .low { background: #7f1d1d20; color: #7f1d1d; }
    .exp-item { margin-bottom: 6px; }
    .exp-item .exp-title { font-weight: 600; font-size: 10pt; }
    .exp-item .exp-company { font-size: 9pt; color: #555; }
    .exp-item .exp-desc { font-size: 9pt; color: #444; margin-top: 2px; }
    .achievements li { font-size: 9pt; margin-bottom: 2px; }
    .keyword-section { background: #f8f8ff; padding: 8px; border-radius: 6px; margin-top: 8px; }
    .ats-keywords { font-size: 8pt; color: #6366f1; }
    .footer { border-top: 1px solid #ddd; padding-top: 8px; margin-top: 16px; font-size: 8pt; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${profile.name}</h1>
    <div class="subtitle">${profile.title} · Adaptado para: <strong>${cvData.jobTitle}</strong></div>
    <div class="contact">
      📍 ${profile.location} · 🔗 linkedin.com/in/alemty · 🌐 alemty.eth.limo
      <span class="match-badge ${matchClass}" style="float:right">Match: ${cvData.matchScore}%</span>
    </div>
  </div>

  <div class="section">
    <h2>Resumen Profesional</h2>
    <p style="font-size:9pt">${profile.summary}</p>
  </div>

  <div class="section">
    <h2>Habilidades Clave</h2>
    ${this.groupSkillsByCategory(profile.skills)
      .map((group) => `
        <div class="skill-group">
          <div class="group-name">${group.category.toUpperCase()}</div>
          <div class="skills">
            ${group.skills.map((s: any) => {
              const matched = cvData.matchedSkills.includes(s.name);
              const levelClass = s.level === "advanced" ? "skill-advanced" : s.level === "intermediate" ? "skill-intermediate" : "skill-basic";
              const levelDot = s.level === "advanced" ? "●●●" : s.level === "intermediate" ? "●●○" : "●○○";
              return `<span class="skill-tag ${levelClass}" style="${matched ? 'border:1px solid #6366f1;' : 'opacity:0.6;'}">${s.name} ${levelDot}${matched ? ' ✅' : ''}</span>`;
            }).join(" ")}
          </div>
        </div>
      `).join("")}
  </div>

  <div class="section">
    <h2>Experiencia</h2>
    ${profile.experience.map((exp) => `
      <div class="exp-item">
        <div class="exp-title">${exp.title}</div>
        ${exp.company ? `<div class="exp-company">${exp.company} · ${exp.period || ''}</div>` : ''}
        <div class="exp-desc">${exp.description}</div>
      </div>
    `).join("")}
  </div>

  <div class="section">
    <h2>Logros</h2>
    <ul class="achievements">
      ${profile.achievements.map((a) => `<li>${a}</li>`).join("")}
    </ul>
  </div>

  ${cvData.missingSkills.length > 0 ? `
  <div class="section">
    <h2>Habilidades en Desarrollo</h2>
    <p style="font-size:9pt;color:#666">${cvData.missingSkills.join(" · ")}</p>
  </div>` : ""}

  <div class="section">
    <h2>Análisis de Compatibilidad</h2>
    <div class="keyword-section">
      <p style="font-size:9pt;color:#333;margin-bottom:4px">${cvData.analysis}</p>
      <div class="ats-keywords">
        Keywords ATS: ${profile.keywords?.slice(0, 20).join(", ") || ""}
      </div>
    </div>
  </div>

  <div class="footer">
    CV generado automáticamente por Job Agent · ${new Date().toISOString().split("T")[0]} ·
    Perfil optimizado para postulación en ${cvData.jobTitle} en ${cvData.company || "empresa destino"}
  </div>
</body>
</html>`;
  }

  private groupSkillsByCategory(skills: any[]): { category: string; skills: any[] }[] {
    const groups: Record<string, any[]> = {};
    for (const s of skills) {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    }
    return Object.entries(groups).map(([category, skills]) => ({ category, skills }));
  }
}
