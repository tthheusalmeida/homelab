import { useEffect, useMemo, useState } from "react";

function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return now;
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Criados uma vez só: o relógio redesenha todo segundo e não precisa recriar o formatador a cada vez.
const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDateLine(now: Date) {
  return DATE_FORMAT.formatToParts(now)
    .map(({ type, value }) => {
      if (type === "weekday" || type === "month") {
        return value.split("-").map(capitalizeWord).join("-");
      }

      return value;
    })
    .join("");
}

export function ClockAndTime() {
  const now = useClock();

  const time = TIME_FORMAT.format(now);
  // A data só muda uma vez por dia: não precisa ser refeita a cada segundo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const date = useMemo(() => formatDateLine(now), [now.toDateString()]);

  return (
    <div className="flex-1 shrink-0 text-right">
      <div className="text-sm tabular-nums font-semibold">{time}</div>

      <div className="text-xs text-muted-foreground">{date}</div>
    </div>
  );
}
