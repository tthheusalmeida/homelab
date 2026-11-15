import type { CSSProperties } from "react";

import type { Job } from "../../types/job.types";

import { JobListItem } from "./JobListItem";

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps) {
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedJobs.map((job, index) => (
        <div
          key={job.id}
          className="animate-enter"
          style={{ "--i": index } as CSSProperties}
        >
          <JobListItem job={job} />
        </div>
      ))}
    </div>
  );
}
