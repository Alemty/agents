/**
 * LinkedIn Scraper for Cloudflare Workers
 * Uses Browser Run Quick Actions API (HTTP-based, no binding needed)
 */

export interface LinkedInJob {
  id?: string;
  platform: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  modality: string;
  salary: string | null;
  skills: string[];
  postedAt: string;
}

export interface ScrapeOptions {
  keywords: string[];
  location?: string;
  maxResults?: number;
  daysBack?: number;
}

// Browser Run Quick Actions endpoint (account-level, no binding required)
const BROWSER_RUN_URL = "https://browser-run.cdp.792fb5a1c2fb0af960074a1e869db0ed.workers.dev/";

/**
 * Execute a Browser Run Quick Action: navigate to URL, return HTML
 */
async function quickFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(BROWSER_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        output: "html",
        wait_until: "networkidle2",
        timeout: 30000,
        viewport: { width: 1280, height: 720 },
      }),
    });
    if (!res.ok) {
      console.error(`[BrowserRun] HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json<any>();
    return data?.html || null;
  } catch (e) {
    console.error(`[BrowserRun] Error: ${e}`);
    return null;
  }
}

/**
 * Execute a Browser Run Quick Action: navigate with login steps, return HTML
 */
async function quickFetchWithLogin(
  loginUrl: string,
  targetUrl: string,
  email: string,
  password: string
): Promise<string | null> {
  try {
    const res = await fetch(BROWSER_RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: loginUrl,
        output: "html",
        wait_until: "networkidle2",
        timeout: 45000,
        viewport: { width: 1280, height: 720 },
        actions: [
          // Fill email
          { action: "type", selector: "#username", value: email, delay: 100 },
          // Fill password
          { action: "type", selector: "#password", value: password, delay: 100 },
          // Click sign in
          { action: "click", selector: "button[type=submit]" },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[BrowserRun] Login HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json<any>();
    
    // Now navigate to target URL in a separate call
    // (Quick Actions are stateless, so login only worked for that page)
    // We'll navigate fresh to the target and try to use it
    return data?.html || null;
  } catch (e) {
    console.error(`[BrowserRun] Login error: ${e}`);
    return null;
  }
}

export class LinkedInScraper {
  private email: string;
  private password: string;
  private baseUrl = "https://www.linkedin.com";

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  /**
   * Scrape LinkedIn jobs using Browser Run Quick Actions
   */
  async scrapeJobs(options: ScrapeOptions): Promise<LinkedInJob[]> {
    const { keywords, location = "Monterrey", maxResults = 25 } = options;
    const allJobs: LinkedInJob[] = [];

    for (const keyword of keywords) {
      console.log(`[LinkedIn] Searching: ${keyword} in ${location}`);
      const jobs = await this.searchSingleKeyword(keyword, location, Math.ceil(maxResults / keywords.length));
      allJobs.push(...jobs);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return allJobs.filter((job) => {
      if (seen.has(job.url)) return false;
      seen.add(job.url);
      return true;
    });
  }

  private async searchSingleKeyword(
    keyword: string,
    location: string,
    maxResults: number
  ): Promise<LinkedInJob[]> {
    const jobs: LinkedInJob[] = [];
    const encodedKeyword = encodeURIComponent(keyword);
    const encodedLocation = encodeURIComponent(location);

    // LinkedIn search URL sorted by date (last 7 days)
    const searchUrl = `${this.baseUrl}/jobs/search/?keywords=${encodedKeyword}&location=${encodedLocation}&f_TPR=r604800&sortBy=DD`;

    try {
      const html = await quickFetch(searchUrl);
      if (!html) {
        console.log(`[LinkedIn] No HTML for ${keyword}`);
        return jobs;
      }

      // Parse job cards
      const jobCards = this.parseJobCards(html);

      for (const card of jobCards.slice(0, maxResults)) {
        try {
          const detailHtml = await quickFetch(this.ensureFullUrl(card.url));
          const fullJob = this.parseJobDetail(detailHtml || "", card);
          if (fullJob) {
            jobs.push({ ...fullJob, url: this.ensureFullUrl(card.url) });
          }
        } catch (e) {
          console.log(`[LinkedIn] Detail error for ${card.title}: ${e}`);
          jobs.push({
            platform: "linkedin",
            title: card.title,
            company: card.company,
            location: card.location,
            description: card.description || "",
            url: this.ensureFullUrl(card.url),
            modality: card.modality || "",
            salary: card.salary || null,
            skills: [],
            postedAt: card.postedAt || new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.error(`[LinkedIn] Error searching ${keyword}: ${e}`);
    }

    return jobs;
  }

  /**
   * Parse job cards from LinkedIn search results HTML
   */
  private parseJobCards(html: string): any[] {
    const cards: any[] = [];
    
    // Try multiple selector patterns for LinkedIn job cards
    const patterns = [
      // Pattern 1: base-card (new LinkedIn)
      /<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi,
      // Pattern 2: job-card-container
      /<div[^>]*class="[^"]*job-card-container[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      // Pattern 3: job-search-card
      /<div[^>]*class="[^"]*job-search-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
      // Pattern 4: Any anchor with job id
      /<a[^>]*href="([^"]*\/jobs\/view\/\d+[^"]*)"[^>]*>[\s\S]*?<\/a>/gi,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const cardHtml = match[0] || match[1] || "";
        const href = match[1] || "";
        
        // Extract title
        const titleMatch = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) 
          || cardHtml.match(/aria-label="([^"]+)"/
          || cardHtml.match(/<span[^>]*class="[^"]*screen-reader-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i));
        const title = titleMatch ? this.cleanText(titleMatch[1]) : "";

        // Extract company
        const companyMatch = cardHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)
          || cardHtml.match(/class="[^"]*artdeco-entity-lockup__subtitle[^"]*"[^>]*>([\s\S]*?)</i);
        const company = companyMatch ? this.cleanText(companyMatch[1]) : "";

        // Extract location
        const locationMatch = cardHtml.match(/class="[^"]*job-card-container__metadata-wrapper[^"]*"[^>]*>([\s\S]*?)</i)
          || cardHtml.match(/<li[^>]*class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>([\s\S]*?)<\/li>/i);
        const location = locationMatch ? this.cleanText(locationMatch[1]) : "";

        // Extract salary if present
        const salaryMatch = cardHtml.match(/\$[\d,]+[\s-]*\$?[\d,]*/g);
        const salary = salaryMatch ? salaryMatch[0] : null;

        // Extract modality
        const modalityMatch = cardHtml.match(/(Presencial|Remoto|Híbrido|Hybrid|Remote|On-site|Hibrido)/i);
        const modality = modalityMatch ? modalityMatch[1] : "";

        if (title && href) {
          cards.push({
            title,
            company,
            location,
            url: href.startsWith("http") ? href : `https://www.linkedin.com${href}`,
            salary,
            modality,
            description: "",
            postedAt: new Date().toISOString(),
          });
        }
      }
      if (cards.length > 0) break; // Stop at first pattern that matches
    }

    return cards;
  }

  /**
   * Parse job detail page HTML
   */
  private parseJobDetail(html: string, card: any): any {
    // Extract description
    const descMatch = html.match(/class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/class="[^"]*show-more-less-html[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/id="job-details"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descMatch ? this.cleanText(descMatch[1]) : "";

    // Extract skills from description
    const skills = this.extractSkills(description);

    // Better modality extraction from detail
    const modalityMatch = html.match(/(Presencial|Remoto|Híbrido|Hybrid|Remote|On-site|Hibrido)/i);
    const modality = modalityMatch ? modalityMatch[1] : card.modality || "";

    // Extract posted date
    const dateMatch = html.match(/(\d+)\s+(minute|hour|day|week|month|día|hora|semana|mes)\s+/i);
    const postedAt = dateMatch ? dateMatch[0] : card.postedAt;

    return {
      ...card,
      description,
      skills,
      modality,
      postedAt,
    };
  }

  /**
   * Extract skills from job description text
   */
  private extractSkills(description: string): string[] {
    const skillKeywords = [
      // Blockchain / Web3
      "Solidity", "Ethereum", "Web3", "Blockchain", "Smart Contract", "DAOs", "DeFi",
      "NFT", "IPFS", "ENS", "Hardhat", "Foundry", "Wagmi", "Viem", "Ethers.js",
      "OpenZeppelin", "The Graph", "Chainlink",
      // Frontend
      "React", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind",
      "Vue", "Angular", "Redux", "GraphQL", "REST API",
      // Backend
      "Node.js", "Python", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker",
      "AWS", "Cloudflare", "Serverless", "Microservices",
      // AI / Data
      "Machine Learning", "AI", "Artificial Intelligence", "Data Analysis", "Power BI",
      "Excel", "Tableau", "Prompt Engineering", "LLMs", "Copilot",
      // Soft skills
      "Leadership", "Team Management", "Training", "Coaching", "Sales",
      "Communication", "CRM", "Inventory Management", "KPI Analysis",
      // Languages
      "English", "Spanish",
    ];

    const found: string[] = [];
    const descLower = description.toLowerCase();

    for (const skill of skillKeywords) {
      if (descLower.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    }

    return found;
  }

  /**
   * Clean HTML text
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Ensure URL is absolute
   */
  private ensureFullUrl(url: string): string {
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return `${this.baseUrl}${url}`;
    return `${this.baseUrl}/${url}`;
  }
}
