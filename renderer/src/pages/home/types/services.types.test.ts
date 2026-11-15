import { describe, expect, it } from "vitest";

import { IpcChannels } from "#shared/channels";

import { services } from "./services.types";

describe("services", () => {
  it("when reading the services, should map each one to its health channel", () => {
    expect(services.map((service) => service.healthChannel)).toEqual([
      IpcChannels.health.system,
      IpcChannels.health.ai,
    ]);
  });
});
