# Do front + back ao app desktop: decisões e próximos passos

O HomeLab (front React + back Nest) virou um **app desktop Electron com IPC**, instalável no Windows e executável no Linux (AppImage). A migração (casca Electron, infra IPC, configurações, IA, chat, biblioteca, livros, jobs, back e front dentro do desktop, empacotamento, validação de commits, release automático e atualização no app) **está concluída**; os arquivos por fase foram apagados porque descreviam trabalho já feito. O histórico fica no Git.

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

## Estado
Todas as fases estão **concluídas**. O que cada uma deixou virou documentação de uso em `docs/` (ver a tabela do `CLAUDE.md`): `versionamento.md` (commits e proteção da `main`), `empacotamento.md` (release automático e Linux) e `atualizacoes.md` (atualização no app). Mudanças novas seguem o fluxo de `versionamento.md`: branch, commits no padrão e merge request.

## Fora do escopo (decidido)
- **macOS:** não haverá build.
- **Assinatura de código** do instalador do Windows (certificado pago): não haverá; o SmartScreen avisa na instalação.
- **Atualização automática no Linux:** o AppImage só avisa e abre o Release.

## Pendências técnicas
- **`npm install --legacy-peer-deps`** por causa do peer do Babel entre Jest e o plugin React do Vite; decidir se resolve de outro jeito (a CI depende disso).
- O smoke E2E (14 testes) passa com o app atual, mas não cobre criar um job nem uma conversa real, nem o download de plataformas (a janela de login depende de um site real).
- O fluxo real de atualização no app (download só da diferença) se confirma quando houver dois releases seguidos com as próximas funcionalidades.
