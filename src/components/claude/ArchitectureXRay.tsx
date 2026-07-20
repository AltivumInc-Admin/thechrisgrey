import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { pipelineNodes, pipelineEdges } from '../../data/architectureNodes';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isMotionDisabled } from '../../utils/motion';
import { typography } from '../../utils/typography';
import { getSessionToken } from '../../utils/sessionToken';
import { PipelineNode } from './PipelineNode';
import { PipelineEdge } from './PipelineEdge';
import { NodeDetailPanel } from './NodeDetailPanel';
import { TraceInput } from './TraceInput';
import { TraceResponseBubble } from './TraceResponseBubble';
import QuestionHeading from '../aeo/QuestionHeading';

const NODE_WIDTH = 100;
const NODE_HEIGHT = 60;

// Spacing between node centers
const DESKTOP_SPACING = 140;
const MOBILE_SPACING = 90;

const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT;
const SYSTEM_MESSAGE_PREFIX = '\x00SYS\x00';

type NodeState = 'dim' | 'active' | 'warning';

/** Every pipeline node set to its 'dim' resting state. */
function allDim(): Record<string, NodeState> {
  return Object.fromEntries(pipelineNodes.map((n) => [n.id, 'dim' as const]));
}

export function ArchitectureXRay() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(allDim);

  // Trace state
  const [traceState, setTraceState] = useState<'idle' | 'tracing' | 'complete' | 'error'>('idle');
  const [responseContent, setResponseContent] = useState('');
  const [isSystemMessage, setIsSystemMessage] = useState(false);

  // Refs
  const cachedTrace = useRef<{ response: string; isSystem: boolean } | null>(null);
  const replayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
      abortControllerRef.current?.abort();
      timelineRef.current?.kill();
    };
  }, []);

  const nodeCount = pipelineNodes.length;

  // Calculate positions and viewBox
  const { positions, viewBox } = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};

    if (isDesktop) {
      const totalWidth = nodeCount * DESKTOP_SPACING;
      for (let i = 0; i < nodeCount; i++) {
        pos[pipelineNodes[i].id] = {
          x: i * DESKTOP_SPACING + DESKTOP_SPACING / 2,
          y: NODE_HEIGHT / 2 + 10,
        };
      }
      return {
        positions: pos,
        viewBox: `0 0 ${totalWidth} ${NODE_HEIGHT + 20}`,
      };
    } else {
      const totalHeight = nodeCount * MOBILE_SPACING;
      for (let i = 0; i < nodeCount; i++) {
        pos[pipelineNodes[i].id] = {
          x: NODE_WIDTH / 2 + 10,
          y: i * MOBILE_SPACING + MOBILE_SPACING / 2,
        };
      }
      return {
        positions: pos,
        viewBox: `0 0 ${NODE_WIDTH + 20} ${totalHeight}`,
      };
    }
  }, [isDesktop, nodeCount]);

  function handleNodeClick(nodeId: string) {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null);
      setNodeStates((prev) => {
        const next = { ...prev };
        next[nodeId] = 'dim';
        return next;
      });
    } else {
      setExpandedNodeId(nodeId);
      setNodeStates(() => ({ ...allDim(), [nodeId]: 'active' }));
    }
  }

  // Run the GSAP pipeline animation, optionally stopping at a specific node
  const runPipelineAnimation = useCallback((stopAtNodeId?: string) => {
    if (isMotionDisabled()) {
      // Set all nodes/edges active instantly
      setNodeStates(() => {
        const states: Record<string, NodeState> = {};
        for (const node of pipelineNodes) {
          if (stopAtNodeId && node.id === stopAtNodeId) {
            states[node.id] = 'warning';
            break;
          }
          states[node.id] = 'active';
        }
        // Fill remaining as dim if we stopped early
        for (const node of pipelineNodes) {
          if (!(node.id in states)) {
            states[node.id] = 'dim';
          }
        }
        return states;
      });
      return;
    }

    // Kill any existing timeline
    timelineRef.current?.kill();

    const tl = gsap.timeline();
    timelineRef.current = tl;

    // Reset all to dim first
    setNodeStates(allDim());

    for (let i = 0; i < pipelineNodes.length; i++) {
      const nodeId = pipelineNodes[i].id;
      const shouldStop = stopAtNodeId && nodeId === stopAtNodeId;
      const targetState: NodeState = shouldStop ? 'warning' : 'active';

      // Activate this node
      tl.to(
        {},
        {
          duration: 0.3,
          onStart: () => {
            setNodeStates((prev) => ({ ...prev, [nodeId]: targetState }));
          },
        },
      );

      if (shouldStop) break;

      // Activate the edge to the next node (if exists)
      if (i < pipelineEdges.length) {
        tl.to(
          {},
          {
            duration: 0.15,
          },
        );
      }
    }
  }, []);

  // Replay cached trace with animation
  const replayWithCache = useCallback(() => {
    if (!cachedTrace.current) return;

    setTraceState('tracing');
    setResponseContent('');
    setIsSystemMessage(false);

    runPipelineAnimation();

    // Simulate streaming the cached response
    const fullText = cachedTrace.current.response;
    const isSys = cachedTrace.current.isSystem;

    setIsSystemMessage(isSys);

    // Under reduced motion, show the full response instantly — no streaming interval
    if (isMotionDisabled()) {
      setResponseContent(fullText);
      setTraceState('complete');
      return;
    }

    const chunkSize = 8;
    let pos = 0;
    setResponseContent('');

    const interval = setInterval(() => {
      pos += chunkSize;
      if (pos >= fullText.length) {
        setResponseContent(fullText);
        setTraceState('complete');
        clearInterval(interval);
      } else {
        setResponseContent(fullText.slice(0, pos));
      }
    }, 20);
  }, [runPipelineAnimation]);

  const handleTrace = useCallback(
    async (message: string) => {
      // Always make a live API call -- the Lambda's 20/hour rate limit is the real protection
      // Kill any in-flight request or animation
      abortControllerRef.current?.abort();
      timelineRef.current?.kill();

      // Reset all state for a fresh trace
      setTraceState('tracing');
      setResponseContent('');
      setIsSystemMessage(false);
      setExpandedNodeId(null);
      setNodeStates(allDim());

      // Start the pipeline animation
      runPipelineAnimation();

      const requestBody = JSON.stringify({
        messages: [{ role: 'user', content: message }],
        pageContext: {
          currentPage: '/claude',
          pageTitle: 'Claude',
          section: 'Architecture X-Ray',
          visitedPages: [],
        },
      });

      // (Any previous in-flight request was already aborted at the top of this callback.)
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      try {
        const token = await getSessionToken('chat');

        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: requestBody,
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to get response');

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        let accumulated = '';
        let isSys = false;
        let firstChunk = true;

        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (done) break;
          const value = result.value;

          const chunk = decoder.decode(value, { stream: true });

          if (firstChunk) {
            firstChunk = false;
            if (chunk.startsWith(SYSTEM_MESSAGE_PREFIX)) {
              isSys = true;
              accumulated = chunk.slice(SYSTEM_MESSAGE_PREFIX.length);
              setIsSystemMessage(true);
            } else {
              accumulated = chunk;
            }
          } else {
            accumulated += chunk;
          }

          setResponseContent(accumulated);
        }

        if (isSys) {
          // System message: stop animation at guardrail node with warning
          timelineRef.current?.kill();
          setNodeStates((prev) => {
            const states: Record<string, NodeState> = {};
            // Activate nodes up to guardrail, set guardrail to warning
            let hitGuardrail = false;
            for (const node of pipelineNodes) {
              if (node.id === 'guardrail-check') {
                states[node.id] = 'warning';
                hitGuardrail = true;
              } else if (!hitGuardrail) {
                states[node.id] = 'active';
              } else {
                states[node.id] = prev[node.id] === 'active' ? 'active' : 'dim';
              }
            }
            return states;
          });
          setTraceState('error');

          // Schedule replay with cached successful response if one exists
          if (cachedTrace.current) {
            replayTimeoutRef.current = setTimeout(() => {
              replayWithCache();
            }, 2000);
          }
        } else {
          // Cache the successful response (used for error-recovery replay)
          cachedTrace.current = { response: accumulated, isSystem: false };
          setTraceState('complete');
        }
      } catch (error) {
        timelineRef.current?.kill();
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          setResponseContent('The request timed out. Please try again.');
        } else {
          setResponseContent('Something went wrong. Please try again.');
        }
        setTraceState('error');
      } finally {
        clearTimeout(timeoutId);
        abortControllerRef.current = null;
      }
    },
    [runPipelineAnimation, replayWithCache],
  );

  const expandedNode = pipelineNodes.find((n) => n.id === expandedNodeId) ?? null;

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <QuestionHeading as="h2" className="mb-4">
            What is the architecture behind Alti?
          </QuestionHeading>
          <p className="text-altivum-silver" style={typography.subtitle}>
            How the Alti chat pipeline works
          </p>
        </div>

        {/* SVG Pipeline */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={viewBox}
            className="w-full"
            style={{ minWidth: isDesktop ? nodeCount * DESKTOP_SPACING : undefined }}
            role="img"
            aria-label="Architecture pipeline diagram showing the Alti chat data flow"
          >
            {/* Edges first (behind nodes) */}
            {pipelineEdges.map((edge) => {
              const fromPos = positions[edge.from];
              const toPos = positions[edge.to];
              if (!fromPos || !toPos) return null;

              let x1: number, y1: number, x2: number, y2: number;
              if (isDesktop) {
                x1 = fromPos.x + NODE_WIDTH / 2;
                y1 = fromPos.y;
                x2 = toPos.x - NODE_WIDTH / 2;
                y2 = toPos.y;
              } else {
                x1 = fromPos.x;
                y1 = fromPos.y + NODE_HEIGHT / 2;
                x2 = toPos.x;
                y2 = toPos.y - NODE_HEIGHT / 2;
              }

              const isActive =
                nodeStates[edge.from] === 'active' ||
                nodeStates[edge.to] === 'active' ||
                nodeStates[edge.from] === 'warning' ||
                nodeStates[edge.to] === 'warning';

              return (
                <PipelineEdge
                  key={`${edge.from}-${edge.to}`}
                  edge={edge}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  state={isActive ? 'active' : 'dim'}
                />
              );
            })}

            {/* Nodes */}
            {pipelineNodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;

              return (
                <PipelineNode
                  key={node.id}
                  node={node}
                  state={nodeStates[node.id]}
                  isExpanded={expandedNodeId === node.id}
                  onClick={() => handleNodeClick(node.id)}
                  x={pos.x}
                  y={pos.y}
                />
              );
            })}
          </svg>
        </div>

        {/* Trace input */}
        <TraceInput onTrace={handleTrace} disabled={traceState === 'tracing'} />

        {/* Trace response bubble */}
        {traceState !== 'idle' && (
          <TraceResponseBubble
            content={responseContent}
            isStreaming={traceState === 'tracing'}
            isSystemMessage={isSystemMessage}
          />
        )}

        {/* Detail panel below SVG */}
        <NodeDetailPanel
          node={expandedNode}
          onClose={() => {
            setExpandedNodeId(null);
            setNodeStates(allDim());
          }}
        />
      </div>
    </section>
  );
}
