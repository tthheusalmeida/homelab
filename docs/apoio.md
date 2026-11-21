# Apoio ao projeto

Convite discreto, em **Configurações > Sobre**, para a pessoa apoiar o desenvolvimento com uma estrela no repositório do GitHub.

## Como se comporta
- Aparece como o último grupo da seção Sobre ("Apoie o projeto"), com o texto "Gostando do HomeLab? Uma estrela no GitHub ajuda a apoiar o desenvolvimento.". Não há popup, banner nem aviso nas telas de uso: só quem abre a seção vê.
- **Abrir no GitHub** só abre o repositório no navegador do sistema; o convite continua.
- Só **Já dei minha estrela** esconde o convite, para sempre. Ao clicar, o cartão troca para um **agradecimento** que usa os **três hexágonos da logo** (`LogoImplosion`), numa linha do tempo só de ~3,4 s (`hl-implosion` em `global.css`):
  1. **implosão**: os hexágonos giram e encolhem, cada vez mais rápido, como uma galáxia implodindo (o conjunto gira em torno do centro e cada hexágono gira em torno de si);
  2. **ponto crítico** (~1,6 s): tudo vira um ponto, com um clarão na cor de destaque, e dele **sai o confete** (56 peças em hexágono, retângulo e círculo, para todos os lados, que a gravidade traz de volta); o confete fica num portal sobre o `body`, sem ser cortado nem bloquear cliques;
  3. **volta**: os hexágonos voltam crescendo e girando, sem pressa, até a posição certa (a logo normal); o texto "Obrigado pelo apoio!" entra junto;
  4. o cartão sai com `animate-exit-down` 4,8 s depois do clique e não volta.
  A escolha é salva ao clicar; se salvar falhar, a animação e o confete somem, volta o convite e um alerta avisa. Com "reduzir movimento" ligado no sistema, a logo aparece parada, já no fim, com o texto.
- O app não consegue saber se a pessoa estrelou (exigiria login no GitHub); por isso ele fica até ela dizer que já estrelou.
- Enquanto a escolha carrega, nada é mostrado (o convite nunca pisca antes de o app saber a resposta). 

## Onde fica salvo
`settings.json` → `support.starPromptHidden` (padrão `false`). Arquivos antigos sem a chave recebem o padrão. A escolha sobrevive a atualizações do app.

## Código
- Canais `support:get` e `support:update` (`SettingsHandler`, `SettingsService.getSupport/updateSupport`); ver `ipc-canais.md`.
- Front: `StarSupportCard` (`components/`, orquestra a sequência), `LogoImplosion` e `Confetti` (`components/`), `useSupport` e `useHideStarPrompt` (`hooks/use-support.ts`), textos, tempos e endereço do repositório em `lib/support-text.ts`.
