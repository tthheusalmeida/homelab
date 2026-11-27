import { analyze, tokenize } from './text-analysis';

/** Pergunta com menos palavras úteis que isso pode depender da anterior ("e a segunda?"). */
const MAX_FOLLOW_UP_TERMS = 3;

/**
 * Palavras que **apontam para o que já foi dito** (pronomes, ordinais, "continue", "mais um exemplo").
 * Já sem acento. Uma pergunta curta só é continuação da anterior se tiver uma delas; "E sobre
 * DevOps?" tem assunto próprio e é buscada sozinha.
 */
const REFERENCES = new Set(
  (
    'isso isto disso nisso nesse nessa esse essa esses essas ele ela eles elas aquilo ' +
    'outro outra outros outras anterior mesmo mesma ' +
    'primeira primeiro segunda segundo terceira terceiro quarta quarto quinta quinto ultima ultimo ' +
    'continue continua mais detalhe detalhes exemplo exemplos resuma repita aprofunde'
  ).split(' '),
);

/** O usuário avisou que o assunto mudou ("vamos falar só sobre X", "mudando de assunto"). */
const TOPIC_SWITCH =
  /\b(so|somente|apenas) (sobre|de|do|da|dos|das)\b|\b(mudando|trocando|mudar|trocar) de assunto\b|\b(outro|novo) assunto\b/;

/**
 * Esta pergunta continua a anterior (e deve ser buscada junto com ela)? Só se for curta, apontar para
 * o que já foi dito e o usuário não tiver avisado que mudou de assunto.
 */
export function isFollowUp(question: string): boolean {
  const normalized = tokenize(question).join(' ');

  if (TOPIC_SWITCH.test(normalized) || analyze(question).length >= MAX_FOLLOW_UP_TERMS) {
    return false;
  }

  return tokenize(question).some((token) => REFERENCES.has(token));
}
