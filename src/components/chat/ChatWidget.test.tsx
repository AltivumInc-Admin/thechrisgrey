import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChatWidget from './ChatWidget';

// Mock child components to isolate ChatWidget orchestration logic
vi.mock('./ChatWidgetButton', () => ({
  default: ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => (
    <button data-testid="widget-button" onClick={onClick} aria-expanded={isOpen}>
      {isOpen ? 'Close' : 'Open'}
    </button>
  ),
}));

vi.mock('./ChatWidgetPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="widget-panel">
      <button onClick={onClose}>Close Panel</button>
    </div>
  ),
}));

describe('ChatWidget', () => {
  const renderWidget = () =>
    render(
      <MemoryRouter>
        <ChatWidget />
      </MemoryRouter>,
    );

  it('should render the button initially', () => {
    renderWidget();
    expect(screen.getByTestId('widget-button')).toBeInTheDocument();
  });

  it('should not show the panel initially', () => {
    renderWidget();
    expect(screen.queryByTestId('widget-panel')).not.toBeInTheDocument();
  });

  it('should open the panel when button is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByTestId('widget-button'));
    // The panel is lazy-loaded (VAL-PERF-013), so it appears asynchronously
    // once the dynamic chunk resolves. findByTestId waits for it.
    expect(await screen.findByTestId('widget-panel')).toBeInTheDocument();
  });

  it('should close the panel when button is toggled again', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByTestId('widget-button'));
    expect(await screen.findByTestId('widget-panel')).toBeInTheDocument();

    await user.click(screen.getByTestId('widget-button'));
    expect(screen.queryByTestId('widget-panel')).not.toBeInTheDocument();
  });

  it('should close the panel when onClose is called from the panel', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByTestId('widget-button'));
    expect(await screen.findByTestId('widget-panel')).toBeInTheDocument();

    await user.click(screen.getByText('Close Panel'));
    expect(screen.queryByTestId('widget-panel')).not.toBeInTheDocument();
  });
});
