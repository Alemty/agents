/**
 * CV Generator - Creates complete HTML CVs ready for PDF conversion
 * Includes full professional profile with real contact info and hyperlinks
 */

import { MatchEngine, JobInput } from "../matcher/matchEngine";
import type { MatchResult } from "../matcher/matchEngine";

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

  generateCVData(job: JobInput): CVData {
    const match = this.engine.calculateMatch(job);
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
   * Generate a complete, beautifully designed HTML CV
   * Includes real contact info with hyperlinks, glow accents, print-optimized
   */
  generateHTML(cvData: CVData): string {
    const profile = this.engine.getProfile();
    const matchClass = cvData.matchScore >= 60 ? "high" : cvData.matchScore >= 30 ? "mid" : "low";
    const ts = new Date().toISOString().split("T")[0];

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - Alejandro Gutierrez Zavala - ${cvData.jobTitle}</title>
  <style>
    @page { margin: 0; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif;
      font-size: 10pt; line-height: 1.5; color: #1a1a2e;
      background: #f8f9ff;
    }
    .page {
      max-width: 816px; margin: 0 auto; padding: 32px 40px;
      background: white; min-height: 1056px;
    }
    /* === HEADER === */
    .header {
      text-align: center; padding-bottom: 20px;
      border-bottom: 3px solid #6366f1;
      margin-bottom: 20px;
      position: relative;
    }
    .header::after {
      content: ''; position: absolute; bottom: -3px; left: 50%;
      transform: translateX(-50%);
      width: 120px; height: 3px;
      background: linear-gradient(90deg, #6366f1, #a855f7, #6366f1);
      border-radius: 2px;
      box-shadow: 0 0 12px rgba(99,102,241,0.4);
    }
    .header h1 {
      font-size: 22pt; font-weight: 800;
      background: linear-gradient(135deg, #4338ca, #6366f1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 11pt; color: #555; margin-top: 4px;
    }
    .header .subtitle strong {
      color: #6366f1; font-weight: 600;
    }
    .contact-row {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 8px 20px; margin-top: 10px; font-size: 9pt;
    }
    .contact-row a {
      color: #6366f1; text-decoration: none; font-weight: 500;
    }
    .contact-row a:hover { text-decoration: underline; }
    .match-badge {
      display: inline-block; padding: 3px 14px; border-radius: 20px;
      font-size: 10pt; font-weight: 700; margin-top: 8px;
    }
    .match-badge.high { background: #d1fae5; color: #065f46; border: 1px solid #34d399; box-shadow: 0 0 12px rgba(52,211,153,0.3); }
    .match-badge.mid { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .match-badge.low { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }

    /* === SECTIONS === */
    .section { margin-bottom: 16px; }
    .section h2 {
      font-size: 12pt; font-weight: 700; color: #4338ca;
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 8px; padding-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section h2::before {
      content: ''; display: inline-block; width: 4px; height: 16px;
      background: linear-gradient(180deg, #6366f1, #a855f7);
      border-radius: 2px;
    }

    .summary-text { font-size: 9.5pt; color: #374151; line-height: 1.6; }

    /* === SKILLS === */
    .skill-group { margin-bottom: 8px; }
    .skill-group .group-name {
      font-weight: 600; font-size: 9pt; color: #4b5563;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
    }
    .skills-bar { display: flex; flex-wrap: wrap; gap: 4px; }
    .skill-tag {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 4px;
      font-size: 8.5pt; font-weight: 500;
    }
    .skill-advanced { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .skill-intermediate { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .skill-basic { background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }
    .skill-matched { box-shadow: 0 0 8px rgba(99,102,241,0.2); }
    .skill-dot { font-size: 7pt; }
    .skill-check { color: #6366f1; margin-left: 2px; }

    /* === EXPERIENCE === */
    .experience-item { margin-bottom: 10px; }
    .experience-item .exp-header {
      display: flex; justify-content: space-between; align-items: baseline;
    }
    .experience-item .exp-title { font-weight: 700; font-size: 10pt; color: #1f2937; }
    .experience-item .exp-period { font-size: 8.5pt; color: #6b7280; }
    .experience-item .exp-company { font-size: 9pt; color: #6366f1; font-weight: 500; }
    .experience-item .exp-desc {
      font-size: 9pt; color: #4b5563; margin-top: 2px; line-height: 1.5;
    }

    /* === ACHIEVEMENTS === */
    .achievement-list { list-style: none; padding: 0; }
    .achievement-list li {
      font-size: 9pt; color: #374151; margin-bottom: 4px;
      padding-left: 14px; position: relative;
    }
    .achievement-list li::before {
      content: '▸'; position: absolute; left: 0;
      color: #6366f1; font-weight: bold;
    }

    /* === ANALYSIS BOX === */
    .analysis-box {
      background: linear-gradient(135deg, #eef2ff, #faf5ff);
      border: 1px solid #c7d2fe; border-radius: 10px;
      padding: 12px 16px; margin-top: 6px;
      box-shadow: 0 2px 8px rgba(99,102,241,0.08);
    }
    .analysis-score {
      font-size: 18pt; font-weight: 800; color: #4338ca;
      display: inline-block; margin-right: 12px;
    }
    .analysis-text { font-size: 9pt; color: #374151; }
    .ats-keywords {
      margin-top: 8px; padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }
    .ats-keywords .label {
      font-size: 7.5pt; font-weight: 600; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .ats-keywords .kw {
      font-size: 7.5pt; color: #6366f1;
      background: #eef2ff; padding: 1px 5px; border-radius: 3px;
      margin: 0 1px;
    }

    /* === FOOTER === */
    .footer {
      margin-top: 20px; padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 7.5pt; color: #9ca3af; text-align: center;
    }

    /* === MISSING SKILLS === */
    .missing-skills {
      display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
    }
    .missing-tag {
      padding: 1px 6px; border-radius: 3px;
      font-size: 8pt; color: #b45309;
      background: #fffbeb; border: 1px dashed #fde68a;
    }

    @media print {
      body { background: white; }
      .page { box-shadow: none; padding: 0; max-width: 100%; }
      .header h1 { -webkit-text-fill-color: #4338ca; }
      .analysis-box { break-inside: avoid; }
      .skill-group { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <h1>Alejandro de Jesus Gutierrez Zavala</h1>
      <div class="subtitle">
        Builder Web3 · Full-Stack Blockchain Developer · 
        <strong>${cvData.jobTitle}</strong>
        ${cvData.company ? `en <strong>${cvData.company}</strong>` : ''}
      </div>
      <div class="contact-row">
        <span>📍 <a href="https://maps.google.com/?q=Monterrey+NL+México" target="_blank">Monterrey, N.L., México</a></span>
        <span>🔗 <a href="https://www.linkedin.com/in/alejandrogtzz93/" target="_blank">linkedin.com/in/alejandrogtzz93</a></span>
        <span>🌐 <a href="https://alemty.eth.limo" target="_blank">alemty.eth.limo</a></span>
        <span>🐙 <a href="https://github.com/Alemty" target="_blank">github.com/Alemty</a></span>
        <span>📧 <a href="mailto:alejandrogtzz93@gmail.com">alejandrogtzz93@gmail.com</a></span>
      </div>
      <div class="match-badge ${matchClass}">🎯 Compatibilidad: ${cvData.matchScore}%</div>
    </div>

    <!-- SUMMARY -->
    <div class="section">
      <h2>Resumen Profesional</h2>
      <p class="summary-text">${profile.summary}
      Mi valor diferencial: construyo productos completos desde el smart contract hasta el frontend, con experiencia multi-chain (Base, Ethereum, Polygon). Certificado Microsoft Trainer con dominio técnico en cloud computing, arquitectura de software y liderazgo de equipos.</p>
    </div>

    <!-- SKILLS -->
    <div class="section">
      <h2>Habilidades Clave</h2>
      ${this.groupSkillsByCategory(profile.skills).map((group) => `
        <div class="skill-group">
          <div class="group-name">${this.catLabel(group.category)}</div>
          <div class="skills-bar">
            ${group.skills.map((s: any) => {
              const matched = cvData.matchedSkills.includes(s.name);
              const levelClass = `skill-${s.level}`;
              const dots = s.level === "advanced" ? "●●●" : s.level === "intermediate" ? "●●○" : "●○○";
              return `<span class="skill-tag ${levelClass}${matched ? ' skill-matched' : ''}" style="${matched ? '' : 'opacity:0.7;'}">
                ${s.name} <span class="skill-dot">${dots}</span>${matched ? '<span class="skill-check">✓</span>' : ''}
              </span>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </div>

    <!-- EXPERIENCE -->
    <div class="section">
      <h2>Experiencia Profesional</h2>
      ${profile.experience.map((exp) => `
        <div class="experience-item">
          <div class="exp-header">
            <div class="exp-title">${exp.title}</div>
            ${exp.period ? `<div class="exp-period">${exp.period}</div>` : ''}
          </div>
          ${exp.company ? `<div class="exp-company">${exp.company}</div>` : ''}
          <div class="exp-desc">${exp.description}</div>
        </div>
      `).join("")}
    </div>

    <!-- ACHIEVEMENTS -->
    <div class="section">
      <h2>Logros Destacados</h2>
      <ul class="achievement-list">
        ${profile.achievements.map((a) => `<li>${a}</li>`).join("")}
      </ul>
    </div>

    <!-- ANALYSIS -->
    <div class="section">
      <h2>Análisis de Compatibilidad</h2>
      <div class="analysis-box">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div>
            <div class="analysis-score">${cvData.matchScore}%</div>
          </div>
          <div style="flex:1;">
            <div class="analysis-text">${cvData.analysis}</div>
            <div style="display:flex;gap:12px;margin-top:4px;font-size:8.5pt;color:#6b7280;">
              <span>✓ ${cvData.matchedSkills.length} habilidades coinciden</span>
              ${cvData.missingSkills.length > 0 ? `<span>📚 ${cvData.missingSkills.length} en desarrollo</span>` : ''}
            </div>
          </div>
        </div>
        ${cvData.missingSkills.length > 0 ? `
        <div style="margin-top:8px;">
          <div style="font-size:8pt;font-weight:600;color:#6b7280;margin-bottom:4px;">HABILIDADES EN DESARROLLO</div>
          <div class="missing-skills">
            ${cvData.missingSkills.map(s => `<span class="missing-tag">${s}</span>`).join("")}
          </div>
        </div>` : ''}
        <div class="ats-keywords">
          <span class="label">Keywords ATS:</span>
          ${profile.keywords?.slice(0, 15).map((kw: string) => `<span class="kw">${kw}</span>`).join("") || ''}
        </div>
      </div>
    </div>

    <div class="footer">
      CV generado automáticamente por Job Agent · ${ts} ·
      Perfil adaptado para: ${cvData.jobTitle}${cvData.company ? ` en ${cvData.company}` : ''} ·
      <a href="https://github.com/Alemty/agents" style="color:#9ca3af;">github.com/Alemty/agents</a>
    </div>
  </div>
</body>
</html>`;
  }

  private catLabel(cat: string): string {
    const labels: Record<string, string> = {
      blockchain: '⛓️ Blockchain & Web3',
      frontend: '🎨 Frontend',
      backend: '⚙️ Backend',
      infra: '☁️ Infraestructura',
      ai: '🤖 AI & Agents',
      automation: '🔧 Automatización',
      devops: '🛠️ DevOps',
      soft: '🧠 Habilidades Directivas',
      emerging: '🚀 Tecnologías Emergentes',
    };
    return labels[cat] || cat;
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
