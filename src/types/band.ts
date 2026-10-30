export interface BandMember {
  name: string;
  role: string;
  photoUrl?: string;
}

export interface Band {
  id: string;
  name: string;
  slug: string;
  description?: string;
  origin?: string;
  formedYear?: number;
  genre?: string;

  logoUrl?: string;
  coverImageUrl?: string;

  instagramUrl?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  websiteUrl?: string;

  members?: BandMember[];

  isPublished: boolean;
  updatedAt?: unknown;
}
