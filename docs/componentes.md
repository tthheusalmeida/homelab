# Componentes e assistente de instalação

O instalador é pequeno (app, Whisper em CPU e ffmpeg). O que é grande (modelos do Whisper e o pacote CUDA) é baixado **pelo app**, com progresso, checksum e escolha do usuário. O instalador NSIS não passa de ~2 GB, por isso isso não entra nele.

## Catálogo (`src/components/component-manifest.ts`)
Uma entrada por componente: `id`, `group` (`runtime`, `download`, `gpu`, `model`), `label`, `description`, `required`, `kind`, tamanho, arquivo que prova a instalação e, se baixável, `download: { url, sha256 }`.
- `bundled`: só é conferido, não é baixado. No Windows é o ffmpeg ("Processamento de áudio"), que chega junto do pacote da Transcrição.
- `file`: arquivo baixado para `<userData>/components/models`.
- `zip`: pacote baixado e extraído ao lado do `whisper-cli` (pacote CUDA); `provides` lista os arquivos esperados.
- `ollama-model`: modelo do assistente local, baixado do registro dele pelo próprio assistente (ver "Assistente local"); `file` é a referência (`qwen3.5:4b`) e quem instala, detecta e remove é um `ComponentInstaller`.
- `binary`: programa único baixado direto para a pasta de binários (`yt-dlp`, e o `ffmpeg` no Linux; ver `download-de-videos.md`). Fora do Windows o app dá permissão de execução depois do download (`chmod 755`, também nos arquivos de um `zip`); a detecção olha se o arquivo existe, então o programa pode se atualizar sozinho sem o catálogo notar.

**Para acrescentar uma dependência, acrescente uma entrada no catálogo**: o assistente, a seção das Configurações e a lista da sidebar a mostram sozinhos.

### Um item, vários sistemas (`variants`)
O usuário vê **um item só, com nome genérico** em qualquer sistema: "Transcrição" (Whisper), "Processamento de áudio" (ffmpeg), "Download de vídeos" (yt-dlp) e "Aceleração por placa de vídeo" (CUDA); os modelos viram opções de qualidade ("Transcrição rápida", "Transcrição de alta qualidade"...). **Nenhuma ferramenta aparece na interface**: nem em rótulos, descrições, mensagens de erro ou resultado de teste (um teste do manifesto trava isso). O `id` interno e os nomes entre parênteses acima valem só para o código e esta documentação. **Só serviços de terceiros que o usuário configura** (Gemini, Ollama) aparecem pelo nome.

Cada entrada (`ComponentTemplate`) tem `variants` por `<sistema>-<arch>` (a mesma chave de `resources/bin`) dizendo como obter aquele item ali (`kind`, tamanho, arquivo, `download`). `catalogFor(target)` devolve a lista já resolvida para o sistema, e é ela que o `ComponentsService` usa. Regras:
- Entrada com `variants` só existe nos sistemas listados (o pacote CUDA não aparece no Linux, e a recomendação de hardware deixa de sugeri-lo: `accelerationAvailable`).
- Entrada sem `variants` vale para todos (os modelos).
- Hoje: `win32-x64` (Transcrição baixada como pacote `zip` (traz também o ffmpeg, que fica `bundled`), yt-dlp e CUDA baixados) e `linux-x64` (Whisper, ffmpeg e yt-dlp baixados como programa único, direto do GitHub: build estático do `eugeneware/ffmpeg-static` e `yt-dlp_linux`).

Origens: o Linux baixa o ffmpeg de `eugeneware/ffmpeg-static` (tag `b6.1.1`) e o yt-dlp do release oficial; os SHA-256 do yt-dlp vêm do `SHA2-256SUMS` do release. Modelos em `huggingface.co/ggerganov/whisper.cpp` (SHA-256 vindos da API do Hugging Face); pacote CUDA no Release `components-v1` do repositório (arquivo `whisper-cuda12-win32-x64.zip`, gerado a partir de `resources/bin/win32-x64`). O repositório precisa ser público para o download sem token.
**Windows: Transcrição e ffmpeg vêm do pacote `bin-v1`.** O instalador já os leva (a CI baixa o mesmo pacote com `scripts/bin-fetch.mjs`), então no app instalado nada é baixado. Quando os arquivos não estão na pasta de binários (ambiente de desenvolvimento, pasta de uma worktree nova, arquivo apagado), a **Transcrição** é obrigatória e o app a baixa do Release `bin-v1` (`win32-x64.zip`, ~42 MB, com SHA-256 conferido) pelo assistente ou por Configurações > Componentes; o ffmpeg vem no mesmo pacote. A URL e o SHA-256 ficam em `WINDOWS_BIN_PACKAGE` (`component-manifest.ts`) e **precisam bater** com `scripts/windows-bin.json` (um teste confere). Se gerar o pacote de novo (`npm run bin:pack`), atualize os dois.

