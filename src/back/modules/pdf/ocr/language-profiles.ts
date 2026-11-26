import type { OcrLanguageId } from './ocr-languages';

/**
 * Palavras muito comuns de cada idioma (sem acento e em minúsculas), usadas para reconhecer o idioma
 * de um texto. Sem acento de propósito: a amostra é lida por um motor que pode errar ou perder
 * acentos, e o detector também tira os acentos do texto antes de comparar. Palavras que existem em
 * mais de um idioma ("de", "la", "que") valem menos (ver `language-detector.ts`).
 */
const WORDS_BY_LANGUAGE = {
  por: 'de que nao uma um para com por mais como mas foi ele ela eles elas seu sua seus suas os as dos das do da em no na nos nas ao aos num numa sao esta estao voce ser tem ha ou e a o se eu nem mesmo sem depois entao quando muito ja tambem ate apos sobre entre pelo pela pelos pelas isso esse essa esses essas este nesta neste nesse nessa desta deste desse dessa aquele aquela outro outra outros outras todo toda todos todas qual quais cada onde ainda apenas deve devem podem pode foram sera pois so aqui bem seja nosso nossa durante enquanto'.split(
    ' ',
  ),
  eng: 'the and of to in is that it for as with was on are by this be from or an a at not have has which but they their can will would there been were its these other more such into than when what about your you we if one all also only each so do does did how who where here them then some any may should could our his her him she he me my us'.split(
    ' ',
  ),
  spa: 'el la los las de que y en un una es por con para no se su al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante ser son dos fue han del esto eso ese esa esos esas estos estas cada otro otra otros otras puede pueden sido tiene tienen era ellos ellas nuestro nuestra aqui asi'.split(
    ' ',
  ),
  fra: 'le la les de des du un une et est en que qui dans pour pas sur au aux ce cette ces il elle ils elles nous vous avec sont par plus ne se son sa ses mais ou comme etre fait tout tous toute toutes leur leurs aussi entre sans ete avoir peut peuvent si je tu on mon ma mes ton ta tes notre nos votre vos cela ceci donc alors quand pourquoi bien tres ici etait ont'.split(
    ' ',
  ),
  deu: 'der die das und ist nicht ein eine zu den von mit sich auf dem des fur auch als wie werden wird aus bei nach oder wenn einer einem einen sind noch nur uber kann dass im es sie er wir ich hat aber um so durch diese dieser dieses diesem diesen jede jeder jedes alle man mehr sehr wurde wurden war waren habe haben hier dort weil dann'.split(
    ' ',
  ),
  ita: 'il lo la i gli le di che e un una uno in per con non sono del della dei delle degli al alla alle ai da come ma si piu anche se questo questa questi queste essere ha ho hanno nel nella nei nelle sul sulla tra fra loro suo sua suoi sue molto quando dove ogni cosa perche ancora stato fatto puo sono era noi voi lui lei mio mia nostro nostra tutto tutti tutta tutte altro altra altri altre'.split(
    ' ',
  ),
} satisfies Record<OcrLanguageId, string[]>;

export const LANGUAGE_WORDS: Readonly<Record<OcrLanguageId, readonly string[]>> = WORDS_BY_LANGUAGE;
