import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TitleCard from '../components/TitleCard';
import { Section } from '../components/Shelf';
import { Empty } from '../components/Notices';

beforeEach(() => {
  localStorage.clear();
});

describe('TitleCard', () => {
  it('renders an english item and links to the new watch route', () => {
    render(
      <MemoryRouter>
        <TitleCard
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
    expect(link).toHaveAttribute('href', '/watch/movie/tt123');
    expect(screen.getByText('8.2', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders a tamil item link from .link', () => {
    render(
      <MemoryRouter>
        <TitleCard item={{ title: 'Leo (2023)', link: 'https://x.co/leo' }} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /watch leo/i });
    expect(link.getAttribute('href')).toContain('/watch/tamil/');
  });

  it('shows a flat fallback when the image fails', async () => {
    const { container } = render(
      <MemoryRouter>
        <TitleCard
          item={{ id: 'tt9', title: 'Broken Poster', poster: 'https://img.test/broken.jpg' }}
        />
      </MemoryRouter>
    );
    const img = container.querySelector('img');
    img.dispatchEvent(new Event('error', { bubbles: true }));
    expect(await screen.findByText('Broken Poster')).toBeInTheDocument();
  });
});

describe('Section', () => {
  it('renders a numbered heading with index link', () => {
    render(
      <MemoryRouter>
        <Section no="01" title="Films" to="/films" count={12}>
          <p>body</p>
        </Section>
      </MemoryRouter>
    );
    expect(screen.getByText('Films')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /full index/i })).toHaveAttribute('href', '/films');
  });
});

describe('Empty', () => {
  it('renders title and message', () => {
    render(<Empty title="A blank page." message="Try again later" />);
    expect(screen.getByText('A blank page.')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });
});
