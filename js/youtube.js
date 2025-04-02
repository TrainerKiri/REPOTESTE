import { createClient } from '@supabase/supabase-js';

export function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

export function getVideoInfo(videoId) {
    return {
        id: videoId,
        title: 'Vídeo do YouTube',
        channelTitle: 'Canal'
    };
}