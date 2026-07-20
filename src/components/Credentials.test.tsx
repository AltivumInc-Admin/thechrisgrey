import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Credentials from './Credentials';
import { CREDENTIALS } from '../data/credentials';

describe('Credentials section', () => {
  it('renders nothing when there are no credentials', () => {
    const { container } = render(<Credentials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the section heading', () => {
    render(<Credentials />);
    expect(screen.getByRole('heading', { level: 2, name: /credentials & recognition/i })).toBeInTheDocument();
  });

  it('renders a card for each credential with label and description', () => {
    render(<Credentials />);
    CREDENTIALS.forEach((c) => {
      expect(screen.getByText(c.label)).toBeInTheDocument();
      expect(screen.getByText(c.description)).toBeInTheDocument();
    });
  });

  it('lists Bronze Star, Green Beret, 18D, AWS Community Builder, Anthropic Academy, and Veteran Business of the Month', () => {
    render(<Credentials />);
    expect(screen.getByText('Bronze Star Medal')).toBeInTheDocument();
    expect(screen.getByText('Green Beret')).toBeInTheDocument();
    expect(screen.getByText('Special Forces Medic (18D)')).toBeInTheDocument();
    expect(screen.getByText('AWS Community Builder')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Academy Certifications')).toBeInTheDocument();
    expect(screen.getByText('Veteran Business of the Month')).toBeInTheDocument();
  });

  it('renders the Veteran Business of the Month reference as a link', () => {
    render(<Credentials />);
    const link = screen.getByRole('link', { name: /veteran business of the month — open reference/i });
    expect(link).toHaveAttribute('href');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses the section aria-labelledby association for accessibility', () => {
    render(<Credentials />);
    const heading = screen.getByRole('heading', { level: 2, name: /credentials & recognition/i });
    const section = heading.closest('section');
    expect(section).toHaveAttribute('aria-labelledby', 'credentials-heading');
  });
});
