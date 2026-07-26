// Ambient module declarations for the `?responsive` query handled by
// vite-plugins/responsive-images.ts. This file is a GLOBAL SCRIPT (no
// top-level import/export) so the wildcard `declare module` entries are
// treated as global ambient declarations, matching Vite's own client.d.ts
// pattern (`declare module '*?url'`, etc.).
//
// The shape mirrors src/components/ResponsiveImage.tsx's ResponsiveImageSource.

interface ResponsiveImageFallback {
  src: string;
  width: number;
  height: number;
}
interface ResponsiveImageVariant {
  src: string;
  width: number;
}
interface ResponsiveImageModuleSource {
  fallback: ResponsiveImageFallback;
  avif: ResponsiveImageVariant[];
  webp: ResponsiveImageVariant[];
  width: number;
  height: number;
}

declare module '*?responsive' {
  const src: ResponsiveImageModuleSource;
  export default src;
}
