import { BeatmapSet, Difficulty } from '../types';

const NERINYAN_API_SEARCH = 'https://api.nerinyan.moe/search';
const MINO_API_SET = 'https://catboy.best/api/v2/s';

export const extractBeatmapSetId = (url: string): string | null => {
  try {
    const match = url.match(/beatmapsets\/(\d+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
};

const mapStatus = (status: number | string): string => {
  const s = Number(status);
  switch (s) {
    case 4: return 'Loved';
    case 3: return 'Qualified';
    case 2: return 'Approved';
    case 1: return 'Ranked';
    case 0: return 'Pending';
    case -1: return 'WIP';
    case -2: return 'Graveyard';
    default: return typeof status === 'string' ? status : 'Graveyard';
  }
};

const getCommonData = (set: any): BeatmapSet => {
    const id = set.id || set.beatmapset_id;
    // Handle Mino/Nerinyan structure differences
    const rawCovers = set.covers || {};
    
    const covers = {
        cover: rawCovers.cover || `https://assets.ppy.sh/beatmaps/${id}/covers/cover.jpg`,
        cover2x: rawCovers.cover2x || rawCovers['cover@2x'] || `https://assets.ppy.sh/beatmaps/${id}/covers/cover@2x.jpg`,
        card: rawCovers.card || `https://assets.ppy.sh/beatmaps/${id}/covers/card.jpg`,
        card2x: rawCovers.card2x || rawCovers['card@2x'] || `https://assets.ppy.sh/beatmaps/${id}/covers/card@2x.jpg`,
        list: rawCovers.list || `https://assets.ppy.sh/beatmaps/${id}/covers/list.jpg`,
        list2x: rawCovers.list2x || rawCovers['list@2x'] || `https://assets.ppy.sh/beatmaps/${id}/covers/list@2x.jpg`,
        slimcover: rawCovers.slimcover || `https://assets.ppy.sh/beatmaps/${id}/covers/slimcover.jpg`,
        slimcover2x: rawCovers.slimcover2x || rawCovers['slimcover@2x'] || `https://assets.ppy.sh/beatmaps/${id}/covers/slimcover@2x.jpg`,
    };

    // Safely extract BPM
    let bpm = set.bpm;
    if (!bpm && set.beatmaps && set.beatmaps.length > 0) {
        bpm = set.beatmaps[0].bpm;
    }

    // Extract Difficulties
    // Sort by star rating (difficulty_rating)
    const difficulties: Difficulty[] = (set.beatmaps || []).map((b: any) => ({
        id: b.id || b.beatmap_id,
        version: b.version,
        difficulty_rating: b.difficulty_rating
    })).sort((a: Difficulty, b: Difficulty) => a.difficulty_rating - b.difficulty_rating);

    return {
        id: id,
        artist: set.artist,
        artist_unicode: set.artist_unicode || set.artist,
        title: set.title,
        title_unicode: set.title_unicode || set.title,
        creator: set.creator,
        status: mapStatus(set.status),
        bpm: bpm || 0,
        tags: set.tags || '',
        covers: covers,
        difficulties: difficulties
    };
};

export const fetchBeatmapData = async (setId: string): Promise<BeatmapSet> => {
  // Strategy 1: Try Nerinyan (Search)
  try {
    const response = await fetch(`${NERINYAN_API_SEARCH}?q=${setId}`);
    if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            // Find exact match
            const set = data.find((d: any) => 
                String(d.beatmapset_id) === setId || String(d.id) === setId
            ) || data[0];
            return getCommonData(set);
        }
    }
  } catch (e) {
      console.warn("Nerinyan fetch failed, trying fallback...", e);
  }

  // Strategy 2: Try Mino (Catboy.best) - Direct Set ID
  try {
      const response = await fetch(`${MINO_API_SET}/${setId}`);
      if (response.ok) {
          const data = await response.json();
          // Mino returns the object directly, not an array
          if (data && data.id) {
              return getCommonData(data);
          }
      }
  } catch (e) {
      console.warn("Mino fetch failed", e);
  }

  throw new Error('Beatmap set not found on any mirror (Nerinyan or Mino).');
};