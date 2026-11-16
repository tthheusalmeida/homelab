import { useEffect, useState } from "react";

/** Hora atual em milissegundos, atualizada a cada `intervalMs` (para cronômetros ao vivo). */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, enabled]);

  return now;
}
