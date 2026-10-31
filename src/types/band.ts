
export interface BandMember {
  name: string;
  role: string;
  photoUrl?: string;
}

export interface Band {
  id: string;

  // Informasi utama
  name: string;
  slug: string;
  description?: string;
  origin?: string;
  formedYear?: number;
  genre?: string;

  // Identitas visual
  logoUrl?: string;
  coverImageUrl?: string;

  // Media sosial
  instagramUrl?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  websiteUrl?: string;

  // Anggota band
  members?: BandMember[];

  // Kepemilikan
  ownerUid?: string;

  // Status band
  verificationStatus?: string;
  status?: string;
  isPublished: boolean;

  // Timestamp Firestore
  createdAt?: unknown;
  updatedAt?: unknown;
  approvedAt?: unknown;
  publishedAt?: unknown;
}
