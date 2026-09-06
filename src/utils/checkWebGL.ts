let cachedResult: boolean | null = null;

export function checkWebGLSupport(): boolean {
  if (cachedResult !== null) return cachedResult;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    cachedResult = gl !== null;

    // Hand the probe's context straight back. Browsers cap concurrent WebGL
    // contexts per page and force-lose the oldest once the cap is hit; without
    // this the throwaway probe keeps a live context (and its GPU memory) until
    // the canvas is collected, competing with the real ones on pages that mount
    // two (the chat mascot plus the /aws topology).
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedResult = false;
  }

  return cachedResult!;
}

/**
 * Test-only escape hatch for the write-once cache above. The cache is
 * deliberately permanent at runtime (the probe must cost at most one context
 * per page), which otherwise makes this module impossible to exercise in
 * process: the first case to run would latch the answer for every later one.
 */
export function resetWebGLSupportCache(): void {
  cachedResult = null;
}
