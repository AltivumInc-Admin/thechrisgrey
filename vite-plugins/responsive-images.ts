import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

/**
 * Vite plugin that turns `import src from './img.jpeg?responsive'` into a
 * module describing AVIF + WebP + JPEG fallback variants at multiple widths,
 * so a <ResponsiveImage> component can emit a <picture> with srcset/sizes
 * (VAL-PERF-004/005).
 *
 * Default export shape:
 *   {
 *     fallback: { src, width, height },  // optimized JPEG (or PNG) at max width
 *     avif:     [{ src, width }, ...],
 *     webp:     [{ src, width }, ...],
 *     width, height,                     // intrinsic dimensions of the source
 *   }
 *
 * Variants are generated with sharp at build time and emitted as hashed
 * assets. In dev (and `vite preview`-equivalent SSR-less dev) the generated
 * buffers are served from an in-memory cache via a middleware so the dev server
 * serves the same variants the build would emit.
 */
const QUERY = '?responsive';
const RASTER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export interface ResponsiveImagesOptions {
  widths?: number[];
  avifQuality?: number;
  webpQuality?: number;
  jpegQuality?: number;
}

export interface ResponsiveVariant {
  src: string;
  width: number;
}
export interface ResponsiveImageSource {
  fallback: { src: string; width: number; height: number };
  avif: ResponsiveVariant[];
  webp: ResponsiveVariant[];
  width: number;
  height: number;
}

interface GeneratedVariant {
  width: number;
  format: 'avif' | 'webp' | 'jpeg' | 'png';
  buffer: Buffer;
}

async function generateVariants(
  file: string,
  ext: string,
  widths: number[],
  opts: Required<ResponsiveImagesOptions>,
): Promise<{
  variants: GeneratedVariant[];
  width: number;
  height: number;
}> {
  const buffer = await fs.readFile(file);
  const meta = await sharp(buffer).metadata();
  const origWidth = meta.width ?? 0;
  const origHeight = meta.height ?? 0;
  if (!origWidth || !origHeight) {
    throw new Error(`[responsive-images] could not read dimensions for ${file}`);
  }

  // Widths to generate, capped at the source width (never upscale).
  const targetWidths = [...new Set([...widths.filter((w) => w <= origWidth), origWidth])].sort((a, b) => a - b);

  const variants: GeneratedVariant[] = [];
  const fallbackFormat: 'jpeg' | 'png' = ext === '.png' ? 'png' : 'jpeg';

  for (const w of targetWidths) {
    const base = sharp(buffer).resize({ width: w, withoutEnlargement: true });
    variants.push({
      width: w,
      format: 'avif',
      buffer: await base.clone().avif({ quality: opts.avifQuality, effort: 4 }).toBuffer(),
    });
    variants.push({
      width: w,
      format: 'webp',
      buffer: await base.clone().webp({ quality: opts.webpQuality }).toBuffer(),
    });
  }

  // Fallback at the largest generated width (same format family as source for
  // PNG to preserve transparency; JPEG otherwise).
  const maxW = targetWidths[targetWidths.length - 1];
  const fbBuffer =
    fallbackFormat === 'png'
      ? await sharp(buffer)
          .resize({ width: maxW, withoutEnlargement: true })
          .png({ quality: opts.jpegQuality })
          .toBuffer()
      : await sharp(buffer)
          .resize({ width: maxW, withoutEnlargement: true })
          .jpeg({ quality: opts.jpegQuality })
          .toBuffer();
  variants.push({ width: maxW, format: fallbackFormat, buffer: fbBuffer });

  return { variants, width: origWidth, height: origHeight };
}

