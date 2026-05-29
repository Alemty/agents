# 🤖 Job Agent

Agente IA de búsqueda y postulación automática a vacantes Web3/Blockchain.

**Stack:** Hono + Cloudflare Workers + D1 + TypeScript + IPFS/ENS  
**CI/CD:** GitHub Actions → Cloudflare Workers + IPFS Pinata (automático)

---

## 🚀 Deploy rápido

```bash
# 1. Login Cloudflare
npx wrangler login

# 2. Crear D1 database (si no existe)
npx wrangler d1 create jobs-db
# → Copia el database_id a wrangler.toml

# 3. Aplicar migración
npx wrangler d1 execute jobs-db --remote --file=migrations/001_initial.sql

# 4. Configurar secrets (ver sección abajo)
npx wrangler secret put PINATA_JWT
npx wrangler secret put LINKEDIN_EMAIL
npx wrangler secret put LINKEDIN_PASSWORD

# 5. Deploy
npm run deploy
```

---

## 🔐 Secrets & Variables de Entorno

| Variable | Dónde se usa | Cómo configurar |
|---|---|---|
| `PINATA_JWT` | GitHub Actions → IPFS deploy | `npx wrangler secret put PINATA_JWT` |
| `LINKEDIN_EMAIL` | Scraper LinkedIn | `npx wrangler secret put LINKEDIN_EMAIL` |
| `LINKEDIN_PASSWORD` | Scraper LinkedIn | `npx wrangler secret put LINKEDIN_PASSWORD` |
| `ANTHROPIC_API_KEY` | Matching mejorado (opcional) | `npx wrangler secret put ANTHROPIC_API_KEY` |
| `MATCH_THRESHOLD` | Threshold de matching | Config en `wrangler.toml` [vars] (default: 60) |
| `MAX_APPLICATIONS_DAY` | Límite diario de postulaciones | Config en `wrangler.toml` [vars] (default: 20) |

### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Para qué workflow |
|---|---|
| `PINATA_JWT` | `deploy-ipfs.yml` — subir ENS landing a IPFS |
| `CF_API_TOKEN` | `deploy.yml` — deploy Worker a Cloudflare |

> ⚠️ **Seguridad:** Los archivos `.env`, `.dev.vars` y sus variantes están en `.gitignore`.
> Usa `wrangler secret put` para producción o `.dev.vars` para desarrollo local.
> Referencia completa de variables en `.env.example` y `.dev.vars.example`.

---

## 📡 API Endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/` | GET | Health check / Dashboard SPA |
| `/stats` | GET | Estadísticas (vacantes, postulaciones, match) |
| `/jobs` | GET | Listar vacantes (`?platform=&minScore=&applied=&limit=`) |
| `/jobs/:id` | GET | Detalle de vacante |
| `/jobs` | POST | Agregar vacantes |
| `/jobs/:id` | PATCH | Actualizar vacante |
| `/match` | POST | Analizar match (`{title, description, skills}`) |
| `/applications` | GET | Listar postulaciones |
| `/applications` | POST | Registrar postulación |

---

## 🌐 ENS / IPFS

La landing page estática está en `ipfs/index.html` — 100% autocontenida.

| Ruta | Comportamiento |
|---|---|
| `alemty.eth.limo` | Landing page con stats + probador |
| `alemty.eth.limo/agents` | Redirige al Worker |
| `alemty.eth/agents` | Redirige al Worker |
| `agents.alemty.eth` | Redirige al Worker |

**Deploy a IPFS:** automático vía GitHub Actions (`deploy-ipfs.yml`) cuando haces push a `main`.

---

## 🧪 Probar matching

```bash
curl -X POST https://job-agent.alejandrogtzz93.workers.dev/match \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Solidity Developer",
    "description": "Smart contracts on Ethereum y Base. DeFi, DAOs, React frontend."
  }'
```

---

## 🗂️ Estructura del proyecto

```
├── src/
│   ├── index.ts              # Hono API
│   ├── db/schema.ts          # Tipos D1
│   └── matcher/matchEngine.ts # Motor de matching
├── public/
│   └── index.html            # Dashboard SPA (Worker assets)
├── ipfs/
│   └── index.html            # Landing page ENS/IPFS
├── migrations/
│   └── 001_initial.sql       # Schema D1
├── scripts/
│   ├── seed.js               # Seed script
│   └── seed.sql              # Seed SQL
├── .github/workflows/
│   ├── deploy.yml            # Deploy Worker a Cloudflare
│   └── deploy-ipfs.yml       # Deploy ENS landing a IPFS (Pinata)
├── .env.example              # Referencia de variables de entorno
├── .dev.vars.example         # Variables para desarrollo local
├── wrangler.toml             # Config Cloudflare Workers
└── package.json
```

---

## 📦 Scripts

```bash
npm run dev         # Desarrollo local (wrangler dev)
npm run deploy      # Deploy a Cloudflare
npm run ipfs        # Subir ipfs/ a IPFS manualmente
```

---

**Autor:** Alejandro Gutierrez Zavala (Alemty)
**URL:** https://job-agent.alejandrogtzz93.workers.dev
**Repo:** https://github.com/Alemty/agents
