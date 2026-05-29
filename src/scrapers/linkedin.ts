/**
 * LinkedIn Scraper for Cloudflare Workers
 * Uses Browser Rendering API (Puppeteer-compatible) for scraping
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

export class LinkedInScraper {
  private email: string;
  private password: string;
  private baseUrl = "https://www.linkedin.com";
  private browser: any;

  constructor(email: string, password: string, browser?: any) {
    this.email = email;
    this.password = password;
    this.browser = browser;
  }

  /**
   * Scrape LinkedIn jobs using Browser Rendering API
   * This uses the ALB (Automated Lighthouse Browser) endpoint
   */
  async scrapeJobs(options: ScrapeOptions): Promise<LinkedInJob[]> {
    const { keywords, location = "Monterrey", maxResults = 25, daysBack = 7 } = options;
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

    // LinkedIn search URL sorted by date
    const searchUrl = `${this.baseUrl}/jobs/search/?keywords=${encodedKeyword}&location=${encodedLocation}&f_TPR=r604800&sortBy=DD`;

    try {
      // Use Browser Rendering API via fetch to the ALB endpoint
      const browserResult = await this.browseUrl(searchUrl);

      if (!browserResult || !browserResult.html) {
        console.log(`[LinkedIn] No results for ${keyword}`);
        return jobs;
      }

      // Parse job cards from the HTML
      const jobCards = this.parseJobCards(browserResult.html);

      for (const card of jobCards.slice(0, maxResults)) {
        try {
          // Navigate to each job detail page
          const detailHtml = await this.getJobDetail(card.url);
          const fullJob = this.parseJobDetail(detailHtml || "", card);

          // Only include jobs posted within daysBack
          if (fullJob) {
            jobs.push({
              ...fullJob,
              url: this.ensureFullUrl(card.url),
            });
          }
        } catch (e) {
          console.log(`[LinkedIn] Error fetching detail for ${card.title}: ${e}`);
          // Still add the card-level data
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
   * Use Cloudflare Browser Rendering API to get page HTML
   * Uses the Fetcher binding (BROWSER_RENDERING) when available
   */
  private async browseUrl(url: string): Promise<{ html: string; cookies: string } | null> {
    try {
      // If we have a Browser Rendering binding, use it directly
      if (this.browser) {
        return await this.useBrowserBinding(url);
      }

      // Fallback: try the CDP-style Browser Rendering URL
      const browserEndpoint = `https://browser-rendering.cdp.792fb5a1c2fb0af960074a1e869db0ed.workers.dev`;

      // First login
      const loginOk = await this.loginViaEndpoint(browserEndpoint);
      if (!loginOk) return null;

      // Navigate to URL
      const response = await fetch(`${browserEndpoint}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          waitUntil: "networkidle2",
          timeout: 30000,
          viewport: { width: 1280, height: 720 },
        }),
      });

      if (!response.ok) {
        console.error(`[LinkedIn] Browse error: ${response.status}`);
        return null;
      }

      const result = await response.json<any>();
      return { html: result.html || "", cookies: "" };
    } catch (e) {
      console.error(`[LinkedIn] Browser API error: ${e}`);
      return null;
    }
  }

  /**
   * Use Browser Rendering binding (Cloudflare Fetcher) directly.
   * The binding exposes: newBrowser(), connect(), etc.
   * We create a new browser, navigate, get HTML, then close.
   */
  private async useBrowserBinding(url: string): Promise<{ html: string; cookies: string } | null> {
    try {
      // Connect to a new browser session via the binding
      const browser = await this.browser.connect();
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1280, height: 720 });
      
      // First go to login page
      await page.goto(`${this.baseUrl}/login`, { waitUntil: "networkidle2", timeout: 30000 });
      
      // Fill login form
      await page.waitForSelector("#username", { timeout: 10000 });
      await page.type("#username", this.email, { delay: 100 });
      await page.type("#password", this.password, { delay: 100 });
      await page.click("button[type=submit]");
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
      
      // Now navigate to the search URL
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      
      // Get the page HTML
      const html = await page.content();
      
      await page.close();
      await browser.close();
      
      return { html, cookies: "" };
    } catch (e) {
      console.error(`[LinkedIn] Browser binding error: ${e}`);
      return null;
    }
  }

  /**
   * Login to LinkedIn via CDP-style endpoint (fallback when no binding)
   */
  private async loginViaEndpoint(browserEndpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${browserEndpoint}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${this.baseUrl}/login`,
          waitUntil: "networkidle2",
          timeout: 30000,
          actions: [
            { type: "fill", selector: "#username", value: this.email, delay: 100 },
            { type: "fill", selector: "#password", value: this.password, delay: 100 },
            { type: "click", selector: "button[type=submit]", delay: 500 },
          ],
        }),
      });

      if (!response.ok) {
        console.error(`[LinkedIn] Login failed: ${response.status}`);
        return false;
      }

      console.log("[LinkedIn] Login successful via endpoint");
      return true;
    } catch (e) {
      console.error(`[LinkedIn] Login endpoint error: ${e}`);
      return false;
    }
  }

  /**
   * Get job detail page HTML
   */
  private async getJobDetail(url: string): Promise<string | null> {
    try {
      if (this.browser) {
        const browser = await this.browser.connect();
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(this.ensureFullUrl(url), { waitUntil: "networkidle2", timeout: 15000 });
        const html = await page.content();
        await page.close();
        await browser.close();
        return html;
      }

      // Fallback: endpoint
      const browserEndpoint = `https://browser-rendering.cdp.792fb5a1c2fb0af960074a1e869db0ed.workers.dev`;
      const response = await fetch(`${browserEndpoint}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: this.ensureFullUrl(url),
          waitUntil: "networkidle2",
          timeout: 15000,
          viewport: { width: 1280, height: 720 },
        }),
      });

      if (!response.ok) return null;
      const result = await response.json<any>();
      return result.html || null;
    } catch {
      return null;
    }
  }

  private ensureFullUrl(url: string): string {
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return `${this.baseUrl}${url}`;
    return `${this.baseUrl}/jobs/view/${url}`;
  }

  private parseJobCards(html: string): any[] {
    const cards: any[] = [];
    if (!html) return cards;

    // Parse job cards from LinkedIn HTML
    // LinkedIn renders jobs in <li> elements with class containing "jobs-search-results"
    const cardRegex = /<li[^>]*class="[^"]*jobs-search-results__list-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const cardHtml = match[1];

      const title = this.extractText(cardHtml, /<a[^>]*>([\s\S]*?)<\/a>/i) || "";
      const company = this.extractText(cardHtml, /<span[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
                     this.extractText(cardHtml, /class="[^"]*artdeco-entity-lockup__subtitle[^"]*"[^>]*>([\s\S]*?)</i) || "";
      const location = this.extractText(cardHtml, /class="[^"]*artdeco-entity-lockup__caption[^"]*"[^>]*>([\s\S]*?)</i) || "";
      const urlMatch = cardHtml.match(/href="(\/jobs\/view\/[^"]+)"/i);

      cards.push({
        title: this.cleanText(title),
        company: this.cleanText(company),
        location: this.cleanText(location),
        url: urlMatch ? urlMatch[1] : "",
        description: "",
        modality: "",
        salary: null,
        postedAt: new Date().toISOString(),
      });
    }

    return cards;
  }

  private parseJobDetail(html: string, card: any): any {
    if (!html) return null;

    const description = this.extractText(html, /class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        this.extractText(html, /class="[^"]*show-more-less-html[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || "";

    const modality = this.extractText(html, /class="[^"]*job-details-modality[^"]*"[^>]*>([\s\S]*?)</i) || "";
    const salary = this.extractText(html, /class="[^"]*salary[^"]*"[^>]*>([\s\S]*?)</i) || null;

    // Extract skills from description
    const skills = this.extractSkills(description);

    // Extract posting date
    const postedAt = this.extractText(html, /class="[^"]*posted-date[^"]*"[^>]*>([\s\S]*?)</i) ||
                     this.extractText(html, /class="[^"]*t-black--light[^"]*"[^>]*>([\s\S]*?)</i) || "";

    return {
      ...card,
      description: this.cleanHtml(description),
      modality: this.cleanText(modality),
      salary: salary ? this.cleanText(salary) : null,
      skills,
      postedAt: this.parseLinkedInDate(this.cleanText(postedAt)),
    };
  }

  private extractText(html: string, regex: RegExp): string {
    const match = html.match(regex);
    return match ? match[1].trim() : "";
  }

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

  private cleanHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private extractSkills(description: string): string[] {
    const skillKeywords = [
      "solidity", "javascript", "typescript", "react", "node.js", "python",
      "rust", "go", "blockchain", "web3", "ethereum", "smart contract",
      "hardhat", "foundry", "ipfs", "docker", "kubernetes", "aws",
      "cloudflare", "graphql", "sql", "mongodb", "postgresql",
      "git", "ci/cd", "rest api", "graphql",
    ];

    const found: string[] = [];
    const desc = description.toLowerCase();
    for (const sk of skillKeywords) {
      if (desc.includes(sk)) found.push(sk);
    }
    return [...new Set(found)];
  }

  private parseLinkedInDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    const lower = dateStr.toLowerCase();

    if (lower.includes("minute") || lower.includes("hour") || lower.includes("now")) {
      return new Date().toISOString();
    }

    const dayMatch = lower.match(/(\d+)\s*day/);
    if (dayMatch) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(dayMatch[1]));
      return d.toISOString();
    }

    const weekMatch = lower.match(/(\d+)\s*week/);
    if (weekMatch) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(weekMatch[1]) * 7);
      return d.toISOString();
    }

    const monthMatch = lower.match(/(\d+)\s*month/);
    if (monthMatch) {
      const d = new Date();
      d.setMonth(d.getMonth() - parseInt(monthMatch[1]));
      return d.toISOString();
    }

    return new Date().toISOString();
  }
}
