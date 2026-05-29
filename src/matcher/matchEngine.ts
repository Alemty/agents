export interface JobInput {
  title: string;
  description: string;
  skills?: string[];
}

export interface MatchResult {
  score: number;
  matched: string[];
  missing: string[];
  analysis: string;
  keywordHits: number;
  penalized: boolean;
  categoriesCovered: number;
}

export class MatchEngine {
  private profile = {
    name: "Alejandro de Jesus Gutierrez Zavala",
    alias: "Alemty / dieresys",
    location: "Monterrey, Nuevo León, México",
    title: "Full-Stack Web3 Builder & Blockchain Developer",
    summary: "Builder web3 mexicano, fundador de alemtyDAO. Experiencia como Microsoft Trainer y Honor Sr Supervisor. Especializado en DAOs, NFTs, DeFi, contratos inteligentes, agentes IA, y realidad aumentada descentralizada.",

    skills: [
      { name: "Solidity", level: "advanced", category: "blockchain" },
      { name: "Smart Contracts", level: "advanced", category: "blockchain" },
      { name: "Ethereum", level: "advanced", category: "blockchain" },
      { name: "Base Chain", level: "advanced", category: "blockchain" },
      { name: "Hardhat", level: "advanced", category: "blockchain" },
      { name: "Ethers.js / Web3.js", level: "advanced", category: "blockchain" },
      { name: "IPFS", level: "advanced", category: "blockchain" },
      { name: "ENS", level: "advanced", category: "blockchain" },
      { name: "ERC-20 / ERC-721 / ERC-1155", level: "advanced", category: "blockchain" },
      { name: "ECDSA / Keccak256", level: "intermediate", category: "blockchain" },
      { name: "Tokenomics", level: "advanced", category: "blockchain" },
      { name: "DeFi", level: "advanced", category: "blockchain" },
      { name: "DAO Governance", level: "advanced", category: "blockchain" },
      { name: "React", level: "advanced", category: "frontend" },
      { name: "JavaScript", level: "advanced", category: "frontend" },
      { name: "TypeScript", level: "advanced", category: "frontend" },
      { name: "HTML/CSS", level: "advanced", category: "frontend" },
      { name: "Leaflet.js", level: "intermediate", category: "frontend" },
      { name: "Tailwind CSS", level: "intermediate", category: "frontend" },
      { name: "Node.js", level: "advanced", category: "backend" },
      { name: "Hono", level: "advanced", category: "backend" },
      { name: "Cloudflare Workers", level: "advanced", category: "infra" },
      { name: "D1 (SQLite)", level: "advanced", category: "backend" },
      { name: "REST APIs", level: "advanced", category: "backend" },
      { name: "RPCs", level: "advanced", category: "blockchain" },
      { name: "AI Agents", level: "intermediate", category: "ai" },
      { name: "LLM Integration", level: "intermediate", category: "ai" },
      { name: "Web Scraping", level: "intermediate", category: "automation" },
      { name: "Browser Automation", level: "intermediate", category: "automation" },
      { name: "Git", level: "advanced", category: "devops" },
      { name: "GitHub Actions", level: "intermediate", category: "devops" },
      { name: "Wrangler", level: "advanced", category: "devops" },
      { name: "Docker", level: "basic", category: "devops" },
      { name: "Microsoft Trainer", level: "advanced", category: "soft" },
      { name: "Team Leadership", level: "advanced", category: "soft" },
      { name: "AR/VR", level: "intermediate", category: "emerging" },
      { name: "OVRLands", level: "intermediate", category: "emerging" },
    ],

    experience: [
      { title: "Founder & Lead Developer", company: "alemtyDAO", period: "2024 - Presente", description: "DAO descentralizada multi-chain. Stack: Solidity, React, Hono, D1, CDP SDK." },
      { title: "Microsoft Trainer", company: "Microsoft", period: "", description: "Instructor técnico certificado. Formación en tecnologías cloud, desarrollo, y herramientas Microsoft." },
      { title: "Honor Sr Supervisor", company: "", period: "", description: "Supervisión de equipos, gestión operativa, mentoría técnica." },
    ],

    achievements: [
      "Fundé alemtyDAO con contratos inteligentes propios",
      "Implementé reclaim automático de tokens AURA on-chain sin MetaMask (ECDSA inline)",
      "Migré certificaciones y assets a IPFS (Pinata)",
      "Construí sistema de chat DM, marketplace P2P, y glass stats",
      "Implementé mapas interactivos de OVRLands con Leaflet",
      "Arquitectura multi-subdominio con Cloudflare Workers (D1, KV, R2)",
      "Más de 470 commits en alemtyDAO",
    ],
  };

  private keywords = [
    "web3", "blockchain", "smart contracts", "solidity", "full stack",
    "javascript", "node.js", "react", "cloudflare", "typescript",
    "dapp", "dao", "nft", "defi", "tokenomics", "ethereum",
    "base chain", "ipfs", "ens", "ai agent", "artificial intelligence",
    "machine learning", "llm", "chatbot", "automation",
    "microsoft trainer", "technical trainer", "devrel",
    "web3 developer", "react developer", "fullstack developer",
  ];

  private exclude = [
    "senior accountant", "cajero", "reponedor",
    "auxiliar administrativo", "secretaria", "conductor", "mensajero",
  ];

