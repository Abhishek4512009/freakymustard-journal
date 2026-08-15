import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '../context/AppContext';

beforeEach(() => {
  localStorage.clear();
});

/** Test harness that exposes context actions to the test. */
function Harness() {
  const app = useApp();
  return (
    <div>
      <span data-testid="wl-count">{app.watchlist.length}</span>
      <span data-testid="cw-count">{app.continueWatching.length}</span>
      <span data-testid="profile">{app.activeProfile.id}</span>
      <button onClick={() => app.addToWatchlist({ id: 'tt1', title: 'Movie A', type: 'movies' })}>
        add
      </button>
      <button onClick={() => app.addToWatchlist({ id: 'tt1', title: 'Movie A', type: 'movies' })}>
        add-dup
      </button>
      <button onClick={() => app.removeFromWatchlist('tt1')}>remove</button>
      <button
        onClick={() =>
          app.saveProgress({ id: 'tt1', title: 'Movie A', progress: 40, watchLink: '/w' })
        }
      >
        progress
      </button>
      <button
        onClick={() =>
          app.saveProgress({ id: 'tt1', title: 'Movie A', progress: null, watchLink: '/w' })
        }
      >
        progress-null
      </button>
      <button onClick={() => app.switchProfile('tamil')}>switch</button>
      <button onClick={() => app.addRecentSearch('leo')}>search</button>
      <span data-testid="recent">{app.recentSearches.join(',')}</span>
    </div>
  );
}

const setup = () =>
  render(
    <AppProvider>
      <Harness />
    </AppProvider>
  );

describe('AppContext', () => {
  it('adds to watchlist and dedupes', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('add'));
    await user.click(screen.getByText('add-dup'));
    expect(screen.getByTestId('wl-count')).toHaveTextContent('1');
  });

  it('removes from watchlist', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('add'));
    await user.click(screen.getByText('remove'));
    expect(screen.getByTestId('wl-count')).toHaveTextContent('0');
  });

  it('saves progress and never regresses with null', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('progress'));
    await user.click(screen.getByText('progress-null'));
    expect(screen.getByTestId('cw-count')).toHaveTextContent('1');
    // progress should still be 40 in storage
    const stored = JSON.parse(localStorage.getItem('streamda:v2:continue'));
    expect(stored[0].progress).toBe(40);
  });

  it('persists watchlist to localStorage', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('add'));
    await waitFor(() => {
      expect(localStorage.getItem('streamda:v2:watchlist')).toContain('tt1');
    });
  });

  it('switches profiles', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('switch'));
    expect(screen.getByTestId('profile')).toHaveTextContent('tamil');
  });

  it('tracks recent searches without duplicates', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('search'));
    await user.click(screen.getByText('search'));
    expect(screen.getByTestId('recent')).toHaveTextContent('leo');
    expect(screen.getByTestId('recent').textContent.split(',').filter(Boolean)).toHaveLength(1);
  });
});
