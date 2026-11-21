import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../ui/table";

import { Badge } from "../../../../ui/badge";
import { Tip } from "#components/Tip";
import type { AiUsageRequest } from "../types/aiUsage.types";
import { formatDuration, formatNumber } from "#lib/format";
import { cn } from "#lib/utils";

interface RecentRequestsProps {
  data: AiUsageRequest[];
}

export const RecentRequestsStrings = {
  title: "Requests recentes",
  subtitle: "As últimas 10, com as que falharam e o motivo de cada falha.",
  empty: "Nenhuma requisição registrada ainda.",
  columns: ["Provedor", "Modelo", "Operação", "Tokens", "Latência", "Custo", "Status"],
  success: "Sucesso",
  failed: "Falhou",
  failedWithoutReason: "Sem detalhe do erro.",
} as const;

/** As requisições mais recentes (o back já manda só as 10 últimas): as que falharam ganham destaque e o motivo. */
export function RecentRequests({ data }: RecentRequestsProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{RecentRequestsStrings.title}</h2>

        <p className="text-sm text-muted-foreground">{RecentRequestsStrings.subtitle}</p>
      </div>

      {data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          {RecentRequestsStrings.empty}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {RecentRequestsStrings.columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((request) => (
              <TableRow
                key={request.id}
                data-status={request.success ? "success" : "failed"}
                className={cn(!request.success && "bg-destructive/5")}
              >
                <TableCell className="capitalize">{request.provider}</TableCell>

                <TableCell className="font-medium">
                  {request.model}

                  {!request.success && (
                    <span
                      data-slot="request-error"
                      className="block max-w-72 text-xs font-normal whitespace-normal text-destructive"
                    >
                      {request.error || RecentRequestsStrings.failedWithoutReason}
                    </span>
                  )}
                </TableCell>

                <TableCell>{request.operation}</TableCell>

                <TableCell>{formatNumber(request.totalTokens)}</TableCell>

                <TableCell>{formatDuration(request.latencyMs)}</TableCell>

                <TableCell>${request.estimatedCost.toFixed(4)}</TableCell>

                <TableCell>
                  <Tip content={!request.success && request.error}>
                    <Badge
                      variant={request.success ? "secondary" : "destructive"}
                      className={request.success ? "bg-emerald-800 text-emerald-300" : undefined}
                    >
                      {request.success
                        ? RecentRequestsStrings.success
                        : RecentRequestsStrings.failed}
                    </Badge>
                  </Tip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
