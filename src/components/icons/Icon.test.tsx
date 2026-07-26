import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icon from './Icon';

describe('Icon', () => {
  it('renders an inline <svg> with the glyph path and a data-material-icon hook', () => {
    const { container } = render(<Icon name="cloud_off" className="text-xl" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('data-material-icon')).toBe('cloud_off');
    expect(svg?.querySelector('path')).not.toBeNull();
    // Scales with font-size (1em) so existing text-size utilities still work.
    expect(svg?.getAttribute('width')).toBe('1em');
    expect(svg?.getAttribute('height')).toBe('1em');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
  });

  it('is aria-hidden by default (decorative)', () => {
    const { container } = render(<Icon name="close" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a labeled img role when aria-label is provided', () => {
    const { container } = render(<Icon name="download" aria-label="Download" aria-hidden={false} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Download');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
  });

  it('renders nothing for an unknown glyph name (safety net)', () => {
    const { container } = render(<Icon name="this_icon_does_not_exist" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('accepts aria-hidden="true" string from JSX attributes', () => {
    const { container } = render(<Icon name="menu" aria-hidden="true" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
