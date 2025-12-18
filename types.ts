export interface Difficulty {
  id: number;
  version: string;
  difficulty_rating: number;
}

export interface BeatmapSet {
  id: number;
  artist: string;
  artist_unicode: string;
  title: string;
  title_unicode: string;
  creator: string;
  status: string;
  bpm: number;
  covers: {
    cover: string;
    cover2x: string;
    card: string;
    card2x: string;
    list: string;
    list2x: string;
    slimcover: string;
    slimcover2x: string;
  };
  tags: string;
  difficulties: Difficulty[];
}

export interface BannerData {
  title: string;
  artist: string;
  mapper: string;
  backgroundUrl: string; // Will store Base64 string for reliable export
  bpm: number;
  status: string;
  difficulties: Difficulty[];
}

export enum LoadingState {
  IDLE = 'IDLE',
  FETCHING_MAP = 'FETCHING_MAP',
  PROCESSING_IMAGE = 'PROCESSING_IMAGE',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type BannerSize = 'large' | 'medium' | 'slim' | 'compact' | 'micro';
export type DecorationType = 'none' | 'circles' | 'triangles' | 'hexagons' | 'curves' | 'leaves' | 'frogs';

export interface BannerConfig {
  showBpm: boolean;
  showStatus: boolean;
  font: string; 
  size: BannerSize;
  decoration: DecorationType;
  customText: string;
  selectedDifficultyId: number | null; 
  accentColor: string; 
  overlayColor: string; 
}