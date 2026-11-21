import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BusyDialog, useReportBusy } from "./BusyDialog";

function Content({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const [working, setWorking] = useState(false);

  useReportBusy(working, onBusyChange);

  return (
    <div>
      <p>conteúdo</p>
      <button type="button" onClick={() => setWorking((value) => !value)}>
        alternar
      </button>
    </div>
  );
}

const setup = (onOpenChange = vi.fn()) => {
  render(
    <BusyDialog open onOpenChange={onOpenChange}>
      {(onBusyChange) => <Content onBusyChange={onBusyChange} />}
    </BusyDialog>,
  );

  return onOpenChange;
};

describe("BusyDialog", () => {
  it("when nothing is running, should let Esc ask to close", async () => {
    const onOpenChange = setup();

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("when an operation is running, should ignore Esc", async () => {
    const onOpenChange = setup();

    await userEvent.click(screen.getByRole("button", { name: "alternar" }));
    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("when the operation ends, should let it close again", async () => {
    const onOpenChange = setup();

    await userEvent.click(screen.getByRole("button", { name: "alternar" }));
    await userEvent.click(screen.getByRole("button", { name: "alternar" }));
    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("when closed, should render nothing", () => {
    render(
      <BusyDialog open={false} onOpenChange={vi.fn()}>
        {() => <p>conteúdo</p>}
      </BusyDialog>,
    );

    expect(screen.queryByText("conteúdo")).toBeNull();
  });
});
