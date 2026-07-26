// Module augmentation: @types/react 19.2.x declares `fetchPriority` on
// ImgHTMLAttributes, LinkHTMLAttributes, and ScriptHTMLAttributes, but NOT on
// MediaHTMLAttributes (the base for <video> and <audio>). The HTML spec allows
// the `fetchpriority` attribute on media elements, and React 19 passes the
// camelCase `fetchPriority` prop through to the DOM as `fetchpriority`.
// Re-open MediaHTMLAttributes here so the hero <video> can be typed cleanly.
// Track upstream: once @types/react ships fetchPriority on MediaHTMLAttributes,
// this file can be deleted.
import 'react';

declare module 'react' {
  // The type parameter must be named `T` to match the original
  // `MediaHTMLAttributes<T>` signature — TypeScript interface declaration
  // merging requires identical type-parameter names. `T` is used by the
  // members inherited via `extends HTMLAttributes<T>` in the original
  // declaration; the member we add here does not reference it, which is why
  // the unused-var rule is suppressed for this line only.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface MediaHTMLAttributes<T> {
    fetchPriority?: 'high' | 'low' | 'auto' | undefined;
  }
}