  private skillVariants: Record<string, string[]> = {
    solidity: ["solidity", "solidity developer", "solidity engineer"],
    "smart contracts": ["smart contract", "smart contracts", "contract development"],
    ethereum: ["ethereum", "eth", "evm"],
    "base chain": ["base", "base chain", "coinbase base"],
    hardhat: ["hardhat", "hardhat framework", "foundry"],
    javascript: ["javascript", "js", "ecmascript"],
    typescript: ["typescript", "ts"],
    react: ["react", "react.js", "reactjs"],
    "node.js": ["node", "node.js", "nodejs", "express"],
    "cloudflare workers": ["cloudflare", "cloudflare workers", "workers"],
    ipfs: ["ipfs", "interplanetary file system", "pinata"],
    ens: ["ens", "ethereum name service"],
    dao: ["dao", "daos", "governance"],
    nft: ["nft", "nfts", "erc-721", "erc-1155"],
    tokenomics: ["tokenomics", "token economy"],
    defi: ["defi", "decentralized finance", "lending", "swap", "amm"],
    "ai agents": ["ai agent", "ai agents", "autonomous agent", "intelligent agent"],
    git: ["git", "github", "version control"],
    "rest apis": ["rest", "rest api", "api", "apis", "endpoint"],
    web3: ["web3", "web 3", "dapp", "decentralized application"],
    blockchain: ["blockchain", "distributed ledger", "on-chain", "chain"],
  };

  private categoryWeights: Record<string, number> = {
    blockchain: 2.5,
    frontend: 1.5,
    backend: 1.5,
    infra: 1.2,
    ai: 1.0,
    automation: 1.0,
    devops: 0.8,
    soft: 0.5,
    emerging: 0.6,
  };

  private titleKeywords = [
    "solidity", "smart contract", "blockchain", "web3", "defi",
    "ethereum", "dao", "nft", "contract", "dapp",
    "full stack", "fullstack", "web3 developer", "solidity developer",
  ];

  private emergingDemand = [
    "python", "rust", "go", "graphql", "kubernetes", "redis",
    "aws", "azure", "machine learning", "deep learning",
    "tensorflow", "pytorch", "langchain", "zero knowledge",
    "zkp", "account abstraction", "layer 2", "zksync", "arbitrum",
    "the graph", "chainlink", "postgresql",
  ];

  calculateMatch(job: JobInput): MatchResult {
    const { title, description, skills: jobSkills } = job;
    const text = `${title} ${description}`.toLowerCase();
    const jobSkillSet = new Set((jobSkills || []).map((s) => s.toLowerCase()));

    let matchedSkills: string[] = [];
    let totalWeight = 0;
    let earnedWeight = 0;
    let matchedCategories: Record<string, number> = {};

    for (const skill of this.profile.skills) {
      const skillName = skill.name.toLowerCase();
      const cat = skill.category;
      const catWeight = this.categoryWeights[cat] || 1.0;
      const weight = (skill.level === "advanced" ? 3 : skill.level === "intermediate" ? 2 : 1) * catWeight;
      totalWeight += weight;

      const variants = this.getVariants(skillName);
      let found = false;

      for (const v of variants) {
        if (text.includes(v)) { found = true; break; }
      }

      if (!found) {
        for (const js of jobSkillSet) {
          if (js.includes(skillName) || skillName.includes(js)) {
            found = true;
            break;
          }
        }
      }

      if (found) {
        matchedSkills.push(skill.name);
        earnedWeight += weight;
        matchedCategories[cat] = (matchedCategories[cat] || 0) + 1;
      }
    }

    const categoriesCovered = Object.keys(matchedCategories).length;
    const totalCategories = Object.keys(this.categoryWeights).length;
    const categoryBonus = Math.min((categoriesCovered / totalCategories) * 20, 20);

    let keywordHits = 0;
    for (const kw of this.keywords) {
      if (text.includes(kw.toLowerCase())) keywordHits++;
    }
    const keywordScore = Math.min((keywordHits / 20) * 100, 30);

    // Title bonus
    const titleLower = title.toLowerCase();
    let titleBonusCount = 0;
    for (const kw of this.titleKeywords) {
      if (titleLower.includes(kw)) titleBonusCount++;
    }
    const titleScore = Math.min(titleBonusCount * 5, 20);

    const skillScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 50 : 0;
    const rawScore = Math.round(skillScore + categoryBonus + keywordScore + titleScore);

    const missing = this.detectMissing(text, matchedSkills);
    const penalized = this.exclude.some((excl) => text.includes(excl));
    const finalScore = penalized ? Math.round(rawScore * 0.3) : Math.min(rawScore, 100);

    const analysis = `Match: ${finalScore}% | Skills matched: ${matchedSkills.length} | Missing: ${missing.slice(0, 3).join(", ") || "none"}`;

    return {
      score: finalScore,
      matched: [...new Set(matchedSkills)],
      missing,
      analysis,
      keywordHits,
      penalized,
      categoriesCovered,
    };
  }

  private getVariants(name: string): string[] {
    return this.skillVariants[name] || [name];
  }

  private detectMissing(text: string, alreadyMatched: string[]): string[] {
    const missing: string[] = [];
    for (const skill of this.emergingDemand) {
      if (text.includes(skill)) {
        const already = alreadyMatched.some((m) => m.toLowerCase().includes(skill));
        if (!already && !missing.includes(skill)) missing.push(skill);
      }
    }
    return missing;
  }

  getProfile() {
    return this.profile;
  }
}
