import { useState } from 'react';
import { PodcastEpisode } from '../types/podcast';
import { typography } from '../utils/typography';
import { formatDate } from '../utils/dateFormatter';
import { SpotifyIcon, ApplePodcastIcon, YouTubeIcon } from './PodcastPlatformIcons';
import { slugify } from '../utils/slugify';
import Icon from './icons/Icon';

interface EpisodeCardProps {
  episode: PodcastEpisode;
  variant?: 'featured' | 'standard' | 'compact';
}

const EpisodeCard = ({ episode, variant = 'standard' }: EpisodeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  // Compact collapsible variant
  if (isCompact) {
    const panelId = `episode-panel-${episode.id}`;
    return (
      <article className="group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
          aria-expanded={isExpanded}
          aria-controls={panelId}
        >
          <div
            className={`
            px-5 py-4 border border-white/10 bg-white/5
            hover:border-altivum-gold/30 hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5
            transition-all duration-300
            ${isExpanded ? 'rounded-t-lg border-b-0' : 'rounded-lg'}
          `}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Episode number */}
                <span className="text-altivum-gold text-sm font-medium whitespace-nowrap">
                  {episode.episodeNumber ? `Ep ${episode.episodeNumber}` : ''}
                </span>

                {/* Title */}
                <h3
                  id={slugify(episode.title)}
                  className="text-white text-sm font-medium truncate group-hover:text-altivum-gold transition-colors"
                >
                  {episode.title}
                </h3>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Duration */}
                <span className="text-altivum-silver text-xs hidden sm:block">{episode.duration}</span>

                {/* Date */}
                <span className="text-altivum-silver text-xs hidden md:block">{formatDate(episode.publishedAt)}</span>

                {/* Expand icon */}
                <Icon
                  name="expand_more"
                  className={`text-altivum-silver text-xl transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div id={panelId} className="px-5 py-5 border border-t-0 border-white/10 bg-white/5 rounded-b-lg">
            {/* Mobile meta (shown when expanded) */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-altivum-silver mb-4 sm:hidden">
              <span>{episode.duration}</span>
              <span className="text-altivum-silver">|</span>
              <span>{formatDate(episode.publishedAt)}</span>
            </div>

            {/* Description */}
            <p className="text-altivum-silver text-sm mb-4 leading-relaxed">{episode.description}</p>

            {/* Listen Links */}
            <div className="flex flex-wrap gap-2">
              {episode.links.youtube && (
                <a
                  href={episode.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF0000]/10 text-[#FF0000] rounded-full text-xs font-medium hover:bg-[#FF0000]/20 transition-colors"
                >
                  <YouTubeIcon className="w-3.5 h-3.5" />
                  YouTube
                </a>
              )}
              {episode.links.spotify && (
                <a
                  href={episode.links.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-xs font-medium hover:bg-[#1DB954]/20 transition-colors"
                >
                  <SpotifyIcon className="w-3.5 h-3.5" />
                  Spotify
                </a>
              )}
              {episode.links.apple && (
                <a
                  href={episode.links.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#872EC4]/10 text-[#872EC4] rounded-full text-xs font-medium hover:bg-[#872EC4]/20 transition-colors"
                >
                  <ApplePodcastIcon className="w-3.5 h-3.5" />
                  Apple
                </a>
              )}
            </div>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={`group ${isFeatured ? 'col-span-full' : ''}`}>
      <div
        className={`
        p-6 sm:p-8 rounded-lg border border-white/10 bg-white/5
        hover:border-altivum-gold/30 hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-altivum-gold/5
        transition-all duration-300
        ${isFeatured ? 'lg:flex lg:gap-10' : ''}
      `}
      >
        {/* Thumbnail */}
        {isFeatured && (
          <div className="relative overflow-hidden rounded-lg mb-6 lg:w-2/5 lg:mb-0 aspect-video bg-linear-to-br from-altivum-navy to-altivum-dark flex items-center justify-center">
            {episode.thumbnail ? (
              <img src={episode.thumbnail} alt={episode.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="text-center p-6">
                <Icon name="podcasts" className="text-6xl text-altivum-gold/50 mb-2" />
                <div className="text-altivum-gold font-medium">
                  S{episode.seasonNumber} E{episode.episodeNumber}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 rounded-sm text-sm text-white font-medium">
              {episode.duration}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={isFeatured ? 'lg:flex-1' : ''}>
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider font-medium mb-4">
            {episode.episodeNumber && (
              <span className="text-altivum-gold">
                {episode.seasonNumber ? `S${episode.seasonNumber} ` : ''}Episode {episode.episodeNumber}
              </span>
            )}
            <span className="text-altivum-silver">|</span>
            <span className="text-altivum-silver">{formatDate(episode.publishedAt)}</span>
            {!isFeatured && (
              <>
                <span className="text-altivum-silver">|</span>
                <span className="text-altivum-silver">{episode.duration}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            id={slugify(episode.title)}
            className="text-white mb-4 group-hover:text-altivum-gold transition-colors"
            style={isFeatured ? typography.cardTitleLarge : typography.cardTitleSmall}
          >
            {episode.title}
          </h3>

          {/* Description */}
          <p className={`text-altivum-silver mb-5 ${isFeatured ? '' : 'line-clamp-3'}`} style={typography.bodyText}>
            {episode.description}
          </p>

          {/* Listen Links */}
          <div className="flex flex-wrap gap-3">
            {episode.links.spotify && (
              <a
                href={episode.links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DB954]/10 text-[#1DB954] rounded-full text-sm font-medium hover:bg-[#1DB954]/20 transition-colors"
              >
                <SpotifyIcon className="w-4 h-4" />
                Spotify
              </a>
            )}
            {episode.links.apple && (
              <a
                href={episode.links.apple}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#872EC4]/10 text-[#872EC4] rounded-full text-sm font-medium hover:bg-[#872EC4]/20 transition-colors"
              >
                <ApplePodcastIcon className="w-4 h-4" />
                Apple
              </a>
            )}
            {episode.links.youtube && (
              <a
                href={episode.links.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF0000]/10 text-[#FF0000] rounded-full text-sm font-medium hover:bg-[#FF0000]/20 transition-colors"
              >
                <YouTubeIcon className="w-4 h-4" />
                YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default EpisodeCard;
