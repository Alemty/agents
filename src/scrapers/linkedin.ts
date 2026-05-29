/**
 * LinkedIn Scraper for Cloudflare Workers
 * Uses public LinkedIn job search RSS/XML feeds and direct HTTP fetching
 * No browser automation required - LinkedIn serves job data in HTML server-side
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

// LinkedIn public RSS feed endpoint
// LinkedIn serves job search results as server-rendered HTML (no JS needed for basic data)
const LINKEDIN_SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export class LinkedInScraper {
  private email: string;
  private password: string;
  private baseUrl = "https://www.linkedin.com";

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  /**
   * Scrape LinkedIn jobs using public search API (no browser required)
   * LinkedIn's jobs-guest endpoint returns HTML with job cards server-side
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

    // Use LinkedIn's guest job search API (returns HTML, no JS needed)
    const searchUrl = `${LINKEDIN_SEARCH_URL}?keywords=${encodedKeyword}&location=${encodedLocation}&f_TPR=r604800&start=0`;

    try {
      const html = await this.fetchPage(searchUrl);
      if (!html) {
        console.log(`[LinkedIn] No HTML for ${keyword}`);
        return jobs;
      }

      // Parse job cards from the guest API HTML
      const jobCards = this.parseGuestJobCards(html);

      for (const card of jobCards.slice(0, maxResults)) {
        try {
          // Fetch job detail page (server-rendered HTML)
          const detailUrl = `/jobs/view/${card.id}?trk=public_jobs_job-result-card`;
          const detailHtml = await this.fetchPage(`${this.baseUrl}${detailUrl}`);
          const fullJob = this.parseJobDetail(detailHtml || "", card);

          jobs.push({
            ...fullJob,
            url: `https://www.linkedin.com/jobs/view/${card.id}/`,
          });
        } catch (e) {
          console.log(`[LinkedIn] Detail error for ${card.title}: ${e}`);
          // Fallback: add card-level data
          jobs.push({
            platform: "linkedin",
            title: card.title,
            company: card.company,
            location: card.location,
            description: card.description || "",
            url: `https://www.linkedin.com/jobs/view/${card.id}/`,
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
   * Fetch a page via HTTP GET (server-side rendered HTML)
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        console.error(`[LinkedIn] HTTP ${res.status} for ${url}`);
        return null;
      }

      return await res.text();
    } catch (e) {
      console.error(`[LinkedIn] Fetch error for ${url}: ${e}`);
      return null;
    }
  }

  /**
   * Parse job cards from LinkedIn's guest job search API HTML
   */
  private parseGuestJobCards(html: string): any[] {
    const cards: any[] = [];
    
    // LinkedIn uses base-card class in guest API
    const cardRegex = /<div[^>]*class="[^"]*base-card[^"]*job-search-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const jobId = match[1];
      const cardHtml = match[2];

      // Extract title from h3 with class base-search-card__title
      const titleMatch = cardHtml.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/h3>/i)
        || cardHtml.match(/<span class="sr-only">\s*([\s\S]*?)\s*<\/span>/i);
      const title = titleMatch ? this.cleanText(titleMatch[1]) : "";

      // Extract company (h4 with class base-search-card__subtitle)
      const companyMatch = cardHtml.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i)
        || cardHtml.match(/class="[^"]*hidden-nested-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const company = companyMatch ? this.cleanText(companyMatch[1]) : "";

      // Extract location
      const locationMatch = cardHtml.match(/class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
        || cardHtml.match(/<span[^>]*class="[^"]*base-search-card__metadata[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const location = locationMatch ? this.cleanText(locationMatch[1]) : "";

      // Extract posted time
      const timeMatch = cardHtml.match(/class="[^"]*job-search-card__listed-state[^"]*"[^>]*>\s*<time[^>]*>([\s\S]*?)<\/time>/i)
        || cardHtml.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
      const postedAt = timeMatch ? this.cleanText(timeMatch[1]) : "";

      // Extract salary
      const salaryMatch = cardHtml.match(/\$[\d,]+[\s-]*\$?[\d,]*/g);
      const salary = salaryMatch ? salaryMatch[0] : null;

      if (jobId && title) {
        cards.push({
          id: jobId,
          title,
          company,
          location,
          salary,
          modality: "",
          description: "",
          postedAt,
        });
      }
    }

    return cards;
  }

  /**
   * Parse job detail page HTML to extract description
   */
  private parseJobDetail(html: string, card: any): any {
    // Extract description from detail page
    const descMatch = html.match(/class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/class="[^"]*show-more-less-html[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/id="job-details"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descMatch ? this.cleanText(descMatch[1]) : card.description || "";

    // Extract skills from description
    const skills = this.extractSkills(description);

    // Modality from detail page
    const modalityMatch = html.match(/(Presencial|Remoto|Híbrido|Hybrid|Remote|On-site|Hibrido)/i);
    const modality = modalityMatch ? modalityMatch[1] : card.modality || "";

    return {
      ...card,
      description,
      skills,
      modality,
    };
  }

  /**
   * Extract skills from job description text
   */
  private extractSkills(description: string): string[] {
    const skillKeywords = [
      "Solidity", "Ethereum", "Web3", "Blockchain", "Smart Contract", "DAOs", "DeFi",
      "NFT", "IPFS", "ENS", "Hardhat", "Foundry", "Wagmi", "Viem", "Ethers.js",
      "OpenZeppelin", "The Graph", "Chainlink",
      "React", "Next.js", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind",
      "Vue", "Angular", "Redux", "GraphQL", "REST API",
      "Node.js", "Python", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker",
      "AWS", "Cloudflare", "Serverless", "Microservices",
      "Machine Learning", "AI", "Artificial Intelligence", "Data Analysis", "Power BI",
      "Excel", "Tableau", "Prompt Engineering", "LLMs", "Copilot",
      "Leadership", "Team Management", "Training", "Coaching", "Sales",
      "Communication", "CRM", "Inventory Management", "KPI Analysis",
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
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
}
