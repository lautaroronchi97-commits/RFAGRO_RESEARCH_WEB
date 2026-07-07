# RF AGRO — Pizarra electrónica de granos

Web de research de mercado de granos (Argentina) para **RF AGRO — Consultora de granos**.
Doble uso: tablero para la mesa (datos varias veces por día, no realtime) + datos de cierre
para clientes (productores y acopios).

**Producción:** https://rfagro-research-web.vercel.app

> El contexto completo del proyecto (fuentes de datos, metodología de fórmulas, estado de
> módulos y pendientes) vive en [`docs/CONTEXTO.md`](docs/CONTEXTO.md).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · next-themes · gráficos SVG a mano ·
Deploy en Vercel · TZ `America/Argentina/Cordoba`.

## Comandos

```bash
npm run dev        # desarrollo (en el sandbox de Claude: NODE_USE_ENV_PROXY=1 npm run dev)
npm run build      # build de producción (incluye typecheck)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Node 22 (ver `.nvmrc`).

## Variables de entorno

Copiá `.env.local.example` como `.env.local` (git lo ignora) y completá:

| Variable | Qué es | Dónde vive |
|----------|--------|------------|
| `A3_API_BASE` | Base de la API del broker (A3/Cocos xOMS) | Vercel (Production) + `.env.local` |
| `A3_USERNAME` | Usuario del broker | Vercel (**solo Production**) |
| `A3_PASSWORD` | Contraseña del broker | Vercel (**solo Production**) |

**Nunca** commitear credenciales. En Vercel, scopeá los secretos a **Production** únicamente,
así los Preview deployments no tocan el broker.

## Flujo de trabajo con git (importante)

- **`main` = producción.** Vercel deploya a producción SOLO cuando se mergea a `main`.
- El trabajo diario va en ramas (`claude/...`). Cada push a una rama genera un
  **Preview deployment** con su URL propia — ahí se valida antes de publicar.
- Para publicar: abrir un **Pull Request** en GitHub → mirar el Preview → **Merge**.
  Al mergear, Vercel actualiza producción solo.
- Los pushes a ramas de trabajo **ya no cambian producción**.

## Estado

v0 — 7 módulos construidos; dólares/dólar futuro/dólar linked/volumen con **dato real**;
arbitrajes y pases con datos de **ejemplo** hasta conectar A3 + pizarra CAC (ver
`docs/CONTEXTO.md` → Pendientes).
