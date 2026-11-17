# Fase 12 — Release automático (CI de build e publicação)

Status: **aguardando validação**. Entregue: `.github/workflows/release.yml`, `scripts/release/` (versão e changelog), `scripts/bin-*.mjs` (binários do Windows na CI) e o bloco `publish` do `electron-builder.yml`. Falta, no GitHub e na sua máquina: os "Passos manuais" de `docs/empacotamento.md` (pacote `bin-v1`, permissões do Actions, proteção da `main`).

## Decisão de projeto
Não há PR de release nem passo manual (a ideia inicial era o `release-please`, descartada): **todo merge na `main` que traz `feat`, `fix` ou quebra de compatibilidade publica uma versão nova**; os outros tipos (`docs`, `chore`, `ci`, `test`, `refactor`, `perf`, `build`, `style`) esperam e entram no changelog do próximo release. Não há commit de volta na `main` (compatível com a proteção da branch): a versão é injetada só no build e o changelog vai nas notas do Release.

## Como funciona
1. Push na `main` dispara `release.yml`.
2. **Calcular versão** (`scripts/release/plan.mjs`): lê os commits desde a última tag `vX.Y.Z` (ignora `components-vN` e `bin-vN`), calcula a versão (`feat` MINOR, `fix` PATCH, quebra MINOR em `0.x` e MAJOR depois) e gera as notas agrupadas (quebras, novidades, correções, desempenho e "outras mudanças" recolhidas). Sem `feat`/`fix`/quebra: termina sem publicar.
3. **Lint, tipos e testes** (Jest, Vitest, `test:release`): um commit ruim na `main` não vira release.
4. **Instalador Windows** (`windows-latest`): `npm version` só no build, baixa o pacote `bin-v1` (Whisper e ffmpeg, SHA-256 conferido) e roda `dist:win --publish never`; gera `HomeLab-Setup-<versão>.exe`, `.blockmap` e `latest.yml`.
5. **AppImage Linux** (`ubuntu-22.04`): `dist:linux --publish never`; gera `HomeLab-<versão>.AppImage` e `latest-linux.yml`. O Whisper, o ffmpeg e o yt-dlp do Linux são baixados pelo assistente do app.
6. **Publicar**: só se os dois builds passaram, cria a tag e o Release `vX.Y.Z` (com `--latest`) com as notas e todos os arquivos.
- Rodar à mão: Actions > release > Run workflow com `dry_run` ligado mostra a versão e o changelog que sairiam, sem buildar.
- Só usa o `GITHUB_TOKEN` padrão; nenhum segredo do usuário entra na CI. Nunca assina o instalador.

## Testes
- `npm run test:release` (21 testes: parse de commit, escolha da última tag, regra de bump, notas, SHA-256 e exclusões do pacote de binários). Roda no `pr.yml` e antes de cada release.
- `node scripts/release/plan.mjs` na sua máquina mostra o release que sairia agora.
- O build das duas plataformas só roda na CI; a validação real é o primeiro release (abaixo).

## O que testar
1. Fazer os "Passos manuais no GitHub" (`docs/empacotamento.md`).
2. Actions > release > Run workflow (`dry_run` ligado): o resumo traz `v0.3.0` e o changelog dos commits desde `v0.2.0`.
3. Mergear um PR `docs:`: o workflow roda e termina sem release.
4. Mergear um PR `fix:`: em poucos minutos surge o Release com tag, notas, `.exe`, `.blockmap`, `latest.yml`, `.AppImage` e `latest-linux.yml`.
5. Instalar o `.exe` numa máquina limpa: abre, mostra a versão do Release em Configurações e acha Transcrição e Processamento de áudio embutidos.
6. No Linux, `chmod +x` no AppImage e abrir.

## Riscos
- Sem assinatura, o SmartScreen avisa no Windows.
- O primeiro build pode pedir ajuste fino (a validação local não roda o `electron-builder` completo do Windows com NSIS nem o do Linux).
- O repositório precisa continuar público.
