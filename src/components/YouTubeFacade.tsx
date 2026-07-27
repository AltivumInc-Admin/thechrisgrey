import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Icon from './icons/Icon';

interface YouTubeFacadeProps {
  videoId: string;
  title: string;
  embedParams?: string;
  /** Optional start offset (seconds) — deep-links the embed to a moment. */
  startSeconds?: number;
}

const YouTubeFacade = ({ videoId, title, embedParams = '', startSeconds }: YouTubeFacadeProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const startParam =
    typeof startSeconds === 'number' && Number.isFinite(startSeconds) && startSeconds > 0
      ? `&start=${Math.floor(startSeconds)}`
      : '';
  const embedSrc = embedParams
    ? `https://www.youtube.com/embed/${videoId}?${embedParams}&autoplay=1${startParam}`
    : `https://www.youtube.com/embed/${videoId}?autoplay=1${startParam}`;

  // Preconnect to the YouTube thumbnail origin only on pages that actually
  // render a YouTube facade (VAL-PERF-008). Injecting the hint here — rather
  // than globally in index.html — means i.ytimg.com is preconnected on /podcast
  // and on blog posts that embed a video, and never on pages that don't.
  // react-helmet-async deduplicates link tags by href, so multiple facades on
  // one page collapse to a single preconnect. The hint is emitted in both the
  // facade and iframe states so it persists after the user clicks play.
  const preconnect = (
    <Helmet>
      <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
    </Helmet>
  );

  if (isLoaded) {
    return (
      <>
        {preconnect}
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          className="absolute inset-0 w-full h-full"
        />
      </>
    );
  }

  return (
    <>
      {preconnect}
      <button
        type="button"
        onClick={() => setIsLoaded(true)}
        className="absolute inset-0 w-full h-full group cursor-pointer"
        aria-label={`Play ${title}`}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('hqdefault')) {
              target.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }
          }}
        />
        <span
          className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-200"
          aria-hidden="true"
        />
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-altivum-gold/90 group-hover:bg-altivum-gold transition-colors duration-200 shadow-lg">
            <Icon name="play_arrow" className="text-altivum-dark text-3xl sm:text-4xl ml-1" />
          </span>
        </span>
      </button>
    </>
  );
};

export default YouTubeFacade;
