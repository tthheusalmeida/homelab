import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TagBadges } from "./TagBadges";
import { tooltipTextOf } from "#test/tooltip";

describe("TagBadges", () => {
  it("when tags fit the limit, should show all and no counter", () => {
    render(<TagBadges tags={["a", "b", "c"]} />);

    expect(screen.getByText("c")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("when there are more tags than the limit, should show +N with the rest in the tooltip", async () => {
    render(<TagBadges tags={["a", "b", "c", "d", "e"]} />);

    expect(screen.queryByText("d")).not.toBeInTheDocument();
    expect(await tooltipTextOf(screen.getByText("+2"))).toBe("d, e");
  });

  it("when max is set, should respect it", () => {
    render(<TagBadges tags={["a", "b", "c"]} max={1} />);

    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("when there are no tags, should render nothing", () => {
    const { container } = render(<TagBadges tags={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
