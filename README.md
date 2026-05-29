# 🤖 Job Agent — Cloudflare Worker

Backend API para el agente IA de postulación automática a vacantes.

Stack: **Hono** + **D1** (SQLite) + **Cloudflare Workers** + **TypeScript**

## Deploy rápido

```bash
# 1. Login a Cloudflare
npx wrangler login

# 2. Crear D1 database
npx wrangler d1 create jobs-db
# → Copia el database_id a wrangler.toml

# 3. Aplicar migración
npx wrangler d1 execute jobs-db --remote --file=migrations/001_initial.sql

# 4. Deploy
npm run deploy

# 5. (Opcional) Seed test data
npx wrangler d1 execute jobs-db --remote --command="$(cat migrations/001_initial.sql)"
```

## Endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/` | GET | Health check |
| `/jobs` | GET | Listar vacantes (filtros: `?platform=&minScore=&applied=&limit=`) |
| `/jobs/:id` | GET | Detalle de vacante |
| `/jobs` | POST | Agregar vacantes (array o single) |
| `/jobs/:id` | PATCH | Actualizar (applied, match_score, cv_path) |
| `/applications` | GET | Listar postulaciones |
| `/applications` | POST | Registrar postulación |
| `/match` | POST | Analizar match (body: title, description, skills) |
| `/stats` | GET | Estadísticas generales |

## Dashboard

El frontend estático se sirve desde `/` cuando assets están configurados.

## Variables de entorno (secrets)

```bash
npx wrangler secret put LINKEDIN_EMAIL
npx wrangler secret put LINKEDIN_PASSWORD
npx wrangler secret put ANTHROPIC_API_KEY
```

## Dev local

```bash
npm run dev
# → http://localhost:8787
```
