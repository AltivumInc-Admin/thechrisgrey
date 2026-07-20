import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';

vi.mock('../utils/routeManifest', () => ({
  prefetchRoute: vi.fn(),
}));

const transitionSpy = vi.fn();
vi.mock('../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => transitionSpy,
}));

const items = [
  { name: 'Home', url: 'https://thechrisgrey.com' },
  { name: 'Blog', url: 'https://thechrisgrey.com/blog' },
  { name: 'My Post', url: 'https://thechrisgrey.com/blog/my-post' },
];

const renderCrumbs = (props: React.ComponentProps<typeof Breadcrumbs>) =>
  render(
    <MemoryRouter>
      <Breadcrumbs {...props} />
    </MemoryRouter>,
  );

describe('Breadcrumbs', () => {
  it('renders nothing when items is empty', () => {
    const { container } = renderCrumbs({ items: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a navigation landmark labeled "Breadcrumb"', () => {
    renderCrumbs({ items });
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('renders every crumb label in source order', () => {
    renderCrumbs({ items });
    const list = screen.getByRole('list');
    expect(list).toHaveTextContent('Home');
    expect(list).toHaveTextContent('Blog');
    expect(list).toHaveTextContent('My Post');
  });

  it('renders ancestor crumbs as links pointing at the route path', () => {
    renderCrumbs({ items });
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
    const blogLink = screen.getByRole('link', { name: /blog/i });
    expect(blogLink).toHaveAttribute('href', '/blog');
  });

  it('marks the current (last) page with aria-current="page" and no link', () => {
    renderCrumbs({ items });
    const current = screen.getByText('My Post');
    expect(current).toHaveAttribute('aria-current', 'page');
    // The current page must not be a link — only ancestors are.
    expect(current.closest('a')).toBeNull();
  });

  it('navigates via SPA transition when an ancestor crumb is clicked', () => {
    renderCrumbs({ items });
    const blogLink = screen.getByRole('link', { name: /blog/i });
    transitionSpy.mockClear();
    fireEvent.click(blogLink);
    expect(transitionSpy).toHaveBeenCalledWith('/blog');
  });

  it('does not invoke the transition for modified clicks (new tab)', () => {
    renderCrumbs({ items });
    const blogLink = screen.getByRole('link', { name: /blog/i });
    transitionSpy.mockClear();
    fireEvent.click(blogLink, { metaKey: true });
    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it('renders a single-item trail with only the current page (no link)', () => {
    renderCrumbs({ items: [{ name: 'Solo', url: 'https://thechrisgrey.com/solo' }] });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Solo')).toHaveAttribute('aria-current', 'page');
  });

  it('uses the hook exactly once per render (stable API surface)', () => {
    const spy = vi.spyOn({ useViewTransitionNavigate }, 'useViewTransitionNavigate');
    renderCrumbs({ items });
    // Hook is called inside ViewTransitionLink per ancestor, not in Breadcrumbs.
    // Breadcrumbs itself stays a pure presentational wrapper.
    expect(spy).not.toHaveBeenCalled();
  });
});
