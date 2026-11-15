import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { IpcChannels } from "#shared/channels";
import { mockApi, ok } from "#test/api-mock";

import { createWrapper } from "../../../test/utils";
import { useJobs } from "./hooks/useJobs";

describe("jobs track", () => {
  it("when useJobs mounts, should load the jobs list through the jobs channel", async () => {
    const invoke = mockApi({ [IpcChannels.jobs.list]: () => ok([]) });

    const { result } = renderHook(() => useJobs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.list);
  });
});
