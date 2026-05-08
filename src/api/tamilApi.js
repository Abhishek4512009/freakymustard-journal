const API_BASE = 'https://moviesda-backend.onrender.com/api';

export const getYears = async () => {
    const res = await fetch(`${API_BASE}/years`);
    if (!res.ok) throw new Error('Failed to fetch years');
    return res.json();
};

export const getMovies = async (yearUrl, pages = 1) => {
    // Ensures url ends nicely
    const baseUrl = yearUrl.replace(/\/$/, '');
    const url = pages === 1 
        ? `${API_BASE}/movies?year_url=${encodeURIComponent(baseUrl)}&pages=1`
        : `${API_BASE}/movies?year_url=${encodeURIComponent(baseUrl)}&pages=${pages}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movies');
    const data = await res.json();
    return data.filter(m => !m.title.startsWith('Tamil') && !m.title.includes('Movies'));
};

export const getAutoStream = async (movieUrl) => {
    const res = await fetch(`${API_BASE}/auto-stream?movie_url=${encodeURIComponent(movieUrl)}`);
    if (!res.ok) throw new Error('Failed to fetch auto stream');
    return res.json();
};

export const searchMovies = async (query) => {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
};
