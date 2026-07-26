import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { typography } from '../../utils/typography';
import { slugify } from '../../utils/slugify';
import type { ClusterData } from '../../data/infrastructureTopology';
import Icon from '../icons/Icon';

interface FallbackDetailProps {
  cluster: ClusterData | null;
  allClusters: ClusterData[];
  onClose: () => void;
}

export function FallbackDetail({ cluster, allClusters, onClose }: FallbackDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { setContainerRef, handleKeyDown: handleFocusTrapKeyDown } = useFocusTrap(cluster !== null);

  // Height animation on mount
  useEffect(() => {
    if (cluster && panelRef.current) {
      gsap.from(panelRef.current, { height: 0, duration: 0.3, ease: 'power2.out' });
    }
  }, [cluster]);

  // Escape key handler
  useEffect(() => {
    if (!cluster) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [cluster, onClose]);

  if (!cluster) return null;

  const headingId = slugify(cluster.label) || cluster.id;
  const connectedClusterNames = cluster.connections
    .map((id) => allClusters.find((c) => c.id === id))
    .filter((c): c is ClusterData => c !== undefined)
    .map((c) => c.label);

  return (
    <div
      ref={(el) => {
        panelRef.current = el;
        // Wire the focus-trap container through the hook's callback-ref API
        // instead of mutating its returned ref directly — react-hooks/
        // immutability treats hook-returned refs as owned by the hook.
        setContainerRef(el);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={handleFocusTrapKeyDown}
      className="bg-altivum-navy/30 border border-altivum-slate/30 rounded-lg p-6 mt-4"
      style={{ overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 id={headingId} style={typography.cardTitleSmall} className="text-white">
            {cluster.label}
          </h3>
          <p style={typography.smallText} className="text-altivum-silver mt-1">
            {cluster.services.length} service{cluster.services.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-altivum-silver hover:text-white transition-colors p-1"
          aria-label="Close detail panel"
        >
          <Icon name="close" style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {cluster.services.map((service) => (
          <div key={service.name} className="space-y-1">
            <p style={typography.bodyText} className="text-white">
              {service.name}
            </p>
            <p style={typography.smallText} className="text-altivum-gold">
              {service.type}
            </p>
            <p style={typography.smallText} className="text-altivum-silver/50">
              {service.region}
            </p>
            <p style={typography.smallText} className="text-altivum-silver">
              {service.description}
            </p>
          </div>
        ))}
      </div>

      {/* Connections */}
      {connectedClusterNames.length > 0 && (
        <div className="pt-4 border-t border-altivum-slate/20">
          <p style={typography.smallText} className="text-altivum-silver">
            Connected to:{' '}
            {connectedClusterNames.map((name, i) => (
              <span key={name}>
                <span className="text-altivum-gold">{name}</span>
                {i < connectedClusterNames.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
