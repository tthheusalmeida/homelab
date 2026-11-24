import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProviderLogo } from './ProviderLogo';

describe('ProviderLogo', () => {
  it('when the provider is Gemini, should show its image', () => {
    const { container } = render(<ProviderLogo provider="gemini" label="Google" />);
    const image = container.querySelector('[data-provider-logo="gemini"] img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toMatch(/gemini/);
  });

  it('when the provider is Anthropic, should show its image', () => {
    const { container } = render(<ProviderLogo provider="anthropic" label="Anthropic" />);
    const image = container.querySelector('[data-provider-logo="anthropic"] img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toMatch(/anthropic/);
  });

  it('when the image has its own background, should fill the square without a frame', () => {
    const { container } = render(<ProviderLogo provider="anthropic" label="Anthropic" />);

    expect(container.firstElementChild).not.toHaveClass('border');
    expect(container.querySelector('img')).toHaveClass('size-full');
  });

  it('when the image is a bare mark, should sit inside the framed square', () => {
    const { container } = render(<ProviderLogo provider="gemini" label="Google" />);

    expect(container.firstElementChild).toHaveClass('border');
  });

  it('when the provider has no image, should show the first letter of its name', () => {
    const { container } = render(<ProviderLogo provider="outra" label="outra ia" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('O');
  });

  it('when rendered, should be decorative for screen readers', () => {
    const { container } = render(<ProviderLogo provider="gemini" label="Google" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });
});