export function responsiveImagesPlugin(opts: ResponsiveImagesOptions = {}) {
  const config: Required<ResponsiveImagesOptions> = {
    widths: opts.widths ?? [480, 800, 1200, 1920],
    avifQuality: opts.avifQuality ?? 55,
    webpQuality: opts.webpQuality ?? 70,
    jpegQuality: opts.jpegQuality ?? 78,
  };

  let command: 'serve' | 'build' = 'build';
  let base = '/';
  // Dev cache: urlPath -> buffer. Keyed by a stable path under /@responsive/.
  const devCache = new Map<string, Buffer>();

  return {
    name: 'vite-plugin-responsive-images',
    enforce: 'pre' as const,
    configResolved(c: { command: 'serve' | 'build'; base?: string }) {
      command = c.command;
      base = c.base ?? '/';
    },
    configureServer(server: { middlewares: { use: (handler: (req: any, res: any, next: any) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/@responsive/')) return next();
        const buf = devCache.get(url);
        if (!buf) return next();
        const ext = path.extname(url).toLowerCase();
        const type =
          ext === '.avif' ? 'image/avif' : ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(buf);
      });
    },
    async load(id: string) {
      if (!id.includes(QUERY)) return null;
      const file = id.slice(0, id.indexOf(QUERY));
      const ext = path.extname(file).toLowerCase();
      if (!RASTER_EXT.has(ext)) return null;

      const { variants, width, height } = await generateVariants(file, ext, config.widths, config);
      const nameBase = path.basename(file, ext);
      const hash = crypto.createHash('sha1').update(file).digest('hex').slice(0, 8);

      if (command === 'build') {
        // Emit each variant as a hashed asset and reference it via a
        // base-relative URL (`${base}${fileName}`). We intentionally avoid
        // `import.meta.ROLLUP_FILE_URL_*` because that resolves to an absolute
        // URL (`new URL(..., import.meta.url).href`), which the prerenderer
        // serializes with the localhost origin — breaking the deployed static
        // HTML. A root-relative path mirrors how Vite's built-in asset plugin
        // emits regular `import x from './img.png'` URLs.
        const variantEntries = variants.map((v) => {
          const fileName = `assets/${nameBase}-${hash}-${v.width}w.${v.format}`;
          // @ts-expect-error emitFile is available on the Rollup plugin context
          this.emitFile({ type: 'asset', fileName, source: v.buffer });
          const src = `${base}${fileName}`;
          return { src, width: v.width, format: v.format };
        });

        const avifList = variantEntries
          .filter((v) => v.format === 'avif')
          .map((v) => `{ src: ${JSON.stringify(v.src)}, width: ${v.width} }`)
          .join(',');
        const webpList = variantEntries
          .filter((v) => v.format === 'webp')
          .map((v) => `{ src: ${JSON.stringify(v.src)}, width: ${v.width} }`)
          .join(',');
        const fb = variantEntries.find((v) => v.format === 'jpeg' || v.format === 'png');

        const module = `
export const fallback = { src: ${JSON.stringify(fb!.src)}, width: ${fb!.width}, height: ${height} };
export const avif = [${avifList}];
export const webp = [${webpList}];
export const width = ${width};
export const height = ${height};
export default { fallback, avif, webp, width, height };
`;
        return module;
      }

      // Dev: serve generated buffers from the in-memory cache.
      const avif: { src: string; width: number }[] = [];
      const webp: { src: string; width: number }[] = [];
      let fallback = { src: '', width: 0, height };
      for (const v of variants) {
        const urlPath = `/@responsive/${nameBase}-${hash}-${v.width}w.${v.format}`;
        devCache.set(urlPath, v.buffer);
        if (v.format === 'avif') avif.push({ src: urlPath, width: v.width });
        else if (v.format === 'webp') webp.push({ src: urlPath, width: v.width });
        else fallback = { src: urlPath, width: v.width, height };
      }
      const module = `
export const fallback = ${JSON.stringify(fallback)};
export const avif = ${JSON.stringify(avif)};
export const webp = ${JSON.stringify(webp)};
export const width = ${width};
export const height = ${height};
export default { fallback, avif, webp, width, height };
`;
      return module;
    },
  };
}
