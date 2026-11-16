# Componentes e assistente de instalação

O instalador é pequeno (app, Whisper em CPU e ffmpeg). O que é grande (modelos do Whisper e o pacote CUDA) é baixado **pelo app**, com progresso, checksum e escolha do usuário. O instalador NSIS não passa de ~2 GB, por isso isso não entra nele.

## Catálogo (`src/components/component-manifest.ts`)
Uma entrada por componente: `id`, `group` (`runtime`, `download`, `gpu`, `model`), `label`, `description`, `required`, `kind`, tamanho, arquivo que prova a instalação e, se baixável, `download: { url, sha256 }`.
- `bundled`: já vem no instalador (Whisper, ffmpeg); só é conferido.
- `file`: arquivo baixado para `<userData>/components/models`.
- `zip`: pacote baixado e extraído ao lado do `whisper-cli` (pacote CUDA); `provides` lista os arquivos esperados.
- `binary`: programa único baixado direto para a pasta de binários (o `yt-dlp.exe`, ver `download-de-videos.md`); a detecção olha se o arquivo existe, então o programa pode se atualizar sozinho sem o catálogo notar.

**Para acrescentar uma dependência, acrescente uma entrada no catálogo**: o assistente, a seção das Configurações e a lista da sidebar a mostram sozinhos.

Origens: modelos em `huggingface.co/ggerganov/whisper.cpp` (SHA-256 vindos da API do Hugging Face); pacote CUDA no Release `components-v1` do repositório (arquivo `whisper-cuda12-win32-x64.zip`, gerado a partir de `resources/bin/win32-x64`). O repositório precisa ser público para o download sem token.

## Serviço (`ComponentsService`)
- `status()`: estado de cada item (`missing`, `queued`, `downloading`, `verifying`, `installing`, `installed`, `failed`), hardware, progresso geral e `needsSetup` (falta obrigatório ou nenhum modelo).
- `install(ids)`: uma instalação por vez; baixa em fluxo para `.part`, confere o SHA-256 e só então grava; zip é extraído e apagado. Um item que falha não impede os seguintes. `cancel()` apaga o parcial.
- `remove(id)`: só opcionais; o modelo em uso não sai. `setActiveModel(id)`.
- Modelo ativo (`components.json` em userData): o escolhido ou o primeiro instalado. O Whisper recebe o caminho completo dele (`activeModelRef`).
- Sem permissão de gravação, `PERSIST_FAILED` com a pasta no texto.

## Placa de vídeo (`hardware.ts`)
`detectHardware` lê as placas (PowerShell `Win32_VideoController`) e corrige a memória de placas NVIDIA com `nvidia-smi`. `recommendFor` (função pura) escolhe:
- NVIDIA dedicada com 6 GB ou mais: CUDA + large-v3-turbo; 3 a 6 GB: CUDA + turbo compacto; menos: CUDA + small.
- Sem NVIDIA: CPU, turbo compacto com 15 GB de RAM ou mais, senão small. Placa integrada é citada na mensagem.
- Nada identificado: CPU + small, com mensagem de "não identificamos".
- Em qualquer caso, `recommendFor` acrescenta o `yt-dlp` (vale para qualquer máquina e não depende da placa).
A mensagem em português vai ao usuário junto com a pré-seleção.

## Interface
- `InstallAssistant` (app principal): abre sozinho quando `needsSetup`; mostra o hardware, a lista com a recomendação marcada e, ao instalar, o progresso geral e de cada item. "Agora não" fecha.
- `SidebarSetupProgress`: cartão acima de Configurações com "Instalando n de N" e a porcentagem, ou o lembrete de concluir; clicar abre Configurações > Componentes.
- Configurações > Componentes (`ComponentsSection`): o mesmo `ComponentChecklist`, com Usar e Remover por item e Instalar selecionados.
- `ComponentChecklist`, `HardwareCard`, `lib/components-text.ts` e `hooks/use-components.ts` são a fonte única nas duas janelas.

## IPC
Canais `components:status|install|cancel|remove|set-active-model`, evento `components:progress` (o `ComponentsStatus` inteiro), `app:open-settings` com `{ section }` e `app:settings-section` (a janela lê a seção pedida ao abrir) mais o evento `settings:navigate` (janela já aberta). Ver `ipc-canais.md`.

## Pendente
Publicar o `.zip` do CUDA no Release `components-v1`; sem ele o item CUDA falha com 404. Linux e macOS terão catálogo próprio.
