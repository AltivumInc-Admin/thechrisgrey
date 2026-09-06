import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ForgetStatusBanner from './ForgetStatusBanner';

describe('ForgetStatusBanner', () => {
  it('renders nothing before a forget attempt', () => {
    const { container } = render(<ForgetStatusBanner status={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces a successful outcome politely', () => {
    render(
      <ForgetStatusBanner status={{ ok: true, message: "I've forgotten 3 saved item(s)." }} onDismiss={vi.fn()} />,
    );
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText("I've forgotten 3 saved item(s).")).toBeInTheDocument();
    // A privacy action reports through the site's own UI, never window.alert.
    expect(document.querySelector('[data-material-icon="check"]')).not.toBeNull();
  });

  it('styles a failure distinctly from a success', () => {
    render(<ForgetStatusBanner status={{ ok: false, message: 'Unable to clear right now.' }} onDismiss={vi.fn()} />);
    expect(screen.getByText('Unable to clear right now.').closest('p')?.className).toContain('text-red-300');
    expect(document.querySelector('[data-material-icon="error_outline"]')).not.toBeNull();
  });

  it('is dismissible', () => {
    const onDismiss = vi.fn();
    render(<ForgetStatusBanner status={{ ok: true, message: 'Done.' }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss notice/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
