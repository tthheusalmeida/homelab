import type { LibraryInfographic } from '#shared/contracts/library';
import type { InfographicLayoutId } from '#shared/infographic-layouts';

/**
 * Infográfico de exemplo (tema economia) com os 10 modelos, uma seção para cada, na ordem de
 * `INFOGRAPHIC_LAYOUT_IDS`. Alimenta a galeria das Configurações: serve para ver como cada modelo e
 * cada peça ficam com a cor de destaque escolhida, sem gastar IA nem depender de um resumo.
 */
export const INFOGRAPHIC_SAMPLE: LibraryInfographic = {
  kicker: 'Economia · Finanças públicas',
  title: 'O orçamento e a economia do Brasil',
  subtitle: 'Quanto o governo arrecada, quanto gasta e por que a dívida cresce.',
  intro: 'O orçamento público é o plano de receitas e despesas do governo para um ano.',
  piece: 'financas.calculadora',
  model: 'exemplo',
  createdAt: '2026-01-01T00:00:00.000Z',
  stale: false,
  sections: [
    {
      layout: 'steps',
      title: 'Do imposto ao gasto',
      subtitle: 'O caminho do dinheiro público, em quatro passos.',
      piece: '',
      items: [
        {
          piece: 'financas.moedas',
          title: 'Arrecadação',
          text: 'O governo cobra impostos de pessoas e empresas.',
        },
        {
          piece: 'negocios.contrato',
          title: 'Orçamento',
          text: 'Um plano define quanto vai para cada área.',
        },
        {
          piece: 'financas.carteira',
          title: 'Gasto',
          text: 'O dinheiro paga saúde, educação e benefícios.',
        },
        {
          piece: 'financas.linha',
          title: 'Resultado',
          text: 'No fim do ano, sobra ou falta dinheiro.',
        },
      ],
      tips: ['Imposto é a principal fonte de receita.', 'Gasto obrigatório pesa mais que o livre.'],
    },
    {
      layout: 'funnel',
      title: 'Para onde vai cada real',
      piece: 'negocios.funil',
      items: [
        {
          piece: 'financas.moedas',
          title: 'Arrecadado',
          tag: '100%',
          text: 'Tudo o que entra nos cofres públicos.',
        },
        {
          piece: 'financas.pizza',
          title: 'Gastos obrigatórios',
          tag: '90%',
          text: 'Previdência, salários e transferências.',
        },
        {
          piece: 'generico.engrenagem',
          title: 'Manutenção da máquina',
          tag: '6%',
          text: 'Custos para o governo funcionar.',
        },
        {
          piece: 'financas.barras',
          title: 'Investimento',
          tag: '4%',
          text: 'Obras e projetos novos.',
        },
      ],
    },
    {
      layout: 'timeline',
      title: 'Como a dívida cresceu',
      piece: '',
      items: [
        {
          piece: 'generico.bandeira',
          title: 'Plano Real',
          tag: '1994',
          text: 'A inflação cai e a moeda se estabiliza.',
        },
        {
          piece: 'financas.lingote',
          title: 'Superávit primário',
          tag: '2000',
          text: 'O governo passa a economizar para pagar juros.',
        },
        {
          piece: 'generico.alerta',
          title: 'Crise global',
          tag: '2008',
          text: 'A arrecadação cai e os gastos sobem.',
        },
        {
          piece: 'financas.cedula',
          title: 'Teto de gastos',
          tag: '2016',
          text: 'Uma regra limita o crescimento da despesa.',
        },
        {
          piece: 'generico.relogio',
          title: 'Pandemia',
          tag: '2020',
          text: 'O gasto extra faz a dívida disparar.',
        },
      ],
    },
    {
      layout: 'versus',
      title: 'Cortar gastos ou aumentar impostos?',
      piece: '',
      sides: [
        { piece: 'financas.carteira', title: 'Cortar gastos' },
        { piece: 'financas.moedas', title: 'Subir impostos' },
      ],
      items: [
        {
          piece: '',
          title: 'Efeito rápido',
          text: 'Médio: depende do que for cortado',
          extra: 'Alto: entra dinheiro logo',
          winner: 'b',
        },
        {
          piece: '',
          title: 'Aceitação',
          text: 'Divide opiniões',
          extra: 'Costuma ser rejeitado',
          winner: 'a',
        },
        {
          piece: '',
          title: 'Efeito no crescimento',
          text: 'Pode liberar investimento',
          extra: 'Pode frear o consumo',
          winner: 'a',
        },
      ],
    },
    {
      layout: 'numbers',
      title: 'Os números do ano',
      piece: 'financas.percentual',
      items: [
        {
          piece: 'financas.barras',
          title: '',
          text: 'Receita total em relação ao PIB',
          tag: '40%',
        },
        { piece: 'financas.linha', title: '', text: 'Despesa total em relação ao PIB', tag: '47%' },
        { piece: 'financas.pizza', title: '', text: 'Resultado do governo no ano', tag: '-6,4%' },
      ],
      note: 'O resultado negativo é o déficit: o governo gastou mais do que arrecadou.',
    },
    {
      layout: 'radial',
      title: 'Economia',
      piece: 'financas.cartao',
      items: [
        { piece: 'financas.moedas', title: 'Receita', text: 'O que o governo arrecada.' },
        { piece: 'financas.carteira', title: 'Despesa', text: 'O que o governo gasta.' },
        { piece: 'financas.lingote', title: 'Dívida', text: 'O que o governo deve.' },
        { piece: 'financas.percentual', title: 'Juros', text: 'O preço de dever.' },
        { piece: 'negocios.alvo', title: 'Meta fiscal', text: 'O resultado combinado.' },
        { piece: 'financas.barras', title: 'Crescimento', text: 'Mais renda, mais imposto.' },
      ],
    },
    {
      layout: 'ranking',
      title: 'Onde o governo mais gasta',
      piece: '',
      meterLabel: 'Peso no gasto',
      items: [
        {
          piece: 'generico.pessoa',
          title: 'Previdência',
          text: 'Aposentadorias e pensões.',
          value: 95,
        },
        {
          piece: 'financas.carteira',
          title: 'Pessoal',
          text: 'Salários do serviço público.',
          value: 70,
        },
        {
          piece: 'financas.moedas',
          title: 'Juros da dívida',
          text: 'O custo de rolar a dívida.',
          value: 55,
        },
        {
          piece: 'financas.cartao',
          title: 'Saúde e educação',
          text: 'Serviços públicos.',
          value: 40,
        },
        {
          piece: 'financas.barras',
          title: 'Investimentos',
          text: 'Obras e equipamentos.',
          value: 15,
        },
      ],
    },
    {
      layout: 'cycle',
      title: 'O ciclo da dívida',
      piece: '',
      items: [
        { piece: 'financas.moedas', title: 'Arrecadação', text: 'O governo cobra impostos.' },
        { piece: 'financas.carteira', title: 'Gastos', text: 'Os recursos são gastos.' },
        { piece: 'financas.percentual', title: 'Custo da dívida', text: 'Os juros se acumulam.' },
        { piece: 'financas.cedula', title: 'Novo endividamento', text: 'O ciclo se repete.' },
      ],
      note: 'Sem superávit, o ciclo só aumenta a dívida.',
    },
    {
      layout: 'myths',
      title: 'Mitos e verdades',
      piece: '',
      items: [
        {
          piece: 'financas.cedula',
          title: '"O governo pode imprimir dinheiro à vontade."',
          text: 'Imprimir demais gera inflação e corrói o poder de compra.',
        },
        {
          piece: 'financas.carteira',
          title: '"Dívida pública é sempre ruim."',
          text: 'Em nível controlado, ela financia obras e serviços.',
        },
        {
          piece: 'generico.pergunta',
          title: '"Cortar gastos resolve tudo."',
          text: 'Sem crescimento, o corte sozinho não fecha a conta.',
        },
      ],
    },
    {
      layout: 'mosaic',
      title: 'O que fazer com isso',
      subtitle: 'Resumo prático para acompanhar as contas públicas.',
      piece: 'generico.brilho',
      items: [
        {
          piece: '',
          title: 'Acompanhe a meta fiscal',
          text: 'Ela diz quanto o governo promete economizar.',
          tag: '0%',
        },
        { piece: '', title: 'Olhe os juros', text: 'Eles mostram o custo de dever.' },
        {
          piece: '',
          title: 'Compare com o PIB',
          text: 'Os números fazem sentido quando comparados ao tamanho da economia.',
        },
      ],
      tips: [
        'Receita e despesa sempre juntas.',
        'Dívida em relação ao PIB.',
        'Resultado primário e nominal.',
      ],
      note: 'Contas públicas saudáveis dão previsibilidade para todos.',
    },
  ],
  takeaways: [
    'Receitas e despesas precisam conversar.',
    'Juros fazem a dívida crescer sozinha.',
    'O resultado do ano muda a dívida de amanhã.',
  ],
};

/** Os modelos do exemplo, na ordem das seções (um teste garante que cobrem todos os modelos). */
export const INFOGRAPHIC_SAMPLE_LAYOUTS: readonly InfographicLayoutId[] =
  INFOGRAPHIC_SAMPLE.sections.map((section) => section.layout);
