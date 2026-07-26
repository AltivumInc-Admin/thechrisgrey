import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button } from './Button';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Button', () => {
  describe('rendering as a button element', () => {
    it('should render children text', () => {
      renderWithRouter(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render with default type="button"', () => {
      renderWithRouter(<Button>Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should render with type="submit" when specified', () => {
      renderWithRouter(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should handle click events', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithRouter(<Button onClick={onClick}>Click</Button>);

      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should be disabled when disabled prop is true', () => {
      renderWithRouter(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not fire click when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithRouter(
        <Button onClick={onClick} disabled>
          Disabled
        </Button>,
      );

      await user.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('rendering as an internal link (to prop)', () => {
    it('should render as a React Router Link when "to" is provided', () => {
      renderWithRouter(<Button to="/about">About</Button>);
      const link = screen.getByRole('link', { name: /about/i });
      expect(link).toHaveAttribute('href', '/about');
    });
  });

  describe('rendering as an external link (href prop)', () => {
    it('should render as an anchor when "href" is provided', () => {
      renderWithRouter(<Button href="https://example.com">External</Button>);
      const link = screen.getByRole('link', { name: /external/i });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should add target and rel for external links', () => {
      renderWithRouter(
        <Button href="https://example.com" external>
          External
        </Button>,
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not add target/rel when external is false', () => {
      renderWithRouter(<Button href="https://example.com">Link</Button>);
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('target');
    });
  });

  describe('icon rendering', () => {
    it('should render icon on the right by default', () => {
      renderWithRouter(<Button icon="arrow_forward">Next</Button>);
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Next');
      expect(button.querySelector('[data-material-icon]')).toHaveAttribute('data-material-icon', 'arrow_forward');
    });

    it('should render icon on the left when specified', () => {
      renderWithRouter(
        <Button icon="arrow_back" iconPosition="left">
          Back
        </Button>,
      );
      const button = screen.getByRole('button');
      // The icon should appear before the text content in source order.
      const iconEl = button.querySelector('[data-material-icon]');
      expect(iconEl).toHaveAttribute('data-material-icon', 'arrow_back');
      // The icon SVG is the first child (before the "Back" text node).
      expect(button.firstChild).toBe(iconEl);
    });

    it('should not render icon element when no icon provided', () => {
      renderWithRouter(<Button>No Icon</Button>);
      const button = screen.getByRole('button');
      expect(button.querySelector('[data-material-icon]')).toBeNull();
    });
  });

  describe('variants and sizes', () => {
    it('should apply primary variant classes by default', () => {
      renderWithRouter(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-altivum-gold');
    });

    it('should apply outline-solid variant classes', () => {
      renderWithRouter(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
    });

    it('should apply size classes', () => {
      renderWithRouter(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
    });

    it('should apply custom className', () => {
      renderWithRouter(<Button className="my-custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('my-custom-class');
    });
  });
});
