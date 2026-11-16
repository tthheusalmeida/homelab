# Fase 12 — CI de build e release automatizado

Status: pendente (planejada; depende da fase 11)

## Objetivo
Juntar vários merge requests num release só e publicar tudo sem passos manuais: a versão, o changelog, a tag, o Release no GitHub e o instalador `.exe` anexado.

## Como funciona (ferramenta escolhida: `release-please`)
1. Cada MR entra na `main` com título em Conventional Commits (fase 11).
2. O `release-please` lê os commits novos e mantém **um MR de release aberto**, que é a "coleção" das mudanças: ele calcula a próxima versão pelo SemVer (`feat` → MINOR, `fix` → PATCH, `!` → quebra), atualiza `package.json`, `package-lock.json` e o `CHANGELOG.md` (agrupado por tipo).
3. Quando o usuário **aprova e faz merge desse MR de release**, o `release-please` cria a tag `v<versão>` e o Release no GitHub com as notas.
4. A criação do Release dispara o workflow de build, que gera o instalador e o anexa ao próprio Release.

Alternativas descartadas: `semantic-release` (publica a cada merge, sem o MR de revisão da coleção) e `changesets` (pede um arquivo manual por mudança).

## Escopo
- **`.github/workflows/release-please.yml`**: roda no push para a `main`; `release-type: node`; `release-please-config.json` e `.release-please-manifest.json` (começam na versão atual do `package.json`). Regra pré-1.0: quebra sobe o MINOR (`bump-minor-pre-major`).
- **`.github/workflows/build.yml`** (gatilho `release: published`): matriz com `windows-latest` agora (Linux e macOS entram quando houver binários, ver pendências):
  1. `npm ci --legacy-peer-deps`, testes, `npm run dist:win`;
  2. anexa ao Release `HomeLab-Setup-<versão>.exe`, o `.blockmap` e o `latest.yml` (os dois últimos são o que a fase 13 usa);
  3. nunca assina (sem certificado) e nunca publica fora do Release.
- **Binários nativos na CI:** `resources/bin` não é versionado. O workflow precisa de uma etapa que baixe o Whisper e o ffmpeg de um Release de componentes do repositório (ex.: `bin-v1`, com SHA-256 conferido), igual ao que o app faz com o CUDA e os modelos. Sem isso o build da CI sai sem Whisper e sem ffmpeg.
- **Cache** do `node_modules` e do cache do `electron-builder`.
- **Segredos:** só o `GITHUB_TOKEN` padrão; nenhum segredo do usuário (chave do Gemini, e-mail) entra na CI.
- **Documentação:** `docs/empacotamento.md` (como a CI gera o instalador e como gerar na mão) e `docs/versionamento.md` (passo 6 deixa de ser manual).
- Fora do escopo: assinatura de código (certificado pago), builds de Linux e macOS (precisam dos binários deles), publicação em lojas.

## Testes
- `release-please` em modo de teste (`--dry-run`) numa branch: mostra a versão e o changelog esperados para os commits de exemplo.
- Workflow de build rodado manualmente (`workflow_dispatch`) numa tag de teste, em repositório de teste ou num Release em rascunho.
- Conferir que o `.exe` gerado pela CI abre, mostra a versão certa e acha o Whisper e o ffmpeg embutidos.

## O que testar
1. Mergear um MR `fix: ...` e um `feat: ...`: aparece um MR de release com a versão MINOR esperada e o changelog dos dois.
2. Mergear o MR de release: surge a tag `v<versão>` e o Release com as notas.
3. Em poucos minutos o Release recebe o `.exe`, o `.blockmap` e o `latest.yml`.
4. Instalar o `.exe` do Release numa máquina limpa e abrir.

## Critério de aceite
Um release completo (versão, changelog, tag, Release e instalador) sai só de mergear um MR, sem rodar comando na máquina do usuário.

## Riscos e decisões a tomar
- Onde guardar os binários que a CI baixa (Release `bin-vN` do próprio repositório é o plano); tamanho do cache e tempo do build (CUDA é pesado: o instalador já não o leva).
- O repositório precisa continuar público (o app e a CI baixam sem token).
- Sem assinatura, o SmartScreen continua avisando.
