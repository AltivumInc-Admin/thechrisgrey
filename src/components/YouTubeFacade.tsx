import { useState } from 'react';
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

  if (isLoaded) {
    return (
      <iframe
        src={embedSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  return (
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
  );
};

export default YouTubeFacade;
