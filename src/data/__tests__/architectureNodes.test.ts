import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { pipelineNodes, pipelineEdges } from '../architectureNodes';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('architectureNodes', () => {
  it('has exactly 7 pipeline nodes', () => {
    expect(pipelineNodes).toHaveLength(7);
  });

  it('has exactly 6 pipeline edges', () => {
    expect(pipelineEdges).toHaveLength(6);
  });

  it('every edge references valid node IDs', () => {
    const nodeIds = new Set(pipelineNodes.map((n) => n.id));

    for (const edge of pipelineEdges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it('every node has non-empty config (at least 1 key)', () => {
    for (const node of pipelineNodes) {
      expect(Object.keys(node.config).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every node has non-empty reasoning', () => {
    for (const node of pipelineNodes) {
      expect(node.reasoning.length).toBeGreaterThan(0);
    }
  });

  it('the guardrail node version matches the live GUARDRAIL_VERSION in the chat Lambda', () => {
    // Source of truth: GUARDRAIL_VERSION in lambda/chat-stream/index.mjs. This guards
    // against the displayed version drifting from the deployed guardrail version.
    const lambdaSource = readFileSync(resolve(HERE, '../../../lambda/chat-stream/index.mjs'), 'utf8');
    const match = lambdaSource.match(
      /const GUARDRAIL_VERSION\s*=\s*(?:process\.env\.GUARDRAIL_VERSION\s*\|\|\s*)?["']([^"']+)["']/,
    );
    expect(match).not.toBeNull();
    const liveVersion = match![1];

    const guardrailNode = pipelineNodes.find((n) => n.id === 'guardrail-check');
    expect(guardrailNode).toBeDefined();
    expect(guardrailNode!.config['Version']).toBe(liveVersion);
  });
});
