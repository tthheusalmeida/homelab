/** Sem scroll nenhum (o alvo já estava à vista), espera isto antes de dar a rolagem por terminada. */
const NO_SCROLL_MS = 250;
/** Quanto tempo sem eventos de scroll conta como "a rolagem parou". */
const QUIET_MS = 120;
/** Teto: rolagens muito longas não seguram a espera para sempre. */
const MAX_WAIT_MS = 8000;

/**
 * Chama `done` quando a rolagem em andamento (a suave, em qualquer área rolável) termina: depois
 * de um instante sem eventos de scroll, ou logo em seguida se nada chegar a rolar. Devolve o
 * cancelamento.
 */
export function whenScrollSettles(done: () => void): () => void {
  let timer = window.setTimeout(finish, NO_SCROLL_MS);
  const limit = window.setTimeout(finish, MAX_WAIT_MS);

  function onScroll() {
    window.clearTimeout(timer);
    timer = window.setTimeout(finish, QUIET_MS);
  }

  function cancel() {
    window.clearTimeout(timer);
    window.clearTimeout(limit);
    document.removeEventListener("scroll", onScroll, true);
  }

  function finish() {
    cancel();
    done();
  }

  document.addEventListener("scroll", onScroll, true);

  return cancel;
}
