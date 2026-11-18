import { useMemo, useState } from "react";

import type { BatchResult } from "../api/create";
import { VideoUrlStrings } from "../video-url-text";
import { isVideoUrl, MAX_BATCH_LINKS, parseVideoUrls } from "../video-urls";

/**
 * Estado do campo de links das tarefas de vídeo: a lista de links já adicionados, o que está sendo
 * digitado e os avisos (link inválido, repetido, passou do limite). O que está no campo e é um link
 * válido também conta, para quem cola um link só e clica em criar sem apertar Enter.
 */
export function useLinksField() {
  const [links, setLinks] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [showInvalid, setShowInvalid] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [partialMessage, setPartialMessage] = useState<string>();

  const draftTokens = useMemo(() => parseVideoUrls(draft), [draft]);
  const invalidDraft = draftTokens.some((token) => !isVideoUrl(token));
  const pending = draftTokens.filter((token) => isVideoUrl(token) && !links.includes(token));
  const urls = useMemo(() => [...links, ...pending], [links, pending]);
  const tooMany = urls.length > MAX_BATCH_LINKS;

  const reset = () => {
    setNotice(undefined);
    setPartialMessage(undefined);
  };

  /** Adiciona à lista os links do texto; o que não for link válido fica no campo para corrigir. */
  const add = (text: string) => {
    const tokens = parseVideoUrls(text);

    if (tokens.length === 0) {
      return;
    }

    const valid = tokens.filter(isVideoUrl);
    const invalid = tokens.filter((token) => !isVideoUrl(token));
    const fresh = valid.filter((token) => !links.includes(token));
    const accepted = fresh.slice(0, Math.max(0, MAX_BATCH_LINKS - links.length));

    setLinks([...links, ...accepted]);
    setDraft(invalid.join(" "));
    setPartialMessage(undefined);
    setShowInvalid(invalid.length > 0);

    if (invalid.length > 0) {
      setNotice(undefined);
    } else if (accepted.length < fresh.length) {
      setNotice(VideoUrlStrings.tooMany(MAX_BATCH_LINKS));
    } else if (valid.length > fresh.length) {
      setNotice(VideoUrlStrings.duplicate(valid.length - fresh.length));
    } else {
      setNotice(undefined);
    }
  };

  const error = tooMany
    ? VideoUrlStrings.tooMany(MAX_BATCH_LINKS)
    : invalidDraft && showInvalid
      ? VideoUrlStrings.invalid
      : notice;

  return {
    links,
    draft,
    setDraft: (value: string) => {
      setDraft(value);
      setShowInvalid(false);
      reset();
    },
    /** O campo perdeu o foco: avisa se sobrou algo que não é link. */
    touch: () => setShowInvalid(true),
    add,
    remove: (link: string) => {
      setLinks(links.filter((own) => own !== link));
      reset();
    },
    /** Tira o link da lista e o devolve ao campo para ser corrigido (o que já estava digitado entra na lista). */
    edit: (link: string) => {
      setLinks([...links.filter((own) => own !== link), ...pending]);
      setDraft(link);
      setShowInvalid(false);
      reset();
    },
    clear: () => {
      setLinks([]);
      setDraft("");
      reset();
      setShowInvalid(false);
    },
    /** Todos os links do pedido: a lista mais o que está no campo e já é um link válido. */
    urls,
    tooMany,
    invalidDraft,
    canSubmit: urls.length > 0 && !tooMany && !invalidDraft,
    error,
    partialMessage,
    /** Devolve `true` se o lote inteiro entrou; senão deixa na lista só o que falhou. */
    applyResult: (result: BatchResult): boolean => {
      if (result.failed.length === 0) {
        return true;
      }

      setLinks(result.failed);
      setDraft("");
      setNotice(undefined);
      setPartialMessage(
        VideoUrlStrings.partial(result.created, result.created + result.failed.length),
      );

      return false;
    },
  };
}

export type LinksField = ReturnType<typeof useLinksField>;
