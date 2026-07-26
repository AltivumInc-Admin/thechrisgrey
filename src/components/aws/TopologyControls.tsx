import type { TopologyControlHandle } from './TopologyScene';
import Icon from '../icons/Icon';

interface TopologyControlsProps {
  controlRef: React.MutableRefObject<TopologyControlHandle | null>;
}

function ControlButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="w-8 h-8 flex items-center justify-center text-altivum-silver hover:text-altivum-gold transition-colors duration-200 rounded-full hover:bg-altivum-gold/10"
      onClick={onClick}
    >
      <Icon name={icon} style={{ fontSize: '18px' }} />
    </button>
  );
}

export function TopologyControls({ controlRef }: TopologyControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-altivum-navy/60 backdrop-blur-xs border border-altivum-slate/20 rounded-full px-2 py-1">
      <ControlButton label="Zoom in" icon="add" onClick={() => controlRef.current?.zoomBy(2)} />
      <ControlButton label="Zoom out" icon="remove" onClick={() => controlRef.current?.zoomBy(-2)} />
      <div className="w-px h-4 bg-altivum-slate/30 mx-0.5" />
      <ControlButton label="Rotate left" icon="rotate_left" onClick={() => controlRef.current?.rotateBy(-45)} />
      <ControlButton label="Rotate right" icon="rotate_right" onClick={() => controlRef.current?.rotateBy(45)} />
      <div className="w-px h-4 bg-altivum-slate/30 mx-0.5" />
      <ControlButton label="Reset view" icon="restart_alt" onClick={() => controlRef.current?.reset()} />
    </div>
  );
}
