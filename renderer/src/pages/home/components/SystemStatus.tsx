import { HexDot } from "#components/Hex";

interface SystemStatusProps {
  isLoading: boolean;
  allOnline: boolean;
  allOffline: boolean;
}

export function SystemStatus({
  isLoading,
  allOnline,
  allOffline,
}: SystemStatusProps) {
  const status = isLoading
    ? {
        color: "bg-muted-foreground",
        label: "Verificando",
      }
    : allOnline
      ? {
          color: "bg-emerald-500",
          label: "Todos os sistemas operacionais",
        }
      : allOffline
        ? {
            color: "bg-red-500",
            label: "TODOS OS SISTEMAS FORA DO AR",
          }
        : {
            color: "bg-amber-500",
            label: "Alguns sistemas estão fora do ar",
          };

  return (
    <span className="mt-1 flex items-center gap-1 text-foreground">
      <HexDot pulse={isLoading} className={status.color} />

      <span>{status.label}</span>
    </span>
  );
}
