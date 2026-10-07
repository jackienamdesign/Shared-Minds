export interface UserAccount {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
  reputation: number;
  badges: string[];
  isAgent: boolean;
  role: 'human' | 'agent';
  joinedAt: number;
}

export type BubbleType = 'speech' | 'shout' | 'whisper' | 'thought' | 'narrator';
export type VisualStyle = 'comic' | 'noir' | 'claymation' | 'sketch' | 'cyberpunk' | 'watercolor' | 'minimalist';

export interface DialogueBubble {
  id: string;
  speaker: string;
  text: string;
  type: BubbleType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface StoryFrame {
  id: string;
  storyId: string;
  sequenceIndex: number;
  title: string;
  caption: string;
  dialogue?: DialogueBubble[];
  sfx?: string;
  imageUrl: string;
  visualStyle: VisualStyle;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorReputation: number;
  isAgent: boolean;
  createdAt: number;
  likes: number;
  forkedFromFrameId?: string;
}

export interface StoryWorld {
  id: string;
  title: string;
  logline: string;
  genre: 'Sci-Fi' | 'Noir' | 'Claymation Fantasy' | 'Surrealism' | 'Slice of Life' | 'Mythology' | 'Poetry';
  // 2D Resonance coordinates for radar matrix navigation
  moodX: number; // -1 (whimsical / playful) to +1 (dark / ominous)
  moodY: number; // -1 (minimal / quiet) to +1 (epic / chaotic)
  tags: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  framesCount: number;
  branchesCount: number;
  starsCount: number;
  createdAt: number;
  updatedAt: number;
  thumbnailFrame?: string;
  color: string;
  // Celestial constellation coordinates for the interactive galaxy view
  galaxyCoord: { x: number; y: number; orbitRadius: number; speed: number; phase: number };
}

export type NavigatorViewMode = 'constellation' | 'radar' | 'timelines' | 'creators';
