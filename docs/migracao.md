# Do front + back ao app desktop: decisões e próximos passos

O HomeLab (front React + back Nest) virou um **app desktop Electron com IPC**, instalável no Windows. A migração (antigas fases 00 a 10: casca Electron, infra IPC, configurações, IA, chat, biblioteca, livros, jobs, back e front dentro do desktop e empacotamento) **está concluída**; os arquivos por fase foram apagados porque descreviam trabalho já feito. O histórico fica no Git.

## Decisões que continuam valendo
- **Nest como contêiner de DI** no processo main (`createApplicationContext`): services e testes do back foram reaproveitados e os controllers viraram handlers IPC. Sem HTTP, sem porta, sem `.env`.
- **Handlers em classes** (SOLID), com constantes para canais, erros e mensagens. Ver `arquitetura.md`.
- **Contratos em `src/shared`**, usados por main, preload e renderer.
- **Settings no lugar do `.env`**, com `safeStorage` para segredos; o que faltar vira `NOT_CONFIGURED` e leva às Configurações. Ver `configuracoes.md`.
- **Providers separados**: externos (Gemini) e locais (Whisper, Ollama, ffmpeg).
- **Independência:** o desktop absorveu o código do back e do front e não lê mais `../back` nem `../front`; os dois repositórios antigos não têm manutenção e **não são editados**.
- **Persistência em disco** de jobs e chats, pasta-raiz única para backup. Ver `persistencia.md`.
- **Binários por plataforma** em `resources/bin/<plataforma>-<arch>/`; modelos e pacote CUDA são baixados pelo app. Ver `componentes.md` e `empacotamento.md`.
- Jobs continuam por polling de 1 s; o progresso detalhado vem na própria consulta.

## O que ainda falta (plano, em ordem)
| Fase | Entrega | Status |
|---|---|---|
| 11 | Validação do padrão de commits (commitlint, ganchos, CI) e proteção da `main` | pendente |
| 12 | CI de build e release automatizado (release-please, `.exe` no Release) | pendente |
| 13 | Atualização automática no app (aviso e download só da diferença) | pendente |

Cada fase tem um arquivo em `docs/fases/` com escopo, testes e checklist. Status: `pendente`, `em andamento`, `aguardando validação` (entregue, esperando o "ok") ou `concluída`. **Fase concluída tem o arquivo apagado**: o que ela deixou vira documentação de uso (`docs/*.md`) e o Git guarda o resto.

Convenção de versão e de mudanças (SemVer, Conventional Commits, branch + merge request): `versionamento.md`.

## Regra de entrega
- Uma fase por vez; a seguinte só começa com o "ok" do usuário.
- Cada fase entrega código, testes unitários, `docs/` atualizado e o roteiro "O que testar".
- Toda mudança segue o fluxo de `versionamento.md`: branch, commits no padrão e merge request.
- Ao terminar, a resposta diz que terminou e lista "O que testar".

## Pendências que não são fase
- **Linux e macOS:** falta o `whisper-cli` compilado e o ffmpeg de cada um (`resources/bin/linux-x64`, `darwin-arm64`), o catálogo de componentes deles e o build em cada sistema (matriz da CI, fase 12). A configuração do `electron-builder.yml` já existe.
- **Assinatura de código** do instalador (certificado pago); sem ela o SmartScreen avisa.
- **Download de vídeo** só aceita link direto http/https (sem YouTube).
- **`npm install --legacy-peer-deps`** por causa do peer do Babel entre Jest e o plugin React do Vite; decidir se resolve de outro jeito (a CI da fase 11 vai depender disso).
- O smoke E2E não cobre criar um job nem uma conversa real, e não roda com as mudanças recentes (assistente de instalação, conversa, modais).
