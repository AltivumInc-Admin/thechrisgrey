import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtifactCard from './ArtifactCard';
import { ARTIFACT_LABELS, type ClaudeArtifact } from '../../types/blueprint';

const baseArtifact: ClaudeArtifact = {
  kind: 'skill',
  name: 'deploy-helper',
  description: 'Automates deployment to AWS Amplify.',
  body: '# Deploy Helper\n\nRun the deploy pipeline.',
};

describe('ArtifactCard', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    // Define navigator.clipboard directly (jsdom does not provide it).
    // userEvent.setup() would otherwise install its own clipboard stub,
    // so we install ours explicitly and reference this exact spy.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    // Remove the clipboard we installed so each test starts clean.
    Reflect.deleteProperty(navigator, 'clipboard');
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the artifact name', () => {
      render(<ArtifactCard artifact={baseArtifact} />);
      expect(screen.getByText('deploy-helper')).toBeInTheDocument();
    });

    it('should render the artifact description', () => {
      render(<ArtifactCard artifact={baseArtifact} />);
      expect(screen.getByText('Automates deployment to AWS Amplify.')).toBeInTheDocument();
    });

    it('should render the human label for a skill kind', () => {
      render(<ArtifactCard artifact={baseArtifact} />);
      expect(screen.getByText(ARTIFACT_LABELS.skill)).toBeInTheDocument();
      expect(screen.getByText('Claude Code Skill')).toBeInTheDocument();
    });

    it('should render the kind icon for a skill', () => {
      const { container } = render(<ArtifactCard artifact={baseArtifact} />);
      const icons = Array.from(container.querySelectorAll('[data-material-icon]')).map((n) =>
        n.getAttribute('data-material-icon'),
      );
      expect(icons).toContain('stars');
    });

    it('should render the slash_command label and icon', () => {
      const artifact: ClaudeArtifact = {
        ...baseArtifact,
        kind: 'slash_command',
      };
      const { container } = render(<ArtifactCard artifact={artifact} />);
      expect(screen.getByText('Slash Command')).toBeInTheDocument();
      const icons = Array.from(container.querySelectorAll('[data-material-icon]')).map((n) =>
        n.getAttribute('data-material-icon'),
      );
      expect(icons).toContain('terminal');
    });

    it('should render the subagent label and icon', () => {
      const artifact: ClaudeArtifact = { ...baseArtifact, kind: 'subagent' };
      const { container } = render(<ArtifactCard artifact={artifact} />);
      expect(screen.getByText('Subagent')).toBeInTheDocument();
      const icons = Array.from(container.querySelectorAll('[data-material-icon]')).map((n) =>
        n.getAttribute('data-material-icon'),
      );
      expect(icons).toContain('hub');
    });

    it('should render the mcp_tool label and icon', () => {
      const artifact: ClaudeArtifact = { ...baseArtifact, kind: 'mcp_tool' };
      const { container } = render(<ArtifactCard artifact={artifact} />);
      expect(screen.getByText('MCP Tool')).toBeInTheDocument();
      const icons = Array.from(container.querySelectorAll('[data-material-icon]')).map((n) =>
        n.getAttribute('data-material-icon'),
      );
      expect(icons).toContain('extension');
    });

    it('should fall back to the auto_awesome icon for an unknown kind', () => {
      const artifact = {
        ...baseArtifact,
        kind: 'mystery',
      } as unknown as ClaudeArtifact;
      const { container } = render(<ArtifactCard artifact={artifact} />);
      const icons = Array.from(container.querySelectorAll('[data-material-icon]')).map((n) =>
        n.getAttribute('data-material-icon'),
      );
      expect(icons).toContain('auto_awesome');
    });
  });

  describe('copy interaction', () => {
    // fireEvent is used for clipboard clicks: userEvent.setup() installs its
    // own clipboard stub which would shadow the navigator.clipboard spy above.
    it('should copy the artifact body to the clipboard', async () => {
      render(<ArtifactCard artifact={baseArtifact} />);

      fireEvent.click(screen.getByRole('button', { name: /copy body/i }));
      // Wait for the post-write state update to settle (flushes act()).
      await screen.findByRole('button', { name: /copied/i });

      expect(writeText).toHaveBeenCalledWith(baseArtifact.body);
    });

    it('should show a confirmation state after copying', async () => {
      render(<ArtifactCard artifact={baseArtifact} />);

      expect(screen.getByRole('button', { name: /copy body/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /copy body/i }));
      await screen.findByRole('button', { name: /copied/i });

      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
    });

    it('should not throw when the clipboard rejects', async () => {
      writeText.mockRejectedValueOnce(new Error('blocked'));
      render(<ArtifactCard artifact={baseArtifact} />);

      fireEvent.click(screen.getByRole('button', { name: /copy body/i }));
      await Promise.resolve();

      // Failure is swallowed: button stays in its default state.
      expect(screen.getByRole('button', { name: /copy body/i })).toBeInTheDocument();
    });
  });

  describe('preview interaction', () => {
    it('should hide the body preview initially', () => {
      render(<ArtifactCard artifact={baseArtifact} />);
      expect(screen.queryByText('Run the deploy pipeline.', { exact: false })).not.toBeInTheDocument();
      const preview = screen.getByRole('button', { name: /preview/i });
      expect(preview).toHaveAttribute('aria-expanded', 'false');
    });

    it('should reveal the body when preview is expanded', async () => {
      const user = userEvent.setup();
      render(<ArtifactCard artifact={baseArtifact} />);

      await user.click(screen.getByRole('button', { name: /preview/i }));

      expect(screen.getByText('Run the deploy pipeline.', { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /collapse/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('should collapse the body on a second click', async () => {
      const user = userEvent.setup();
      render(<ArtifactCard artifact={baseArtifact} />);

      await user.click(screen.getByRole('button', { name: /preview/i }));
      expect(screen.getByText('Run the deploy pipeline.', { exact: false })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /collapse/i }));
      expect(screen.queryByText('Run the deploy pipeline.', { exact: false })).not.toBeInTheDocument();
    });
  });

  describe('download interaction', () => {
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL,
        revokeObjectURL,
      });
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    it('should trigger a download with a .md filename for a skill', async () => {
      const user = userEvent.setup();
      render(<ArtifactCard artifact={baseArtifact} />);

      await user.click(screen.getByRole('button', { name: /download/i }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should clean up the temporary anchor element after downloading', async () => {
      const user = userEvent.setup();
      render(<ArtifactCard artifact={baseArtifact} />);

      await user.click(screen.getByRole('button', { name: /download/i }));

      // No leftover anchor with the download attribute should remain in the DOM.
      expect(document.querySelector('a[download]')).toBeNull();
    });
  });
});
