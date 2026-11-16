import { HexFrame } from "#components/Hex";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";

const phrases = [
  "Explorar uma ideia?",
  "Resolver um problema?",
  "Transformar uma ideia em código?",
  "Questionar o que você sabe?",
  "Encontrar uma solução elegante?",
  "Entender algo mais profundamente?",
  "Criar algo novo?",
  "Simplificar o que parece complexo?",
  "Pensar diferente?",
  "Descobrir o que ainda não foi perguntado?",
];

type TypingPhase = "typing" | "waiting" | "deleting" | "paused";

export function ChatEmptyState() {
  const [phrase, setPhrase] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<TypingPhase>("typing");

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    let timeout: ReturnType<typeof setTimeout>;

    switch (phase) {
      case "typing":
        timeout = setTimeout(() => {
          const nextPhrase = currentPhrase.slice(0, phrase.length + 1);

          setPhrase(nextPhrase);

          if (nextPhrase === currentPhrase) {
            setPhase("waiting");
          }
        }, 70);
        break;

      case "waiting":
        timeout = setTimeout(() => {
          setPhase("deleting");
        }, 2200);
        break;

      case "deleting":
        timeout = setTimeout(() => {
          const nextPhrase = currentPhrase.slice(0, phrase.length - 1);

          setPhrase(nextPhrase);

          if (nextPhrase === "") {
            setPhase("paused");
          }
        }, 35);
        break;

      case "paused":
        timeout = setTimeout(() => {
          setPhraseIndex((index) => (index + 1) % phrases.length);
          setPhase("typing");
        }, 900);
        break;
    }

    return () => clearTimeout(timeout);
  }, [phrase, phraseIndex, phase]);

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center p-6 text-center select-none">
      <HexFrame className="mb-4 text-primary">
        <Bot className="size-5" />
      </HexFrame>

      <div className="max-w-sm space-y-1">
        <h2 className="text-lg font-medium tracking-tight">
          Como posso te ajudar hoje?
        </h2>

        <div className="h-6 font-mono text-xs text-muted-foreground">
          <span className="text-primary">$ </span>
          <span>{phrase}</span>
          <span className="ml-0.5 animate-pulse">|</span>
        </div>
      </div>
    </div>
  );
}
