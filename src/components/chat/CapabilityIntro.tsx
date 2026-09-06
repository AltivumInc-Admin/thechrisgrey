import { memo, useState } from 'react';
import { typography } from '../../utils/typography';
import Icon from '../icons/Icon';

/**
 * CapabilityIntro — a collapsible "What Alti can do" rail rendered between the
 * Chat page header and the messages thread. Surfaces the agentic capabilities
 * the dedicated /chat surface unlocks (search, draft, render_ui, navigate,
 * remember) so visitors discover them without trial-and-error.
 *
 * Each capability tile is a button: clicking it PREFILLS the chat input via
 * the parent's handler — it does NOT auto-send. The visitor reads what they
 * are about to ask, edits if they want, then sends.
 *
 * Silver text here never goes below /80. On altivum-dark, altivum-silver/80 is
 * about 5.4:1 but /70 is about 4.3:1 and /50 about 2.8:1 — under the 4.5:1 AA
 * floor these smallText sizes need. The tint is the whole cause; full-strength
 * silver is about 7.8:1.
 */

interface Capability {
  icon: string;
  title: string;
  description: string;
  example: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: 'podcasts',
    title: 'Search the podcast',
    description: 'Quoted passages with timestamps that deep-link into the YouTube moment.',
    example: 'What did guests say about AI in defense?',
  },
  {
    icon: 'menu_book',
    title: 'Search the blog',
    description: 'Find what Christian has written on a topic and read the best match.',
    example: 'What has he written about Strands agents?',
  },
  {
    icon: 'edit_note',
    title: 'Draft outreach for you',
    description: 'Speaking, podcast, consulting, collaboration — Alti drafts it; you review and send.',
    example: "I'd like to invite Christian on my podcast.",
  },
  {
    icon: 'auto_awesome_mosaic',
    title: 'Show visual answers',
    description:
      'Start with "gen-ui" and say what you want — a comparison, timeline, stat row, or link grid — and Alti renders it on demand.',
    example: 'Use gen-ui to compare his military and tech careers.',
  },
  {
    icon: 'explore',
    title: 'Navigate the site',
    description: 'Ask Alti to take you to the right page on thechrisgrey.com.',
    example: 'Take me to his book.',
  },
  {
    icon: 'bookmark_border',
    title: 'Remember you next time',
    description: "Share what you're working on; he will recall it on your next visit.",
    example: "I'm preparing for SFAS.",
  },
];

export interface CapabilityIntroProps {
  onUseExample: (query: string) => void;
  initiallyExpanded?: boolean;
}

const CapabilityIntro = memo(function CapabilityIntro({
  onUseExample,
  initiallyExpanded = false,
}: CapabilityIntroProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <section aria-label="What Alti can do" className="border-b border-white/10 bg-altivum-dark/60 backdrop-blur-xs">
      <div className="max-w-4xl mx-auto px-6">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="capability-intro-content"
          className="w-full flex items-center justify-between py-3 -mx-2 px-2 rounded-md hover:bg-white/2 transition-colors duration-200 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-altivum-gold focus-visible:outline-offset-2"
        >
          <span className="flex items-center gap-2.5">
            <Icon name="auto_awesome" className="text-altivum-gold/70 text-base leading-none" aria-hidden="true" />
            <span className="text-white" style={typography.bodyText}>
              What Alti can do
            </span>
            <span className="text-altivum-silver/80 hidden sm:inline" style={typography.smallText}>
              &middot; search, draft, navigate, remember
            </span>
          </span>
          <Icon
            name="expand_more"
            className={`text-altivum-silver/70 leading-none transition-transform duration-300 ease-out ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        <div
          id="capability-intro-content"
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
          aria-hidden={!expanded}
        >
          <div className="overflow-hidden">
            <div className="pt-1 pb-5">
              <p className="text-altivum-silver/80 mb-4" style={typography.smallText}>
                Alti is more than a chat &mdash; he has tools. Try asking him to&hellip;
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CAPABILITIES.map((cap) => (
                  <button
                    key={cap.title}
                    type="button"
                    onClick={() => onUseExample(cap.example)}
                    tabIndex={expanded ? 0 : -1}
                    aria-label={`Drop into message: ${cap.example}`}
                    className="group text-left px-4 py-3.5 rounded-xl border border-white/8 hover:border-altivum-gold/40 hover:bg-white/3 transition-all duration-200 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-altivum-gold focus-visible:outline-offset-2 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon
                        name={cap.icon}
                        className="text-altivum-gold/70 group-hover:text-altivum-gold text-base leading-none transition-colors duration-200"
                        aria-hidden="true"
                      />
                      <span className="text-white" style={typography.bodyText}>
                        {cap.title}
                      </span>
                    </div>
                    <p className="text-altivum-silver/80 mb-2.5" style={typography.smallText}>
                      {cap.description}
                    </p>
                    <p
                      className="text-altivum-gold/75 italic group-hover:text-altivum-gold flex items-start gap-1.5 transition-colors duration-200"
                      style={typography.smallText}
                    >
                      <Icon name="north_east" className="text-xs leading-tight mt-0.5 shrink-0" aria-hidden="true" />
                      <span>&ldquo;{cap.example}&rdquo;</span>
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-altivum-silver/80 mt-4 text-center" style={typography.smallText}>
                Tap a card to drop it into your message. Results deep-link to the page, post, or moment &mdash; and you
                can ask Alti to forget you anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default CapabilityIntro;
