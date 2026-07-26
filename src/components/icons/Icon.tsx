import { MATERIAL_ICON_PATHS, type MaterialIconName } from './materialIconPaths';

/**
 * Inline-SVG icon replacing the legacy `<span className="material-icons">`
 * ligature-font pattern. The site used to load the render-blocking Google
 * Fonts Material Icons stylesheet; it now ships only the SVG path data for the
 * glyphs actually referenced in the source (VAL-PERF-006/007), so no request to
 * fonts.googleapis.com / fonts.gstatic.com is made and no icon font blocks
 * first paint.
 *
 * The SVG uses `width="1em" height="1em"` so it scales with the parent's
 * `font-size` exactly like the old icon font did, which means existing Tailwind
 * text-size utilities (`text-xl`, `text-sm`, ...) and color utilities
 * (`text-altivum-gold`, via `fill="currentColor"`) keep working unchanged.
 *
 * Icons are decorative by default (`aria-hidden="true"`): they almost always
 * sit next to a text label or inside a labeled button/link. Pass an `aria-label`
 * (and `aria-hidden={false}`) for a standalone meaningful icon.
 */
export interface IconProps {
  /** Material Icons glyph name (e.g. "cloud_off", "arrow_forward"). */
  name: string;
  className?: string;
  style?: React.CSSProperties;
  /** Defaults to `true` (decorative). Set `false` when the icon conveys meaning. */
  'aria-hidden'?: boolean | 'true' | 'false';
  /** Accessible label for a standalone meaningful icon. */
  'aria-label'?: string;
  title?: string;
}

const Icon = ({
  name,
  className,
  style,
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
  title,
}: IconProps) => {
  const path = MATERIAL_ICON_PATHS[name as MaterialIconName];

  if (!path) {
    // Unknown glyph — render nothing rather than the raw ligature text the old
    // font would have shown. This is a safety net; the path map is generated to
    // cover every icon name referenced in src/.
    return null;
  }

  // Normalize aria-hidden (accept "true"/"false" strings from JSX attributes).
  const hidden = ariaHidden === false || ariaHidden === 'false' ? false : true;

  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden={ariaLabel ? undefined : hidden}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      focusable="false"
      // Debug/testability hook: names the glyph so DOM inspection and tests can
      // verify which icon rendered without a font's ligature text node.
      data-material-icon={name}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
};

export default Icon;
