import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Testimonials from './Testimonials';

describe('Testimonials', () => {
  it('renders nothing when there are no testimonials (empty by default)', () => {
    const { container } = render(<Testimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders quotes, authors, and roles when given items', () => {
    render(
      <Testimonials
        items={[
          { quote: 'A clear roadmap in one session.', author: 'Jane Doe', role: 'COO, Acme' },
          { quote: 'Best podcast guest experience.', author: 'John Roe' },
        ]}
      />,
    );
    expect(screen.getByText(/A clear roadmap in one session/)).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/COO, Acme/)).toBeInTheDocument();
    expect(screen.getByText('John Roe')).toBeInTheDocument();
  });

  it('uses the default global list when no items prop is given', () => {
    // TESTIMONIALS ships with placeholder quotes so the section renders
    // everywhere it is mounted; the component should render at least one card.
    render(<Testimonials />);
    expect(screen.getByText(/Christian brings the same clarity/)).toBeInTheDocument();
  });
});
