<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

## Regras do Projeto QuickPick

### Supabase RLS (Row Level Security)
- **NUNCA** use `createAdminClient` / service role para contornar políticas RLS como workaround de frontend.
- Quando uma query falhar por RLS, **sempre peça ao usuário para rodar o SQL correto no Supabase** e escreva a migration adequada em `supabase/migrations/`.
- Políticas RLS devem ser as mais restritivas e corretas possíveis para evitar vazamento de dados.
### Performance (INP)
- **Otimização de Listas**: Em componentes como o `MenuClient` que renderizam muitos itens, use `useDeferredValue` para o estado de busca/filtro. Isso garante que a digitação continue rápida enquanto o React renderiza os resultados filtrados em segundo plano.
- **Memoização**: Sempre use `React.memo` para componentes de cartão em listas grandes (ex: `MenuItemCard`) e `useCallback` para as funções passadas a eles.
- **Renderização**: Evite lógica pesada síncrona dentro do loop de renderização. Mova cálculos complexos para `useMemo`.
- **Imagens**: Limite o carregamento de imagens pesadas e use as propriedades de otimização do Next.js.

### Escalabilidade de Dados (Postgres/Supabase)
- **Índices**: Sempre carregue índices para Colunas de Chave Estrangeira (FKs) e colunas usadas frequentemente em filtros (`WHERE`) e ordenações (`ORDER BY`).
- **RLS Otimizado**: Mantenha as políticas simples e use funções `SECURITY DEFINER` para evitar loops de recursão no banco.
- **Paginação**: Nunca retorne listas completas do Supabase se o volume de dados esperado for grande. Use `.range(from, to)` para carregar os dados sob demanda.
