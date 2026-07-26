import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import type { PipelineNodeData } from '../../data/architectureNodes';
import Icon from '../icons/Icon';

interface NodeDetailPanelProps {
  node: PipelineNodeData | null;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  // Animate open on mount
  useEffect(() => {
    if (node && panelRef.current) {
      isClosingRef.current = false;
      gsap.from(panelRef.current, {
        height: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [node]);

  const handleClose = useCallback(() => {
    if (isClosingRef.current || !panelRef.current) {
      onClose();
      return;
    }
    isClosingRef.current = true;
    gsap.to(panelRef.current, {
      height: 0,
      duration: 0.2,
      onComplete: onClose,
    });
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!node) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [node, handleClose]);

  if (!node) return null;

  const configEntries = Object.entries(node.config);

  return (
    <div
      ref={panelRef}
      className="mt-8 overflow-hidden bg-altivum-navy/30 border border-altivum-slate/30 rounded-lg p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white text-lg font-light tracking-wide">{node.service}</h3>
        </div>
        <button
          onClick={handleClose}
          className="text-altivum-silver hover:text-white transition-colors ml-4 shrink-0"
          aria-label="Close detail panel"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      {/* Description */}
      <p className="text-altivum-silver text-sm leading-relaxed mb-6">{node.description}</p>

      {/* Config grid */}
      {configEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
          {configEntries.map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-altivum-gold text-xs font-light tracking-wide uppercase">{key}</span>
              <span className="text-altivum-silver text-sm">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <p className="text-altivum-silver text-sm leading-relaxed italic">{node.reasoning}</p>
    </div>
  );
}
