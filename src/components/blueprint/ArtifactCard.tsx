import { useState } from 'react';
import { typography } from '../../utils/typography';
import { ARTIFACT_LABELS, type ClaudeArtifact } from '../../types/blueprint';
import Icon from '../icons/Icon';

interface ArtifactCardProps {
  artifact: ClaudeArtifact;
}

const kindIcon: Record<string, string> = {
  skill: 'stars',
  slash_command: 'terminal',
  subagent: 'hub',
  mcp_tool: 'extension',
};

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — swallow silently, user can still copy manually.
    }
  };

  const downloadFilename =
    artifact.kind === 'skill' || artifact.kind === 'subagent'
      ? `${artifact.name}.md`
      : artifact.kind === 'slash_command'
        ? `${artifact.name}.md`
        : `${artifact.name}.json`;

  const handleDownload = () => {
    const blob = new Blob([artifact.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <article className="p-5 rounded-lg bg-altivum-navy/60 border border-white/5 hover:border-altivum-gold/20 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon
            name={kindIcon[artifact.kind] ?? 'auto_awesome'}
            className="text-altivum-gold shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h4 className="text-white truncate" style={typography.cardTitleSmall}>
                {artifact.name}
              </h4>
              <span className="text-altivum-gold uppercase tracking-wider" style={typography.smallText}>
                {ARTIFACT_LABELS[artifact.kind] ?? artifact.kind}
              </span>
            </div>
            <p className="text-altivum-silver" style={typography.bodyText}>
              {artifact.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-altivum-gold/10 border border-altivum-gold/30 text-altivum-gold hover:bg-altivum-gold/20 transition-colors"
          style={typography.smallText}
        >
          <Icon name={copied ? 'check' : 'content_copy'} className="text-sm mr-1.5" aria-hidden="true" />
          {copied ? 'Copied' : 'Copy body'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center px-3 py-1.5 rounded-md border border-white/10 text-altivum-silver hover:border-altivum-gold/40 hover:text-white transition-colors"
          style={typography.smallText}
        >
          <Icon name="download" className="text-sm mr-1.5" aria-hidden="true" />
          Download
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center px-3 py-1.5 rounded-md border border-white/10 text-altivum-silver hover:border-altivum-gold/40 hover:text-white transition-colors"
          style={typography.smallText}
          aria-expanded={expanded}
        >
          <Icon name={expanded ? 'expand_less' : 'expand_more'} className="text-sm mr-1.5" aria-hidden="true" />
          {expanded ? 'Collapse' : 'Preview'}
        </button>
      </div>

      {expanded && (
        <pre
          className="mt-2 p-4 rounded-md bg-altivum-dark border border-white/5 text-altivum-silver overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap"
          style={typography.smallText}
        >
          {artifact.body}
        </pre>
      )}
    </article>
  );
}

export default ArtifactCard;
