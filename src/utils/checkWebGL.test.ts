import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkWebGLSupport, resetWebGLSupportCache } from './checkWebGL';

type ContextStub = { getExtension: ReturnType<typeof vi.fn> };

/**
 * Installs a fake <canvas> whose getContext is driven by `impl`, and returns the
 * spy so a case can count probes. jsdom has no WebGL, so the real probe would
 * always answer false and the cache would latch it for the whole file.
 */
function stubCanvas(impl: (id: string) => unknown) {
  const getContext = vi.fn((id: string) => impl(id));
  const createElement = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'canvas') return { getContext } as unknown as HTMLCanvasElement;
    throw new Error(`unexpected createElement(${tag})`);
  }) as typeof document.createElement);
  return { getContext, createElement };
}

function contextStub(): ContextStub {
  const loseContext = vi.fn();
  return { getExtension: vi.fn(() => ({ loseContext })) };
}

describe('checkWebGLSupport', () => {
  beforeEach(() => {
    resetWebGLSupportCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetWebGLSupportCache();
  });

  it('reports support when the canvas yields a webgl2 context', () => {
    stubCanvas((id) => (id === 'webgl2' ? contextStub() : null));
    expect(checkWebGLSupport()).toBe(true);
  });

  it('falls back to webgl1 when webgl2 is unavailable', () => {
    const { getContext } = stubCanvas((id) => (id === 'webgl' ? contextStub() : null));
    expect(checkWebGLSupport()).toBe(true);
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(getContext).toHaveBeenCalledWith('webgl');
  });

  it('reports no support when neither context is available', () => {
    stubCanvas(() => null);
    expect(checkWebGLSupport()).toBe(false);
  });

  it('reports no support when getContext throws', () => {
    stubCanvas(() => {
      throw new Error('GPU blocklisted');
    });
    expect(checkWebGLSupport()).toBe(false);
  });

  it('releases the probe context instead of holding a GPU slot for the page lifetime', () => {
    const ctx = contextStub();
    stubCanvas((id) => (id === 'webgl2' ? ctx : null));

    checkWebGLSupport();

    expect(ctx.getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    const extension = ctx.getExtension.mock.results[0].value as { loseContext: ReturnType<typeof vi.fn> };
    expect(extension.loseContext).toHaveBeenCalledOnce();
  });

  it('probes at most once per page and replays the cached answer', () => {
    const { getContext, createElement } = stubCanvas((id) => (id === 'webgl2' ? contextStub() : null));

    expect(checkWebGLSupport()).toBe(true);
    expect(checkWebGLSupport()).toBe(true);
    expect(checkWebGLSupport()).toBe(true);

    expect(createElement).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledTimes(1);
  });

  it('caches a negative answer too, so a blocklisted GPU is not re-probed', () => {
    const { createElement } = stubCanvas(() => null);

    expect(checkWebGLSupport()).toBe(false);
    expect(checkWebGLSupport()).toBe(false);

    expect(createElement).toHaveBeenCalledTimes(1);
  });
});
