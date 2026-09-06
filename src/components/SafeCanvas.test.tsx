import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SafeCanvas from './SafeCanvas';

// Stand in for the telemetry sink so the boundary's report can be inspected.
// isRumInitialized is forced true — otherwise componentDidCatch takes the
// console-logger branch and nothing observable is recorded.
vi.mock('../utils/rum', () => ({
  isRumInitialized: true,
  captureError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
import { captureError } from '../utils/rum';
const mockedCaptureError = vi.mocked(captureError);

// A child that throws during render — simulates a GLB-parse / R3F-init failure.
function Boom(): never {
  throw new Error('webgl mount failed');
}

describe('SafeCanvas', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders children when they mount cleanly', () => {
    render(
      <SafeCanvas fallback={<div data-testid="fallback" />}>
        <div data-testid="child">ok</div>
      </SafeCanvas>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
  });

  it('renders the fallback and does NOT propagate when a child throws on mount', () => {
    // ErrorBoundary.componentDidCatch console.errors; silence it for a clean run.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      render(
        <SafeCanvas fallback={<div data-testid="fallback" />}>
          <Boom />
        </SafeCanvas>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    errSpy.mockRestore();
  });

  it('defaults to a null fallback (renders nothing, not the error page) when none is provided', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <SafeCanvas>
        <Boom />
      </SafeCanvas>,
    );

    // The null default must degrade to nothing so a static visual behind the
    // canvas shows through — NOT the full-screen "Something went wrong" page.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refresh page/i })).not.toBeInTheDocument();
    errSpy.mockRestore();
  });

  it('names the surface in the error report instead of filing it as unknown', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SafeCanvas fallback={<div data-testid="fallback" />} pageName="Alti mascot">
        <Boom />
      </SafeCanvas>,
    );

    expect(mockedCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ pageName: 'Alti mascot' }),
    );
    errSpy.mockRestore();
  });
});
