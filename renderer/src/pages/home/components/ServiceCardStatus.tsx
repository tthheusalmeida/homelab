import { HexDot } from "#components/Hex";

interface ServiceCardStatusProps {
  isLoading: boolean;
  isOnline: boolean;
}

export default function ServiceCardStatus({
  isLoading,
  isOnline,
}: ServiceCardStatusProps) {
  const statusClass = isLoading
    ? "bg-muted-foreground"
    : isOnline
      ? "bg-emerald-500"
      : "bg-red-700";

  return <HexDot pulse={isLoading || isOnline} className={statusClass} />;
}