### Idiomas da leitura de PDF escaneado (grupo `ocr`)
Um item por **idioma e qualidade** (`ocr-por-fast`, `ocr-por-best`...), gerados do registro `ocr-languages.ts` (idioma novo no registro = item novo aqui). São arquivos (`file`) em `<userData>/components/models/ocr/<qualidade>/<idioma>.traineddata`, de um commit fixo dos repositórios de dados de idioma, com checksum. Opcionais e **fora da recomendação por hardware**: o app baixa sozinho o idioma que um PDF escaneado precisar, na versão rápida (`ComponentOcrPacks.ensure`, que usa o `install` daqui e espera terminar), e a de alta qualidade, se instalada, vale mais. Detalhes em `leitura-de-pdf.md`. O grupo aparece como "Leitura de PDF escaneado". `ComponentsService.fileOf(id)` devolve o caminho de um item baixado e `failureOf(id)` o motivo da última falha.

## Assistente local (grupos `assistant` e `llm`)
IA que roda no computador do usuário, instalada pelo app, para quem não tem o Ollama. **Só Windows por enquanto** (o pacote do Linux é `.tar.zst`, que o app ainda não extrai; no Linux o usuário continua apontando para o próprio Ollama nas Configurações).
- **Programa** (`ollama-runtime`, "Assistente local"): zip oficial do projeto (v0.40.18, 1,7 GB baixado, ~2,2 GB extraído) com SHA-256 fixado. É `zip` com `extractTo: 'ollama'`: o catálogo extrai em **`<userData>/components/packages/ollama`**, **fora da pasta do app** (`ComponentsDeps.packagesDir`), para uma atualização do app não apagar 2 GB; `provides` é conferido nessa pasta e remover apaga a pasta inteira.
- **Modelos** (grupo `llm`, do leve ao pesado, nomes sem o nome do modelo na interface): `llm-light` (2b, 2,68 GB), `llm-balanced` (4b, 3,32 GB), `llm-strong` (9b, 6,55 GB), `llm-max` (27b, 17,48 GB); tamanhos do registro do Ollama. O 0.8b **não é oferecido**: medido, ele se perde até com os trechos certos na frente. Ficam fora da recomendação por hardware (opt-in, são grandes).
- **Instalação do modelo** (`components/ollama-model-installer.ts`): liga o assistente, `POST /api/pull` em fluxo, soma o andamento de cada parte contra o tamanho do catálogo (avisos a cada 150 ms), cancelar interrompe o download (a parte baixada fica e a próxima tentativa continua). Detecção sem ligar o assistente: o **manifesto** em `<modelos>/manifests/registry.ollama.ai/library/<nome>/<tamanho>` só existe com o modelo completo. Remover usa `DELETE /api/delete`. Modelos em `<userData>/components/assistant-models`.
- **Processo** (`providers/ollama-runtime.ts`, `OllamaRuntime`): `ollama serve` em **porta privada 11435** (não conflita com um Ollama do próprio usuário na 11434), `OLLAMA_MODELS` na pasta acima, sem janela. **Liga só quando alguém precisa** (lista de modelos, conversa, baixar modelo, teste de conexão), várias chamadas dividem a mesma partida, e **desliga ao fechar o app** (`taskkill /T` no Windows). Enquanto ocioso, o próprio assistente descarrega o modelo da memória. A verificação de saúde **não** o liga.
- **Uso:** com o assistente instalado e o endereço do Ollama nas Configurações ainda no padrão, o app usa o assistente (`SettingsBackConfig.ollamaUrl`, lido a cada uso: vale sem reiniciar). Quem configurou **outro endereço** continua com o seu. O `OllamaProvider` liga o assistente antes de listar modelos, perguntar sobre raciocínio e conversar.
- **Extensão:** um tipo novo de componente que não é arquivo com checksum entra como um `ComponentInstaller` (`handles`, `isInstalled`, `install`, `remove`) em `ComponentsDeps.installers`; o serviço o consulta antes do caminho comum, sem `if` por nome.
- **Interface:** grupos "Assistente local" e "Assistentes para conversar" no assistente de instalação e em Configurações > Componentes. Instalado, o modelo aparece sozinho na Conversa, em Provedor > Ollama (a lista do Ollama é conferida de novo ao voltar o foco para a janela do chat, já que a instalação acontece na janela das Configurações).

