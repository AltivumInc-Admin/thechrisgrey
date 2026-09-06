import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import AltiMascot from './AltiMascot';

// The 3D layer is mocked wholesale (jsdom has no WebGL), following the same
// convention as the other 3D surfaces in the repo — but here the mocks RECORD
// what the component hands R3F, so the reduced-motion / tab-visibility contract
// is actually observed rather than mocked away.
const r3f = vi.hoisted(() => ({
  frameCallbacks: [] as Array<(state: { clock: { elapsedTime: number } }) => void>,
  glCanvas: null as HTMLCanvasElement | null,
  created: false,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    frameloop,
    onCreated,
  }: {
    children: React.ReactNode;
    frameloop?: string;
    onCreated?: (state: { gl: { domElement: HTMLCanvasElement } }) => void;
  }) => {
    if (!r3f.created && onCreated) {
      r3f.created = true;
      r3f.glCanvas = document.createElement('canvas');
      onCreated({ gl: { domElement: r3f.glCanvas } });
    }
    return (
      <div data-testid="r3f-canvas" data-frameloop={frameloop}>
        {children}
      </div>
    );
  },
  useFrame: (cb: (state: { clock: { elapsedTime: number } }) => void) => {
    r3f.frameCallbacks.push(cb);
  },
}));

vi.mock('@react-three/drei', () => ({
  useGLTF: () => ({ scene: { isObject3D: true } }),
}));

const setReducedMotion = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
};

/**
 * The R3F `<group>` renders as an unknown DOM element in jsdom, so it has no
 * three.js transform objects. Giving it stand-ins lets the captured useFrame
 * callback be invoked for real: if the `!animate` guard is ever dropped, these
 * values move under reduced motion and the test fails.
 */
function primeGroupTransforms(container: HTMLElement) {
  const group = container.querySelector('group') as unknown as {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  } | null;
  if (!group) throw new Error('AltiModel did not render its group');
  group.position = { x: 0, y: 0, z: 0 };
  group.rotation = { x: 0, y: 0, z: 0 };
  return group;
}

const runFrame = (elapsedTime = 1.5) => {
  expect(r3f.frameCallbacks).toHaveLength(1);
  act(() => {
    r3f.frameCallbacks[0]({ clock: { elapsedTime } });
  });
};

describe('AltiMascot', () => {
  let consoleError: typeof console.error;

  beforeEach(() => {
    r3f.frameCallbacks = [];
    r3f.glCanvas = null;
    r3f.created = false;
    setReducedMotion(false);
    setDocumentHidden(false);

    // React logs a casing warning for every R3F intrinsic (<ambientLight>,
    // <primitive>) rendered as a DOM element here. Filter just those; anything
    // else still surfaces.
    consoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const message = String(args[0] ?? '');
      if (/incorrect casing|unrecognized in this browser|non-boolean attribute|Invalid DOM property/i.test(message)) {
        return;
      }
      consoleError(...args);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setReducedMotion(false);
    setDocumentHidden(false);
  });

  describe('frameloop contract', () => {
    it('runs the loop continuously when the tab is visible and motion is allowed', () => {
      render(<AltiMascot />);
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'always');
    });

    it('renders on demand only under prefers-reduced-motion', () => {
      setReducedMotion(true);
      render(<AltiMascot />);
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'demand');
    });

    it('stops the loop while the tab is backgrounded and resumes on return', () => {
      render(<AltiMascot />);
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'always');

      setDocumentHidden(true);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'never');

      setDocumentHidden(false);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'always');
    });

    it('keeps honoring reduced motion even while the tab is visible', () => {
      // The visibility branch must not be allowed to override the accessibility
      // one: 'demand' wins over 'always'.
      setReducedMotion(true);
      render(<AltiMascot />);

      setDocumentHidden(false);
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('data-frameloop', 'demand');
    });
  });

  describe('idle animation', () => {
    it('animates the model on each frame when motion is allowed', () => {
      const { container } = render(<AltiMascot />);
      const group = primeGroupTransforms(container);

      runFrame();

      expect(group.position.y).not.toBe(0);
      expect(group.rotation.z).not.toBe(0);
    });

    it('leaves the model untouched under prefers-reduced-motion', () => {
      setReducedMotion(true);
      const { container } = render(<AltiMascot />);
      const group = primeGroupTransforms(container);

      runFrame();

      expect(group.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(group.rotation).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('WebGL context loss', () => {
    it('tells the caller when the context is lost after mount', () => {
      const onContextLost = vi.fn();
      render(<AltiMascot onContextLost={onContextLost} />);

      expect(r3f.glCanvas).not.toBeNull();
      act(() => {
        r3f.glCanvas!.dispatchEvent(new Event('webglcontextlost'));
      });

      expect(onContextLost).toHaveBeenCalledOnce();
    });

    it('detaches the listener on unmount', () => {
      const onContextLost = vi.fn();
      const { unmount } = render(<AltiMascot onContextLost={onContextLost} />);
      const canvasEl = r3f.glCanvas!;

      unmount();
      canvasEl.dispatchEvent(new Event('webglcontextlost'));

      expect(onContextLost).not.toHaveBeenCalled();
    });

    it('does not throw when no handler is supplied', () => {
      render(<AltiMascot />);
      expect(() => r3f.glCanvas!.dispatchEvent(new Event('webglcontextlost'))).not.toThrow();
    });
  });
});
