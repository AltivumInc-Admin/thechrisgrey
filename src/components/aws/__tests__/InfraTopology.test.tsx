import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { checkWebGLSupport } from '../../../utils/checkWebGL';
import { isPrerender } from '../../../utils/prerender';
import { InfraTopology } from '../InfraTopology';

vi.mock('../../../utils/checkWebGL', () => ({
  checkWebGLSupport: vi.fn(),
}));

vi.mock('../../../utils/prerender', () => ({
  isPrerender: vi.fn(() => false),
}));

vi.mock('../TopologyScene', () => ({
  TopologyScene: () => <div data-testid="topology-scene" />,
}));

vi.mock('../TopologyFallback2D', () => ({
  TopologyFallback2D: () => <div data-testid="topology-fallback" />,
}));

// Mock useMediaQuery -- default to desktop
vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

const mockedCheckWebGL = vi.mocked(checkWebGLSupport);
const mockedIsPrerender = vi.mocked(isPrerender);

describe('InfraTopology', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIsPrerender.mockReturnValue(false);
  });

  it('renders section header "What is the infrastructure stack?"', () => {
    mockedCheckWebGL.mockReturnValue(false);
    render(<InfraTopology />);

    expect(screen.getByText('What is the infrastructure stack?')).toBeInTheDocument();
  });

  it('renders the fallback when checkWebGLSupport returns false', () => {
    mockedCheckWebGL.mockReturnValue(false);
    render(<InfraTopology />);

    expect(screen.getByTestId('topology-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('topology-scene')).not.toBeInTheDocument();
  });

  it('renders the 2D fallback during a build-time prerender crawl, even with WebGL', () => {
    mockedCheckWebGL.mockReturnValue(true);
    mockedIsPrerender.mockReturnValue(true);
    render(<InfraTopology />);

    expect(screen.getByTestId('topology-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('topology-scene')).not.toBeInTheDocument();
  });
});
