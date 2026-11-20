/**
 * Palavras de sentido parecido, para achar a peça certa quando o texto usa outra palavra que a das
 * palavras-chave ("automóvel" acha o carro, "grana" acha o dinheiro). Serve ao back (o
 * `PieceResolver`, que completa as peças que a IA deixou vazias) e à busca da galeria. Cada linha é um
 * grupo: qualquer palavra dele vale pelas outras. Sem acento ou maiúscula; o casamento é pela palavra
 * inteira no singular (por isso o verbo e o substantivo entram os dois: "comprar" e "compra"). Uma
 * palavra só pode estar em um grupo (um teste confere). Manter curto: só o que as pessoas realmente
 * escrevem; a palavra exata sempre pesa mais que um sinônimo.
 */
const GROUPS: readonly (readonly string[])[] = [
  // Tecnologia e comunicação
  ['computador', 'pc', 'notebook', 'laptop', 'maquina'],
  ['celular', 'smartphone', 'telefone', 'mobile'],
  ['internet', 'web', 'rede', 'online'],
  ['programa', 'software', 'aplicativo', 'app'],
  ['codigo', 'programacao', 'script', 'algoritmo'],
  ['dado', 'informacao', 'registro'],
  ['senha', 'password', 'credencial'],
  ['mensagem', 'recado', 'aviso', 'comunicado', 'notificacao'],
  ['email', 'correio', 'carta', 'correspondencia'],
  ['conversa', 'dialogo', 'bate-papo', 'chat', 'papo'],
  ['video', 'filme', 'gravacao', 'cinema'],
  ['foto', 'imagem', 'fotografia', 'retrato'],
  // Pessoas e trabalho
  ['pessoa', 'gente', 'individuo', 'humano', 'cidadao'],
  ['equipe', 'time', 'grupo', 'turma', 'coletivo'],
  ['crianca', 'infantil', 'filho', 'pequeno', 'menino', 'menina'],
  ['idoso', 'velho', 'terceira', 'anciao'],
  ['chefe', 'lider', 'gestor', 'gerente', 'diretor'],
  ['trabalho', 'emprego', 'servico', 'ocupacao', 'profissao', 'carreira'],
  ['empresa', 'companhia', 'negocio', 'firma', 'organizacao'],
  ['cliente', 'consumidor', 'comprador', 'usuario'],
  ['reuniao', 'encontro', 'assembleia', 'conferencia'],
  ['contrato', 'acordo', 'pacto', 'convenio'],
  ['meta', 'objetivo', 'alvo', 'proposito', 'finalidade'],
  ['plano', 'estrategia', 'planejamento', 'roteiro', 'projeto'],
  ['ideia', 'conceito', 'insight', 'inspiracao', 'criatividade'],
  // Dinheiro e finanças
  ['dinheiro', 'grana', 'capital', 'verba', 'recurso', 'fundos'],
  ['moeda', 'cedula'],
  ['banco', 'instituicao', 'financeira'],
  ['pagamento', 'pagar', 'cobranca', 'fatura', 'boleto', 'duplicata'],
  ['compra', 'comprar', 'aquisicao', 'consumo'],
  ['venda', 'vender', 'comercio', 'loja', 'mercado'],
  ['divida', 'endividamento', 'debito', 'devedor', 'emprestimo', 'credito'],
  ['lucro', 'ganho', 'rendimento', 'retorno', 'receita', 'faturamento'],
  ['prejuizo', 'perda', 'rombo', 'deficit'],
  ['investimento', 'aplicacao', 'poupanca', 'bolsa'],
  ['preco', 'custo', 'valor', 'tarifa', 'taxa'],
  ['imposto', 'tributo', 'fiscal', 'tributacao'],
  ['orcamento', 'planilha', 'gasto', 'despesa'],
  // Saúde e corpo
  ['doenca', 'enfermidade', 'molestia', 'patologia'],
  ['remedio', 'medicamento', 'farmaco', 'comprimido', 'pilula'],
  ['medico', 'doutor', 'clinico', 'especialista'],
  ['hospital', 'clinica', 'pronto-socorro', 'ambulatorio'],
  ['vacina', 'imunizacao', 'imunidade'],
  ['virus', 'bacteria', 'germe', 'microbio', 'infeccao', 'contagio'],
  ['dor', 'sofrimento', 'incomodo', 'desconforto'],
  ['sono', 'dormir', 'descanso', 'repouso', 'cama'],
  ['coracao', 'cardiaco', 'cardio'],
  ['cerebro', 'mente', 'cabeca', 'cognicao', 'pensamento'],
  ['exercicio', 'treino', 'malhar', 'ginastica', 'academia', 'atividade'],
  ['dieta', 'nutricao', 'alimentacao', 'regime'],
  ['comida', 'alimento', 'refeicao', 'prato', 'rancho'],
  ['bebida', 'liquido', 'suco', 'drink'],
  ['agua', 'hidratacao', 'h2o', 'hidrico'],
  // Educação e ciência
  ['escola', 'colegio', 'ensino', 'instituto', 'educacao'],
  ['aluno', 'estudante', 'aprendiz', 'discipulo'],
  ['professor', 'docente', 'mestre', 'instrutor', 'educador'],
  ['estudo', 'estudar', 'aprendizado', 'aprender', 'pesquisa'],
  ['livro', 'leitura', 'obra', 'publicacao', 'literatura'],
  ['prova', 'exame', 'teste', 'avaliacao', 'vestibular'],
  ['duvida', 'pergunta', 'questao', 'questionamento', 'interrogacao'],
  ['resposta', 'solucao', 'resultado', 'conclusao'],
  ['problema', 'erro', 'falha', 'defeito', 'bug', 'dificuldade'],
  ['experimento', 'laboratorio', 'ensaio', 'teoria'],
  ['atomo', 'molecula', 'particula', 'quimica'],
  // Proteção, lei e perigo
  ['seguranca', 'protecao', 'defesa', 'resguardo', 'blindagem'],
  ['perigo', 'risco', 'ameaca', 'alerta', 'cuidado', 'atencao'],
  ['ladrao', 'bandido', 'criminoso', 'hacker', 'fraudador', 'invasor'],
  ['crime', 'delito', 'infracao', 'golpe', 'fraude'],
  ['lei', 'norma', 'regra', 'regulamento', 'legislacao', 'direito'],
  ['juiz', 'tribunal', 'justica', 'sentenca', 'julgamento'],
  ['policia', 'delegacia', 'investigacao', 'agente', 'detetive'],
  ['cadeado', 'trava', 'fechadura', 'tranca'],
  // Casa, natureza e cidade
  ['casa', 'lar', 'moradia', 'residencia', 'domicilio', 'apartamento'],
  ['cidade', 'urbano', 'metropole', 'predio', 'edificio'],
  ['rua', 'avenida', 'estrada', 'caminho'],
  ['arvore', 'planta', 'floresta', 'mata', 'vegetacao'],
  ['mar', 'oceano', 'praia', 'maritimo', 'litoral'],
  ['rio', 'riacho', 'corrego', 'cachoeira', 'lago'],
  ['animal', 'bicho', 'fauna', 'criatura', 'pet'],
  ['sol', 'solar', 'luz', 'luminosidade', 'claridade'],
  ['lampada', 'iluminacao', 'luminaria', 'lanterna'],
  ['chuva', 'tempestade', 'temporal', 'garoa', 'aguaceiro'],
  ['calor', 'quente', 'temperatura', 'febre', 'aquecimento'],
  ['frio', 'gelado', 'gelo', 'congelado', 'resfriamento'],
  ['lixo', 'residuo', 'entulho', 'descarte', 'reciclagem'],
  // Transporte, viagem e esporte
  ['carro', 'automovel', 'veiculo', 'auto', 'motorista'],
  ['onibus', 'transporte', 'lotacao'],
  ['aviao', 'voo', 'aeronave', 'aeroporto', 'aereo'],
  ['navio', 'barco', 'embarcacao', 'cruzeiro', 'porto'],
  ['viagem', 'viajar', 'passeio', 'turismo', 'excursao', 'ferias'],
  ['mapa', 'localizacao', 'gps', 'bussola', 'rota'],
  ['bola', 'futebol', 'esfera', 'pelada'],
  ['vitoria', 'vencer', 'ganhar', 'campeao', 'trofeu', 'medalha', 'premio'],
  ['derrota', 'perder', 'fracasso'],
  ['jogo', 'game', 'partida', 'brincadeira', 'diversao'],
  ['corrida', 'correr', 'maratona', 'velocidade', 'pressa'],
  // Tempo, número e movimento
  ['tempo', 'prazo', 'relogio', 'hora', 'duracao', 'cronometro'],
  ['data', 'calendario', 'agenda', 'cronograma'],
  ['rapido', 'veloz', 'agil', 'ligeiro', 'expresso', 'imediato'],
  ['lento', 'devagar', 'demora', 'atraso', 'vagaroso'],
  ['crescer', 'aumentar', 'subir', 'alta', 'crescimento', 'expansao'],
  ['diminuir', 'reduzir', 'cair', 'baixa', 'reducao', 'declinio'],
  ['grafico', 'estatistica', 'metrica', 'indicador', 'analise'],
  ['numero', 'quantidade', 'total', 'contagem', 'soma'],
  ['comparacao', 'diferenca', 'versus', 'comparar'],
  ['inicio', 'comeco', 'origem', 'largada', 'abertura'],
  ['fim', 'final', 'termino', 'encerramento'],
  // Música, arte e espaço
  ['musica', 'cancao', 'melodia', 'som', 'audio', 'trilha'],
  ['cantor', 'vocalista', 'voz', 'cantar', 'canto', 'microfone'],
  ['pintura', 'quadro', 'arte', 'desenho', 'ilustracao'],
  ['cor', 'tinta', 'paleta', 'pigmento', 'colorido'],
  ['espaco', 'universo', 'cosmos', 'galaxia', 'cosmico'],
  ['foguete', 'nave', 'lancamento', 'missao', 'astronauta'],
  ['energia', 'eletricidade', 'corrente', 'forca', 'potencia'],
  ['bateria', 'pilha', 'carga', 'recarga', 'acumulador'],
  ['ferramenta', 'instrumento', 'utensilio', 'equipamento'],
  ['presente', 'brinde', 'mimo', 'lembranca', 'regalo'],
  ['festa', 'comemoracao', 'celebracao', 'aniversario', 'confraternizacao'],
  ['amor', 'paixao', 'carinho', 'afeto', 'romance'],
  ['amizade', 'amigo', 'companheiro', 'parceiro', 'parceria'],
  ['medo', 'susto', 'pavor', 'terror', 'fobia'],
  ['alegria', 'felicidade', 'contentamento', 'sorriso', 'humor'],
  ['raiva', 'ira', 'furia', 'irritacao', 'estresse'],
];

