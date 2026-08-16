import { fetchJson } from '../lib/http';
import { isTamilNavigationItem } from '../lib/format';
import { PROXY_BASE } from './directProxy';

// Content + streaming live on the same FreakyMustard service since the
// Render backend was merged into the Space.
const API_BASE = `${PROXY_BASE}/api`;

/**
 * Tamil catalogue (moviesda scrape).
 * Items are { title, link, poster? } where link is an upstream page URL.
 */

export const getYears = (signal) => fetchJson(`${API_BASE}/years`, { signal });

/**
 * Movies for a year page. Navigation/collection rows are filtered out
 * centrally so every consumer gets clean film lists.
 */
export const getMovies = async (yearUrl, pages = 1, signal) => {
  const baseUrl = yearUrl.replace(/\/$/, '');
  const data = await fetchJson(
    `${API_BASE}/movies?year_url=${encodeURIComponent(baseUrl)}&pages=${pages}`,
    { signal }
  );
  return Array.isArray(data) ? data.filter((m) => !isTamilNavigationItem(m)) : [];
};

export const getAutoStream = (movieUrl, signal) =>
  fetchJson(`${API_BASE}/auto-stream?movie_url=${encodeURIComponent(movieUrl)}`, { signal });

export const searchMovies = async (query, signal) => {
  const data = await fetchJson(`${API_BASE}/search?q=${encodeURIComponent(query)}`, { signal });
  return Array.isArray(data) ? data.filter((m) => !isTamilNavigationItem(m)) : [];
};

/**
 * Tamil web series: listing -> seasons -> episodes -> episode stream.
 */
export const getSeries = (page = 1, signal) =>
  fetchJson(`${API_BASE}/series?page=${page}`, { signal });

export const getSeasons = (seriesUrl, signal) =>
  fetchJson(`${API_BASE}/seasons?series_url=${encodeURIComponent(seriesUrl)}`, { signal });

export const getEpisodes = (seasonUrl, signal, pages = 10) =>
  fetchJson(`${API_BASE}/episodes?season_url=${encodeURIComponent(seasonUrl)}&pages=${pages}`, {
    signal,
  });

export const getEpisodeStream = (episodeUrl, signal) =>
  fetchJson(`${API_BASE}/episode-stream?episode_url=${encodeURIComponent(episodeUrl)}`, { signal });
