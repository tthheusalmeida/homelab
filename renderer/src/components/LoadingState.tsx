import { HexLoader } from "#components/Hex";
import { cn } from "#lib/utils";

interface LoadingStateProps {
  message: string;
  loading?: boolean;
  /** Pequeno e na linha do texto (ex.: "Pensando" no chat); por padrão fica empilhado e maior. */
  inline?: boolean;
}

export function LoadingState({
  message,
  loading = true,
  inline = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex animate-enter-fade items-center text-sm text-muted-foreground",
        inline ? "gap-2" : "flex-col gap-3",
      )}
    >
      {loading && (
        <HexLoader
          label={message}
          className={cn("hex-loader", inline ? "size-5" : "size-12")}
        />
      )}

      <span>{message}</span>
    </div>
  );
}
