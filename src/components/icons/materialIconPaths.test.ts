import { describe, it, expect } from 'vitest';
import { MATERIAL_ICON_PATHS } from './materialIconPaths';

/**
 * Guards against regeneration drift: the committed path map must cover every
 * Material Icons glyph name referenced in src/. The set below exercises each
 * usage shape the scanner handles (static <Icon name="...">, data-array
 * `icon:` fields, ternary branches, `?? 'fallback'`, and Record-map values
 * like kindIcon). If a new icon is added to the app without regenerating the
 * path map, add it here and run scripts/scan-material-icons.mjs +
 * scripts/extract-material-icons-svg.py + scripts/build-material-icon-paths.mjs.
 */
const EXPECTED_ICONS = [
  // Static <Icon name="..."> usages
  'podcasts',
  'menu_book',
  'cloud_off',
  'article',
  'support_agent',
  'architecture',
  'open_in_new',
  'arrow_forward',
  'arrow_back',
  'play_arrow',
  'play_circle',
  'picture_as_pdf',
  'download',
  'library_books',
  'search_off',
  'delete_sweep',
  'refresh',
  'send',
  'close',
  'check',
  'check_circle',
  'error_outline',
  'mark_email_read',
  'hourglass_empty',
  'bookmark_added',
  'mail',
  'draft', // aliased to "drafts" at extraction time
  'monitoring', // aliased to "monitor" at extraction time
  // Data-array `icon:` fields (Contact topics, credentials, PortableText, etc.)
  'phone',
  'email',
  'business_center',
  'person',
  'cloud',
  'military_tech',
  'rocket_launch',
  'psychology',
  'shield',
  'medical_services',
  'school',
  'schema',
  'terminal',
  'auto_awesome',
  'info',
  'lightbulb',
  'warning',
  'priority_high',
  'edit_note',
  'auto_awesome_mosaic',
  'explore',
  'bookmark_border',
  // Ternary / fallback branches
  'visibility',
  'visibility_off',
  'search',
  'menu',
  'image',
  'code',
  'content_copy',
  'expand_less',
  'expand_more',
  'link',
  // Record-map values (ArtifactCard kindIcon)
  'stars',
  'extension',
  'hub',
  // Misc
  'language',
  'delete',
  'edit',
  'add',
  'save',
  'settings',
  'tune',
  'verified_user',
  'warning_amber',
  'help_outline',
  'hourglass_bottom',
  'graphic_eq',
  'dns',
  'north_east',
  'payments',
  'remove',
  'report_problem',
  'restart_alt',
  'rotate_left',
  'rotate_right',
  'star',
  'rss', // platform identifier; intentionally NOT in the map
  'spotify', // platform identifier; intentionally NOT in the map
  'youtube', // platform identifier; intentionally NOT in the map
] as const;

describe('MATERIAL_ICON_PATHS coverage', () => {
  it('covers every icon name referenced in src/ except platform identifiers', () => {
    const platformIdentifiers = new Set(['rss', 'spotify', 'youtube']);
    const missing: string[] = [];
    for (const name of EXPECTED_ICONS) {
      if (platformIdentifiers.has(name)) {
        // Platform identifiers render via PodcastPlatformIcons inline SVGs,
        // NOT via <Icon>, so they must be absent from the Material Icons map.
        expect(MATERIAL_ICON_PATHS[name as keyof typeof MATERIAL_ICON_PATHS]).toBeUndefined();
        continue;
      }
      if (!(name in MATERIAL_ICON_PATHS)) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it('contains a non-empty path for every covered glyph', () => {
    for (const name of Object.keys(MATERIAL_ICON_PATHS)) {
      const path = MATERIAL_ICON_PATHS[name as keyof typeof MATERIAL_ICON_PATHS];
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    }
  });
});
