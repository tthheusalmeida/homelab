# Lib (`src/lib`, `src/hooks`)

## `markdown.ts`
- `extractHeadings(markdown)` lista os títulos `#` a `###` (ignora código) com id único; `createHeadingIdGenerator` e `slugifyHeading` são usados também pela renderização para os ids coincidirem.

## Cliente IPC (`ipc.ts`)
- `ipc.invoke(canal, payload?)` chama `window.api` (preload) e desembrulha o `IpcResult`: sucesso devolve os dados, falha lança `IpcError` com a mensagem do main. Liga-se ao `window.api` só na chamada, para os componentes poderem ser testados sem o preload. Não existe mais `api()` com `fetch` nem `VITE_API_URL`.

## Query client
- `staleTime` 30 s e 1 retry por padrão.

## Formatadores (`format.ts`)
- `formatDuration(ms)`: `<1000` → `Xms`; `<60 s` → `Xs`; `<60 min` → `Xm`; senão `Xh`. Até 2 casas, sem zeros à direita.
- `formatNumber(n)`: `K` (≥1.000), `M` (≥1.000.000), `B` (≥1.000.000.000); até 2 casas.
- `formatDate` / `formatDateTime`: pt-BR. Strings `YYYY-MM-DD` são tratadas como data **local** (não desloca o dia por fuso).
- `formatServiceName`: `api` → "API"; demais com a inicial maiúscula.

## `normalizeKey(text)` (`text.ts`)
- Ignora maiúscula, acento e espaços extras ao comparar nomes (categorias, tags). Mesma regra do back.

## `useDebouncedValue(value, delay = 300)`
- Devolve o valor só depois de `delay` ms sem mudar (usado na pesquisa da biblioteca).

## `cn(...)`
- Junta classes (`clsx`) e resolve conflitos do Tailwind (`tailwind-merge`); a última vence.

## `useIsMobile`
- Verdadeiro quando a largura da janela é menor que 768 px; reage à mudança da media query e remove o listener ao desmontar.
