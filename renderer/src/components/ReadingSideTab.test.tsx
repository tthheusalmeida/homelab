import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadingSideTab } from './ReadingSideTab';

describe('ReadingSideTab', () => {
  it('when rendered, should be a decorative hexagon with a panel icon', () => {
    const { container } = render(<ReadingSideTab className="extra" />);

    const tab = container.firstElementChild as HTMLElement;

    expect(tab).toHaveAttribute('aria-hidden', 'true');
    expect(tab.className).toContain('clip-path:polygon(50%_0');
    expect(tab).toHaveClass('extra');
    expect(tab.querySelector('svg')).toBeInTheDocument();
  });

  it('when rendered, should be inverted against the reading background (ink as fill, background as icon)', () => {
    const { container } = render(<ReadingSideTab />);

    const tab = container.firstElementChild as HTMLElement;

    expect(tab.className).toContain('bg-[var(--reading-tab-bg,var(--foreground))]');
    expect(tab.className).toContain('text-[var(--reading-tab-fg,var(--background))]');
  });
});
