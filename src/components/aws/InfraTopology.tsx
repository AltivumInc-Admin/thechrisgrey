import { useState, useRef, useEffect } from 'react';
import { typography } from '../../utils/typography';
import { checkWebGLSupport } from '../../utils/checkWebGL';
import { isPrerender } from '../../utils/prerender';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { clusters } from '../../data/infrastructureTopology';
import ErrorBoundary from '../ErrorBoundary';
import { TopologyScene } from './TopologyScene';
import type { TopologyControlHandle } from './TopologyScene';
import { TopologyFallback2D } from './TopologyFallback2D';
import { TopologyControls } from './TopologyControls';
import { FallbackDetail } from './FallbackDetail';
import QuestionHeading from '../aeo/QuestionHeading';

export function InfraTopology() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const webglOk = checkWebGLSupport();
  // Render the 2D fallback (the false branch below) when WebGL is unavailable
  // OR during the build-time prerender crawl, so headless renders get a stable,
  // crawlable DOM instead of a never-idle WebGL canvas.
  const use3D = isDesktop && webglOk && !isPrerender();

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const controlRef = useRef<TopologyControlHandle | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  // Hide hint after first interaction or after 5 seconds
  useEffect(() => {
    if (!hintVisible) return;
    const timer = setTimeout(() => setHintVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [hintVisible]);

  const handleSelectCluster = (id: string | null) => {
    setSelectedClusterId(id);
    setHintVisible(false);
  };

  return (
    <section className="h-screen flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 shrink-0">
        <QuestionHeading as="h2" className="mb-2 text-center">
          What is the infrastructure stack?
        </QuestionHeading>
        <p style={typography.subtitle} className="text-altivum-silver text-center">
          Infrastructure powering thechrisgrey.com
        </p>
      </div>

      {use3D ? (
        <ErrorBoundary fallback={<TopologyFallback2D />}>
          <div className="relative flex-1 min-h-0" onPointerDown={() => setHintVisible(false)}>
            <TopologyScene
              selectedClusterId={selectedClusterId}
              onSelectCluster={handleSelectCluster}
              controlRef={controlRef}
            />

            {/* Interaction hint -- fades out after first interaction or 5s */}
            {hintVisible && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-altivum-navy/70 backdrop-blur-xs border border-altivum-slate/20 rounded-full px-4 py-2 text-altivum-silver text-sm transition-opacity duration-500 pointer-events-none">
                Drag to rotate. Click a cluster to explore.
              </div>
            )}

            {/* Manual controls */}
            <TopologyControls controlRef={controlRef} />
          </div>

          {/* Detail card -- rendered as regular HTML below the canvas so it's never clipped */}
          {selectedClusterId && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 shrink-0 max-h-[35vh] overflow-y-auto">
              <FallbackDetail
                cluster={clusters.find((c) => c.id === selectedClusterId) ?? null}
                allClusters={clusters}
                onClose={() => controlRef.current?.reset()}
              />
            </div>
          )}

          {/* Cluster navigation bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 shrink-0">
            <div className="flex flex-wrap justify-center gap-2">
              {clusters.map((cluster) => (
                <button
                  key={cluster.id}
                  type="button"
                  className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 ${
                    selectedClusterId === cluster.id
                      ? 'bg-altivum-gold/15 border-altivum-gold/50 text-altivum-gold'
                      : 'bg-altivum-navy/30 border-altivum-slate/20 text-altivum-silver hover:border-altivum-gold/30 hover:text-altivum-gold'
                  }`}
                  onClick={() => {
                    if (selectedClusterId === cluster.id) {
                      controlRef.current?.reset();
                    } else {
                      controlRef.current?.flyTo(cluster.id);
                    }
                  }}
                >
                  {cluster.label}
                  <span className="ml-1.5 text-xs opacity-50">{cluster.services.length}</span>
                </button>
              ))}
            </div>
          </div>
        </ErrorBoundary>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TopologyFallback2D />
        </div>
      )}
    </section>
  );
}
