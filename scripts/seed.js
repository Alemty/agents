/**
 * Seed script — adds sample jobs to test the matching engine
 * Usage: npx wrangler d1 execute jobs-db --remote --file=scripts/seed.sql
 */

const jobs = [
  {
    id: 'test-001', platform: 'manual', title: 'Senior Smart Contract Developer (DeFi)',
    company: 'Base Ecosystem', location: 'Remote',
    description: 'We are looking for an experienced Solidity developer to build DeFi protocols on Base chain. Experience with Ethereum, ERC-20 tokens, Hardhat, and React frontend. Knowledge of DAOs and tokenomics is a plus. Remote position.',
    skills: ['Solidity', 'Ethereum', 'DeFi', 'Hardhat', 'React', 'TypeScript'],
    url: 'https://linkedin.com/jobs/view/1',
  },
  {
    id: 'test-002', platform: 'manual', title: 'Full Stack Web3 Engineer',
    company: 'Web3 Studio', location: 'Remote',
    description: 'Build dApps from smart contracts to frontend. Required: JavaScript, Node.js, React, Solidity, blockchain, ethereum. Bonus: IPFS, ENS, Cloudflare Workers, AI agents, DAOs, NFTs.',
    skills: ['JavaScript', 'React', 'Node.js', 'Solidity', 'TypeScript'],
    url: 'https://linkedin.com/jobs/view/2',
  },
  {
    id: 'test-003', platform: 'manual', title: 'Blockchain Developer — DeFi Protocols',
    company: 'DeFi Labs', location: 'Remote',
    description: 'Solidity smart contract developer for DeFi protocols on Ethereum and Base. Build lending pools, AMMs, token bridges. Full stack: frontend in React, backend in Node.js. DAO governance integration.',
    skills: ['Solidity', 'Ethereum', 'React', 'Node.js', 'DeFi', 'Hardhat'],
    url: 'https://linkedin.com/jobs/view/3',
  },
  {
    id: 'test-004', platform: 'manual', title: 'Desarrollador Contador General',
    company: 'Empresa MX', location: 'Monterrey',
    description: 'Experiencia en contabilidad general, facturación electrónica, impuestos, nóminas. Office avanzado.',
    skills: ['Excel', 'Contabilidad'],
    url: 'https://indeed.com/view/1',
  },
];

async function seed(env) {
  const db = env.DB;
  for (const job of jobs) {
    const { MatchEngine } = await import('./matcher/matchEngine');
    const engine = new MatchEngine();
    const match = engine.calculateMatch(job);

    await db.prepare(`INSERT OR REPLACE INTO jobs
      (id, platform, title, company, location, description, url, skills_json, match_score, matched_skills_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(job.id, job.platform, job.title, job.company, job.location, job.description, job.url,
        JSON.stringify(job.skills), match.score, JSON.stringify(match.matched))
      .run();
  }
  console.log('✅ Seeded', jobs.length, 'jobs');
}

export { seed };
export default seed;