## Serviço (`ComponentsService`)
- `status()`: estado de cada item (`missing`, `queued`, `downloading`, `verifying`, `installing`, `installed`, `failed`), hardware, progresso geral e `needsSetup` (falta obrigatório ou nenhum modelo).
- `install(ids)`: uma instalação por vez; baixa em fluxo para `.part`, confere o SHA-256 e só então grava; zip é extraído e apagado. Um item que falha não impede os seguintes. `cancel()` apaga o parcial.
- `remove(id)`: só opcionais; o modelo em uso não sai. `setActiveModel(id)`.
- Modelo ativo (`components.json` em userData): o escolhido ou o primeiro instalado. O Whisper recebe o caminho completo dele (`activeModelRef`).
- Sem permissão de gravação, `PERSIST_FAILED` com a pasta no texto.

## Placa de vídeo (`hardware.ts`)
`detectHardware` lê as placas e corrige a memória de placas NVIDIA com `nvidia-smi`: no Windows por PowerShell (`Win32_VideoController`); no Linux por `lspci -mm` (`parseLspci`) e, se o `lspci` faltar, só pelo `nvidia-smi`. No macOS não lê nada (perfil "desconhecido"). NVIDIA sem pacote de aceleração no sistema (Linux) cai na recomendação de processador, com mensagem própria. `recommendFor` (função pura) escolhe:
- NVIDIA dedicada com 6 GB ou mais: aceleração + alta qualidade (`large-v3-turbo`); 3 a 6 GB: aceleração + alta qualidade compacta; menos: aceleração + rápida (`small`).
- Sem NVIDIA: CPU, turbo compacto com 15 GB de RAM ou mais, senão small. Placa integrada é citada na mensagem.
- Nada identificado: CPU + small, com mensagem de "não identificamos".
- Em qualquer caso, `recommendFor` acrescenta o `yt-dlp` (vale para qualquer máquina e não depende da placa).
A mensagem em português vai ao usuário junto com a pré-seleção.

## Interface
- `InstallAssistant` (app principal): abre sozinho quando `needsSetup`; mostra o hardware, a lista com a recomendação marcada e, ao instalar, o progresso geral e de cada item. "Agora não" fecha.
- `SidebarSetupProgress`: cartão acima de Configurações com "Instalando n de N" e a porcentagem, ou o lembrete de concluir; clicar abre Configurações > Componentes. O lembrete diz a **causa real** (`setupHint`): se falta um componente essencial (os que vêm junto do app, como Transcrição e Processamento de áudio) ele os nomeia; só quando eles estão ali e não há modelo é que pede "baixar um modelo". Num ambiente de desenvolvimento esses binários ficam em `resources/bin/<plataforma>`, fora do Git; a mensagem manda abrir Componentes para instalar.
- Configurações > Componentes (`ComponentsSection`): o mesmo `ComponentChecklist`, com Usar e Remover por item e Instalar selecionados.
- `ComponentChecklist`, `HardwareCard`, `lib/components-text.ts` e `hooks/use-components.ts` são a fonte única nas duas janelas.

## IPC
Canais `components:status|install|cancel|remove|set-active-model`, evento `components:progress` (o `ComponentsStatus` inteiro), `app:open-settings` com `{ section }` e `app:settings-section` (a janela lê a seção pedida ao abrir) mais o evento `settings:navigate` (janela já aberta). Ver `ipc-canais.md`.

## Pendente
- Publicar o `.zip` do CUDA no Release `components-v1`; sem ele o item CUDA falha com 404.
- **Transcrição no Linux:** o `whisper-cli` (estático, CPU) é compilado pelo workflow `.github/workflows/whisper-linux.yml` (Actions > Run workflow, roda `scripts/build-whisper-linux.sh`) e publicado como `whisper-cli-linux-x64` no Release `components-v1`. Ao mudar a versão do `whisper.cpp`, rode o workflow de novo e atualize tamanho e SHA-256 da variante `linux-x64`. O pacote CUDA para Linux fica para depois.
