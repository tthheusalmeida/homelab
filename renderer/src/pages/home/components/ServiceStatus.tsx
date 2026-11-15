import { HexDot } from "#components/Hex";
import { cn } from "#lib/utils";

interface ServiceStatusProps {
  isLoading: boolean;
  isError: boolean;
}

export function ServiceStatus({ isLoading, isError }: ServiceStatusProps) {
  return (
    <HexDot
      pulse={isLoading}
      className={cn(
        isLoading
          ? "bg-muted-foreground"
          : isError
            ? "bg-red-500"
            : "bg-emerald-500",
      )}
    />
  );
}
