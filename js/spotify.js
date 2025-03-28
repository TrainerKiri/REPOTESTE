const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

export async function searchTracks(query) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error('Failed to search tracks');
    }
    return response.json();
}