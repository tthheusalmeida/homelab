/** Textos do campo de links dos vídeos das duas tarefas (interface em português). */
export const VideoUrlStrings = {
  label: 'Links dos vídeos',
  placeholder: 'Cole um ou mais links e tecle Enter',
  hint: 'Cole o link de um arquivo de vídeo (.mp4) ou de uma página do YouTube e de outras plataformas. Cada link colado vira uma tarefa; dá para juntar até 50 de uma vez.',
  notice:
    'Um aviso amigável: baixar vídeos de plataformas como o YouTube pode ir contra os termos de uso delas. Ao usar este recurso, você está ciente e assume esse risco. Links diretos para o arquivo do vídeo não têm essa questão.',
  add: 'Adicionar',
  invalid: 'Informe um link que comece com http:// ou https://.',
  duplicate: (count: number) =>
    count === 1 ? 'Esse link já está na lista.' : `${count} links repetidos foram ignorados.`,
  tooMany: (max: number) => `Muitos links: o máximo é ${max} por vez.`,
  listLabel: 'Links adicionados',
  counter: (count: number, max: number) => `${count} de ${max} links`,
  more: (count: number) => `+${count} ${count === 1 ? 'link' : 'links'}`,
  showAll: 'Ver todos',
  showLess: 'Mostrar menos',
  clear: 'Limpar lista',
  edit: (position: number) => `Editar link ${position}`,
  remove: (position: number) => `Remover link ${position}`,
  submit: (count: number) => (count > 1 ? `Criar ${count} tarefas` : 'Criar'),
  titleOnlyForOne: 'Com vários links, cada documento usa o título padrão.',
  partial: (created: number, total: number) =>
    `${created} de ${total} tarefas foram criadas. Os links abaixo falharam; revise e tente de novo.`,
  details: {
    title: 'Dados da página',
    optional: 'opcional',
    filled: 'preenchido',
  },
} as const;
