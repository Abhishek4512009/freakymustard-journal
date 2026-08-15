import { fetchJson } from '../lib/http';

const API_BASE = 'https://moviesda-backend.onrender.com/api/english';

/**
 * English catalogue (IMDB-backed).
 * List endpoints return { skip, has_more, results: [...] }.
 */

export const getPopular = (type = 'movies', skip = 0, signal) =>
  fetchJson(`${API_BASE}/${type}/popular?skip=${skip}`, { signal });

export const getTop = (type = 'movies', skip = 0, signal) =>
  fetchJson(`${API_BASE}/${type}/top?skip=${skip}`, { signal });

export const getGenres = (signal) => fetchJson(`${API_BASE}/genres`, { signal });

export const getByGenre = (type = 'movies', genre, skip = 0, signal) =>
  fetchJson(`${API_BASE}/${type}/genre/${encodeURIComponent(genre)}?skip=${skip}`, { signal });

export const searchContent = (type = 'movies', query, signal) =>
  fetchJson(`${API_BASE}/${type}/search?q=${encodeURIComponent(query)}`, { signal });

/** Detail endpoint — backend uses singular /movie/:id and /series/:id. */
export const getDetails = (type = 'movies', id, signal) => {
  const endpointType = type === 'movies' ? 'movie' : 'series';
  return fetchJson(`${API_BASE}/${endpointType}/${encodeURIComponent(id)}`, { signal });
};
