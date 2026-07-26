import { useState } from 'react';
import Icon from './icons/Icon';

interface SpotifyFacadeProps {
  embedUrl: string;
  title: string;
}

const SpotifyFacade = ({ embedUrl, title }: SpotifyFacadeProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  if (isLoaded) {
    return (
      <iframe
        src={embedUrl}
        width="100%"
        height="352"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        title={title}
        className="rounded-xl"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsLoaded(true)}
      className="relative w-full h-[352px] bg-linear-to-br from-altivum-navy to-altivum-blue rounded-xl overflow-hidden group cursor-pointer border border-white/10 hover:border-altivum-gold/50 transition-all duration-300"
      aria-label={`Play ${title} on Spotify`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        {/* Spotify icon */}
        <svg
          className="w-16 h-16 text-[#1DB954] group-hover:scale-110 transition-transform duration-300"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <div className="text-center">
          <p className="text-white text-lg font-medium mb-1">{title}</p>
          <p className="text-altivum-silver text-sm">Click to load Spotify player</p>
        </div>
        {/* Play button overlay */}
        <span className="w-14 h-14 flex items-center justify-center rounded-full bg-altivum-gold/90 group-hover:bg-altivum-gold transition-colors duration-200 shadow-lg">
          <Icon name="play_arrow" className="text-altivum-dark text-2xl ml-0.5" />
        </span>
      </div>
    </button>
  );
};

export default SpotifyFacade;
