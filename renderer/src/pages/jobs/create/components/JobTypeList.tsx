import type { CSSProperties } from "react";

import type { JobType } from "../../types/job.types";

import { JobTypeCard } from "./JobTypeCard";

interface JobTypeListProps {
  jobTypes: JobType[];
  onSelect: (jobType: JobType) => void;
}

export function JobTypeList({ jobTypes, onSelect }: JobTypeListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {jobTypes.map((jobType, index) => (
        <div
          key={jobType.type}
          className="animate-enter [&>*]:h-full"
          style={{ "--i": index } as CSSProperties}
        >
          <JobTypeCard jobType={jobType} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