/** Minúsculas e sem acento. */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/**
 * A palavra no singular (de forma simples): "automóveis" e "automóvel", "remédios" e "remédio",
 * "mensagens" e "mensagem" se encontram. Só serve para comparar, não para escrever.
 */
export function singular(word: string): string {
  const clean = normalize(word);

  if (clean.length <= 3) return clean;
  if (/(oes|aes|aos)$/.test(clean)) return `${clean.slice(0, -3)}ao`;
  if (/eis$/.test(clean)) return `${clean.slice(0, -3)}el`;
  if (/ais$/.test(clean)) return `${clean.slice(0, -3)}al`;
  if (/ns$/.test(clean)) return `${clean.slice(0, -2)}m`;
  if (/(r|z|s)es$/.test(clean)) return clean.slice(0, -2);

  return clean.endsWith('s') ? clean.slice(0, -1) : clean;
}

const MEMBERS = GROUPS.map((group) => [...new Set(group.map(normalize))]);

/** Palavra (no singular) → grupos em que ela aparece. */
const INDEX = new Map<string, Set<number>>();

MEMBERS.forEach((members, group) => {
  for (const word of members) {
    const key = singular(word);
    const groups = INDEX.get(key) ?? new Set<number>();

    groups.add(group);
    INDEX.set(key, groups);
  }
});

/**
 * As palavras de sentido parecido com `word` (sem acento e sem a própria palavra). Vazio se ela não
 * está em nenhum grupo.
 */
export function synonymsOf(word: string): string[] {
  const own = singular(word);
  const found = new Set<string>();

  for (const group of INDEX.get(own) ?? []) {
    for (const member of MEMBERS[group]) {
      if (singular(member) !== own) {
        found.add(member);
      }
    }
  }

  return [...found];
}

/**
 * Palavras que aparecem em mais de um grupo (testes). Deveria ser vazio: uma palavra em dois grupos
 * puxaria os sentidos dos dois ao mesmo tempo.
 */
export function synonymWordsInManyGroups(): string[] {
  return [...INDEX].filter(([, groups]) => groups.size > 1).map(([word]) => word);
}

/** Quantos grupos a tabela tem (testes). */
export const INFOGRAPHIC_SYNONYM_GROUPS = GROUPS.length;
