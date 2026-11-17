# Download de vídeos de plataformas (yt-dlp)

O app baixa de dois jeitos. O que decide é o link (`isDirectMediaUrl`, em `src/shared/media-url.ts`):
- **Link direto** (termina em `.mp4`, `.mkv`, `.webm`, `.mp3`...): download HTTP próprio do `VideoService`, como sempre foi.
- **Qualquer outro link** (YouTube, Vimeo, páginas de curso): `PlatformDownloader` chama o **yt-dlp**, que baixa **só o áudio** (`-f bestaudio/best`), que é o que a transcrição usa. O pipeline continua igual: o `ffmpeg` converte o arquivo baixado (`.webm`, `.m4a`...) para WAV.

Só `http` e `https` são aceitos; outro protocolo falha com "Informe um link que comece com http:// ou https://".

## O componente yt-dlp
É um item do catálogo (`kind: 'binary'`, grupo `download`, `src/components/component-manifest.ts`): um `.exe` único (~22 MB) baixado do Release oficial do yt-dlp para a pasta de binários, com SHA-256 conferido. **Vem pré-marcado no assistente de instalação** (`recommendFor` o acrescenta a qualquer hardware) e pode ser instalado ou removido em Configurações > Componentes. Sem ele, um link de plataforma falha com a orientação de instalá-lo; link direto continua funcionando.

Os sites mudam e o yt-dlp quebra de tempos em tempos. Por isso, se um download falha por outro motivo que não login, o app roda `yt-dlp -U` (ele se atualiza no lugar) e tenta **uma vez** de novo. A versão do catálogo (`YTDLP_VERSION`) só importa na primeira instalação.

## Aviso ao usuário
Os formulários de **transcrever** e **resumir** usam o mesmo `VideoUrlField`, que mostra, abaixo do campo, um aviso curto e amigável: baixar de plataformas como o YouTube pode ir contra os termos de uso delas, e quem usa o recurso está ciente e assume o risco. Links diretos para o arquivo não têm essa questão. O texto fica em `renderer/src/pages/jobs/create/video-url-text.ts`.

## Vídeos que exigem login
1. O yt-dlp recusa (mensagens como "Sign in", "Private video", "HTTP Error 401/403", "members-only"; lista em `ACCESS_HINTS`; também "Unsupported URL" quando o endereço recusado é uma tela de login, caso das páginas de curso como o Canvas, que redirecionam quem não entrou). O downloader lança `AccessRequiredError` com o link.
2. O `JobRunner` falha o job com a mensagem amigável e grava `errorInfo { code: 'ACCESS_REQUIRED', url }` (vai para o `jobs.json`; `JobView` expõe `errorCode` e `accessUrl`).
3. O card do job mostra **Entrar no site**. O botão chama `jobs:grant-access`, que abre uma **janela do app** com a página do vídeo (`platform-login-window.ts`): partição própria `platform-login`, **só em memória** (separada do app, nada vai para o disco em texto puro), sem Node, sem preload, com sandbox, navegando só por http/https. O usuário entra como faria no navegador e **fecha a janela**.
4. Ao fechar, `PlatformSessions.openLogin` **guarda os logins cifrados** (`CookieVault` → `SecretStore`, chave `platform.cookies`, `safeStorage`/DPAPI no Windows, em `secrets.json`) e confere se há cookies do site. Na próxima vez que a janela abrir, os logins guardados são recolocados nela (`restorePlatformCookies`): quem já entrou **não precisa entrar de novo**, até o site expirar a sessão. Sem cookie, a tela avisa e não tenta de novo. Com cookie, a tela chama `jobs:retry` e cria o job de novo.
5. No download, `PlatformSessions.cookiesFor()` grava os logins guardados num arquivo temporário (formato Netscape, `<userData>/cookies-temp`, permissão 0600), o yt-dlp o lê com `--cookies` e o arquivo é **apagado em seguida**, mesmo se o download falhar. O yt-dlp só envia a cada site os cookies que são dele.

**Logins do navegador principal (`--cookies-from-browser`)**: antes de pedir login, o downloader tenta uma vez de novo com `--cookies-from-browser <navegador padrão>` (detectado pelo registro do Windows em `platform/default-browser.ts`). Funciona quando o yt-dlp consegue abrir os cookies, como no Firefox. **No Chrome e no Edge recentes não funciona** (testado: "Could not copy Chrome cookie database"): o banco fica travado com o navegador aberto e, mesmo fechado, a criptografia "app-bound" (Chrome 127+) impede a leitura. Nesse caso o job cai no fluxo da janela do app, descrito acima.

## Páginas de curso que o yt-dlp não reconhece (Canvas)
Quando o yt-dlp responde "Unsupported URL" para a própria página (e não para uma tela de login), o downloader procura o vídeo no HTML:
1. `findMediaInPage` (`main/media-finder.ts`) abre a página numa **janela invisível** (mesma sessão do login, com os logins guardados recolocados; isolada, muda, só http/https) e, por até 20 s, roda um script em **todos os quadros**, inclusive iframes de outros domínios como o player do Canvas, lendo `video.currentSrc`/`src` e `<source src>` (`platform/page-media.ts`). `blob:` e `data:` são ignorados.
2. Se não achar tag de vídeo, usa os iframes (podem ser YouTube, Vimeo etc.). Se a página parou numa tela de login (`isLoginPageUrl`), vira `AccessRequiredError` (botão **Entrar no site**).
3. Cada endereço achado vai ao yt-dlp, com `--referer <página>` e os cookies guardados, até um funcionar. Os cookies renovados pela página são guardados de novo no cofre.
Se a página não tem vídeo: "Não encontrei nenhum vídeo nesta página". Player que só entrega `blob:` (MSE) sem endereço de arquivo ou playlist não é alcançado.

## Limites conhecidos
- **DRM** (Netflix, Hotmart, Udemy e similares): não funciona e não há o que fazer.
- Login do **Google** costuma recusar navegador embutido; portais de faculdade (Moodle, Canvas, Blackboard) funcionam bem.
- Login com segundo fator: o usuário faz tudo na janela, mas a sessão pode expirar e pedir de novo.
- Os logins guardados ficam cifrados em `secrets.json` (chave `platform.cookies`). Para esquecê-los: **Configurações > Acessos > Esquecer logins** (canal `platform:forget-logins`; apaga o cofre e a sessão aberta). Se o sistema não tiver criptografia disponível, o login não é guardado e o app avisa o erro (o `secrets.json` nunca recebe texto puro).
- Windows (`yt-dlp.exe`) e Linux (`yt-dlp_linux`, com permissão de execução dada pelo app depois do download) já estão no catálogo. O nome mostrado ao usuário é só "Download de vídeos".

## Onde está o código
- `src/shared/media-url.ts`: `isDirectMediaUrl`, `isHttpUrl`.
- `src/back/modules/video/`: `platform-downloader.ts` (yt-dlp, erros, atualização), `access-required.error.ts`, `video.service.ts` (decide o caminho).
- `src/back/modules/jobs/domain/job.entity.ts`: `errorInfo`; `job-runner.service.ts` grava o código.
- `src/platform/`: `netscape-cookies.ts` (formato do arquivo), `platform-sessions.ts` (login e cookies).
- `src/main/platform-login-window.ts`: janela e sessão do Electron.
- `src/jobs/job-access.ts` e canal `jobs:grant-access`.
- `src/providers/ytdlp-binary-resolver.ts`: onde está o programa instalado.
