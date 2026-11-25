import { ArrowRight, Captions, FileText, FileType, Terminal, type LucideIcon } from "lucide-react";

import { HexFrame } from "#components/Hex";
import { Card, CardContent } from "#ui/card";
import { Button } from "#ui/button";

import { JobNameOptions, type JobType } from "../../types/job.types";

interface JobTypeCardProps {
  jobType: JobType;
  onSelect: (jobType: JobType) => void;
}

const ICONS: Record<string, LucideIcon> = {
  [JobNameOptions.VIDEO_TO_TRANSCRIPT]: Captions,
  [JobNameOptions.VIDEO_TO_SUMMARY]: FileText,
  [JobNameOptions.PDF_TO_SUMMARY]: FileType,
};

export function JobTypeCard({ jobType, onSelect }: JobTypeCardProps) {
  const Icon = ICONS[jobType.type] ?? Terminal;

  return (
    <Card className="rounded-[4px] transition-[box-shadow,border-color] duration-200 hover:border-primary/50 hover:ring-3 hover:ring-primary/15">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <HexFrame className="size-11">
            <Icon className="size-4" />
          </HexFrame>

          <div className="min-w-0 space-y-1">
            <h2 className="font-medium">{jobType.label}</h2>

            <p className="font-mono text-xs text-muted-foreground/70">./{jobType.type}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{jobType.description}</p>

        <Button onClick={() => onSelect(jobType)} className="mt-auto self-end">
          Criar
          <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  );
}
