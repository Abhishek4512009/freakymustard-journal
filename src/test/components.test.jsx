import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PosterCard from '../components/PosterCard';
import Badge from '../components/ui/Badge';
import SectionHeader from '../components/SectionHeader';
import { EmptyState } from '../components/ui/States';

beforeEach(() => {
  localStorage.clear();
});

describe('PosterCard', () => {
  it('renders english item with rating and links to watch page', () => {
    render(
      <MemoryRouter>
        <PosterCard
          item={{
            id: 'tt123',
            title: 'Test Movie (2024)',
            poster: 'https://img.test/p.jpg',
            rating: '8.2',
          }}
          type="movies"
        />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /watch test movie/i });
    expect(link).toHaveAttribute('href', '/watch/english/movies/tt123');
    expect(screen.getByText('8.2')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders tamil item link from .link', () => {
    render(
      <MemoryRouter>
        <PosterCard item={{ title: 'Leo (2023)', link: 'https://x.co/leo' }} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /watch leo/i });
    expect(link.getAttribute('href')).toContain('/watch/tamil/');
  });

  it('shows fallback when image fails', async () => {
    const { container } = render(
      <MemoryRouter>
        <PosterCard
          item={{ id: 'tt9', title: 'Broken Poster', poster: 'https://img.test/broken.jpg' }}
        />
      </MemoryRouter>
    );
    const img = container.querySelector('img');
    img.dispatchEvent(new Event('error', { bubbles: true }));
    expect(await screen.findByText('Broken Poster')).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders children with tone classes', () => {
    render(<Badge tone="brand">HD</Badge>);
    expect(screen.getByText('HD')).toBeInTheDocument();
  });
});

describe('SectionHeader', () => {
  it('renders title and explore link', () => {
    render(
      <MemoryRouter>
        <SectionHeader title="Trending" to="/english" />
      </MemoryRouter>
    );
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore all/i })).toHaveAttribute('href', '/english');
  });
});

describe('EmptyState', () => {
  it('renders title and message', () => {
    render(<EmptyState title="Nothing here" message="Try again later" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });
});
