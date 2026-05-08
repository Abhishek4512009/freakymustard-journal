const API_BASE = 'https://moviesda-backend.onrender.com/api/english';

export const getPopular = async (type = 'movies', skip = 0) => {
    // Backend paths: /api/english/movies/popular or /api/english/series/popular
    const res = await fetch(`${API_BASE}/${type}/popular?skip=${skip}`);
    if (!res.ok) throw new Error(`Failed to fetch popular ${type}`);
    return res.json();
};

export const searchContent = async (type = 'movies', query) => {
    const res = await fetch(`${API_BASE}/${type}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Failed to search ${type}`);
    return res.json();
};

export const getDetails = async (type = 'movies', id) => {
    // Note: The backend uses /movie/:id and /series/:id
    const endpointType = type === 'movies' ? 'movie' : 'series';
    const res = await fetch(`${API_BASE}/${endpointType}/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch details for ${id}`);
    return res.json();
};
