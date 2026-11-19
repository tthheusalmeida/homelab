import { useEffect, useState } from "react";

/**
 * Entre os ids, o da seção que o leitor está lendo: a última cuja borda de cima
 * já passou do `offset` (distância do topo da tela); com a rolagem no fim, a última. Antes de qualquer uma
 * chegar lá, vale a primeira que existe na página. Sem nenhuma na página, nada.
 */
export function findActiveId(
  ids: string[],
  topOf: (id: string) => number | null,
  offset = 120,
  atBottom = false,
): string | undefined {
  let active: string | undefined;
  let first: string | undefined;
  let last: string | undefined;

  for (const id of ids) {
    const top = topOf(id);

    if (top === null) {
      continue;
    }

    first ??= id;
    last = id;

    if (top <= offset) {
      active = id;
    }
  }

  // No fim da rolagem a última seção pode nunca chegar ao `offset` (ela é curta): vale a última.
  return atBottom ? last : (active ?? first);
}

/** A página (ou a área que acabou de rolar) está no fim da rolagem. */
function isAtBottom(target: EventTarget | null, firstId?: string): boolean {
  const scrolled = target instanceof HTMLElement ? target : null;

  // Rolagem de outra área (ex.: o próprio sumário) não diz nada sobre o texto.
  if (scrolled && !scrolled.contains(document.getElementById(firstId ?? ""))) {
    return false;
  }

  const element =
    scrolled ?? document.scrollingElement ?? document.documentElement;

  return (
    element.scrollTop > 0 &&
    element.scrollTop + element.clientHeight >= element.scrollHeight - 2
  );
}

const topOfElement = (id: string) =>
  document.getElementById(id)?.getBoundingClientRect().top ?? null;

/**
 * Acompanha a rolagem (da janela ou de qualquer área com rolagem, como o modo
 * leitura) e devolve o id da seção sendo lida, para destacar no sumário.
 */
export function useActiveSection(
  ids: string[],
  offset = 120,
): string | undefined {
  const [active, setActive] = useState<string>();
  const key = ids.join("\u0000");

  useEffect(() => {
    const list = key === "" ? [] : key.split("\u0000");
    let frame = 0;
    let bottom = false;

    const update = () => {
      frame = 0;
      setActive(findActiveId(list, topOfElement, offset, bottom));
    };

    const schedule = (event?: Event) => {
      bottom = isAtBottom(event?.target ?? null, list[0]);

      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    // `capture` pega a rolagem de qualquer elemento, não só a da janela.
    document.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);

    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [key, offset]);

  return active;
}
