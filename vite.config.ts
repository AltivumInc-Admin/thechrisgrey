import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { execSync } from 'child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { responsiveImagesPlugin } from './vite-plugins/responsive-images';

// Git commit hash for RUM release ID (source map resolution in CloudWatch).
// Amplify sets AWS_COMMIT_ID during builds; fall back to local git, then 'dev'.
function getReleaseId(): string {
  if (process.env.AWS_COMMIT_ID) return process.env.AWS_COMMIT_ID.substring(0, 12);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const releaseId = getReleaseId();

// Vite plugin: remove generated source maps from dist/ after the build so they
// are never deployed publicly (VAL-SEC-011). Hidden source maps (`sourcemap:
// 'hidden'`) are generated for Sentry/RUM upload — when SENTRY_AUTH_TOKEN is
// set, the Sentry plugin uploads them and deletes the local copies via
// `filesToDeleteAfterUpload`. This plugin ensures .map files are removed from
// dist/ even when Sentry upload is not configured (local builds, CI without the
// token). Runs in `closeBundle` (after the Sentry plugin's upload/delete) so
// it never interferes with the upload. The `force: true` flag makes deletion
// idempotent — a no-op if the files were already removed by Sentry.
function removeSourcemapsPlugin() {
  return {
    name: 'remove-sourcemaps-from-dist',
    apply: 'build' as const,
    closeBundle() {
      const distDir = join(process.cwd(), 'dist');
      try {
        // recursive: true is supported in Node 18.17+ / 20+.
        const entries = readdirSync(distDir, { recursive: true });
        for (const entry of entries) {
          const file = String(entry);
          if (file.endsWith('.map')) {
            rmSync(join(distDir, file), { force: true });
          }
        }
      } catch {
        // dist/ may not exist if the build failed — nothing to clean up.
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  // Persistent dependency optimization cache — speeds up dev server starts and
  // builds by caching pre-bundled deps. In CI, this is paired with
  // actions/cache for node_modules/.vite (see .github/workflows/ci.yml).
  cacheDir: 'node_modules/.vite',
  plugins: [
    react(),
    // Responsive <picture> source generation: `import img from './x.jpeg?responsive'`
    // emits AVIF + WebP + JPEG fallback variants at multiple widths
    // (VAL-PERF-004/005). Runs before the asset plugin so the custom query is
    // handled here instead of being treated as a plain asset URL.
    responsiveImagesPlugin({
      widths: [480, 800, 1200, 1920],
      avifQuality: 55,
      webpQuality: 70,
      jpegQuality: 78,
    }),
    ViteImageOptimizer({
      include: ['**/*.{jpg,jpeg,png,webp}'],
      exclude: [/^[^/]+\.(jpg|jpeg|png|webp)$/],
      jpg: { quality: 80 },
      jpeg: { quality: 80 },
      png: { quality: 80 },
      webp: { quality: 80 },
    }),
    // Sentry source map upload — only active when SENTRY_AUTH_TOKEN is set
    // (CI/Amplify build env). Locally, the plugin is a no-op.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG || 'thechrisgrey',
            project: process.env.SENTRY_PROJECT || 'thechrisgrey',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: releaseId },
            sourcemaps: { filesToDeleteAfterUpload: ['**/*.js.map'] },
          }),
        ]
      : []),
    // Remove .map files from dist/ after build (VAL-SEC-011). Placed after the
    // Sentry plugin so it runs after any Sentry upload. Ensures source maps are
    // never deployed publicly, even in local builds without SENTRY_AUTH_TOKEN.
    removeSourcemapsPlugin(),
  ],
  define: {
    'import.meta.env.VITE_RUM_RELEASE_ID': JSON.stringify(releaseId),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'router', test: /[\\/]react-router(?:-dom)?[\\/]/, priority: 30 },
            { name: 'vendor', test: /[\\/]react(?:-dom)?[\\/]/, priority: 20 },
            {
              name: 'sanity',
              test: /[\\/](?:@sanity[\\/](?:client|image-url)|@portabletext[\\/]react)[\\/]/,
              priority: 20,
            },
            { name: 'cognito', test: /[\\/]@aws-sdk[\\/]client-cognito-identity-provider[\\/]/, priority: 20 },
            { name: 'three-vendor', test: /[\\/]three[\\/]/, priority: 20 },
            // React Three Fiber + drei. Without a group these land in an
            // unnamed chunk whose filename prefix is derived from whichever
            // module rolldown happens to pick (it was `constants-<hash>.js`),
            // so it moves on any dependency change and cannot be budgeted.
            // Disjoint from three-vendor: `[\\/]three[\\/]` needs a whole
            // `three` path segment, which `@react-three/...` is not.
            { name: 'r3f-vendor', test: /[\\/]@react-three[\\/]/, priority: 20 },
            { name: 'gsap-vendor', test: /[\\/]gsap[\\/]/, priority: 20 },
          ],
        },
      },
    },
    // Hidden sourcemaps: generated for RUM source map upload to S3 and Sentry
    // source map upload, but not referenced in the build output (not deployed).
    sourcemap: 'hidden',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['log', 'info', 'debug', 'trace'],
      },
    },
  },
});
