import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('should render as a button with an aria-label', () => {
    render(<IconButton icon="edit" label="Edit item" />);
    expect(screen.getByRole('button', { name: 'Edit item' })).toBeInTheDocument();
  });

  it('should render the material icon', () => {
    render(<IconButton icon="delete" label="Delete" />);
    const button = screen.getByRole('button');
    expect(button.querySelector('[data-material-icon]')).toHaveAttribute('data-material-icon', 'delete');
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon="save" label="Save" onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should render as an anchor when href is provided', () => {
    render(<IconButton icon="open_in_new" label="Open" href="https://example.com" />);
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should apply custom className', () => {
    render(<IconButton icon="star" label="Star" className="text-yellow-500" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('text-yellow-500');
  });

  it('should hide icon from screen readers with aria-hidden', () => {
    render(<IconButton icon="settings" label="Settings" />);
    const iconEl = screen.getByRole('button').querySelector('[data-material-icon]');
    expect(iconEl).toHaveAttribute('aria-hidden', 'true');
  });
});
