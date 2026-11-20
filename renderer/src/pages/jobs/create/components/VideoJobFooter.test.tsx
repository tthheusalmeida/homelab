import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { VideoJobFooter } from "./VideoJobFooter";

const props = { linkCount: 1, canSubmit: true, isPending: false, isError: false };

describe("VideoJobFooter", () => {
  it("when ready, should offer an enabled submit button", () => {
    render(<VideoJobFooter {...props} />);

    expect(screen.getByRole("button")).toBeEnabled();
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("when not ready, should disable the button", () => {
    render(<VideoJobFooter {...props} canSubmit={false} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("when sending, should show the spinner inside the button", () => {
    render(<VideoJobFooter {...props} isPending />);

    expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
  });

  it("when the creation failed, should say so", () => {
    render(<VideoJobFooter {...props} isError />);

    expect(screen.getByText("Não foi possível criar o job. Tente novamente.")).toBeInTheDocument();
  });

  it("when everything is fine, should not show an error", () => {
    render(<VideoJobFooter {...props} />);

    expect(screen.queryByText(/Não foi possível/)).toBeNull();
  });
});
