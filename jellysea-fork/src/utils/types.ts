export enum MediaStatus {
  UNKNOWN = 1,
  PENDING = 2,
  PROCESSING = 3,
  PARTIALLY_AVAILABLE = 4,
  AVAILABLE = 5,
  BLOCKLISTED = 6,
  DELETED = 7,
}

export enum MediaType {
  MOVIE = 'movie',
  TV = 'tv',
}

export enum MediaRequestStatus {
  PENDING = 1,
  APPROVED = 2,
  DECLINED = 3,
}

export interface DownloadingItem {
  externalId: number
  downloadId: string
  size: number
  sizeLeft: number
  status: string
  timeLeft: string
  estimatedCompletionTime: string
  episode?: {
    seasonNumber: number
    episodeNumber: number
  }
}

export interface Season {
  id: number
  seasonNumber: number
  status: MediaStatus
}

export interface User {
  id: number;
  email: string;
  username?: string;
  plexUsername?: string;
  jellyfinUsername?: string;
  displayName: string;
  avatar: string;
  permissions: number;
  userType: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaInfo {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  mediaType: 'movie' | 'tv';
  status: MediaStatus;
  status4k?: MediaStatus;
  requests: MediaRequest[];
  plexUrl?: string;
  plexUrl4k?: string;
  iOSPlexUrl?: string;
  iOSPlexUrl4k?: string;
  serviceUrl?: string;
  serviceUrl4k?: string;
  downloadStatus?: DownloadingItem[];
  downloadStatus4k?: DownloadingItem[];
  mediaAdded?: string;
  createdAt: string;
  updatedAt: string;
  seasons?: Season[];
}

export interface MediaRequest {
  id: number;
  status: number;
  media: MediaInfo;
  type?: 'movie' | 'tv';
  seasons?: Season[];
  createdAt: string;
  updatedAt: string;
  requestedBy: User;
  is4k: boolean;
}

export interface MovieResult {
  id: number;
  mediaType: 'movie';
  popularity: number;
  posterPath?: string;
  backdropPath?: string;
  voteCount: number;
  voteAverage: number;
  genreIds: number[];
  overview: string;
  originalLanguage: string;
  title: string;
  originalTitle: string;
  releaseDate: string;
  adult: boolean;
  mediaInfo?: MediaInfo;
}

export interface TvResult {
  id: number;
  mediaType: 'tv';
  popularity: number;
  posterPath?: string;
  backdropPath?: string;
  voteCount: number;
  voteAverage: number;
  genreIds: number[];
  overview: string;
  originalLanguage: string;
  name: string;
  originalName: string;
  originCountry: string[];
  firstAirDate: string;
  mediaInfo?: MediaInfo;
}

export type MixedResult = MovieResult | TvResult;

export interface PageInfo {
  page: number;
  pages: number;
  results: number;
}

export interface DiscoverResponse<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface DiscoverSlider {
  id: string;
  type: string;
  title: string;
  isEnabled: boolean;
  order: number;
  data?: Record<string, unknown>;
}

export interface DiscoverSettings {
  sliders: DiscoverSlider[];
  enableWatchlist?: boolean;
}

export interface Genre {
  id: number
  name: string
}

export interface GenreSliderItem {
  id: number
  name: string
  backdrops: string[]
}

export interface StudioResult {
  id: number
  name: string
  backdrops: string[]
}

export interface NetworkResult {
  id: number
  name: string
  backdrops: string[]
}

export interface RequestResponse {
  pageInfo: PageInfo
  results: MediaRequest[]
}

export interface ProductionCompany {
  id: number
  logoPath?: string
  name: string
  originCountry?: string
}

export interface Network {
  id: number
  logoPath?: string
  name: string
  originCountry?: string
}

export interface DiscoverFiltersState {
  sortBy: string
  genre: string
  studio?: string
  network?: string
  yearGte: string
  yearLte: string
  status: string
  voteAverageGte: string
  voteAverageLte: string
  voteCountGte: string
  voteCountLte: string
}

export interface Cast {
  id: number
  castId: number
  character: string
  creditId: string
  gender?: number
  name: string
  order: number
  profilePath?: string
}

export interface Crew {
  id: number
  creditId: string
  department: string
  gender?: number
  job: string
  name: string
  profilePath?: string
  order?: number
}

export interface Video {
  url?: string
  site: string
  key: string
  name: string
  size: number
  type: string
}

export interface Keyword {
  id: number
  name: string
}

export interface ExternalIds {
  imdbId?: string
  freebaseMid?: string
  freebaseId?: string
  tvdbId?: number
  tvrageId?: string
  facebookId?: string
  instagramId?: string
  twitterId?: string
}

export interface WatchProvider {
  displayPriority?: number
  logoPath?: string
  id: number
  name: string
}

export interface WatchProviders {
  iso_3166_1: string
  link?: string
  buy?: WatchProvider[]
  flatrate?: WatchProvider[]
}

export interface MovieDetails {
  id: number
  imdbId?: string
  adult: boolean
  backdropPath?: string
  posterPath?: string
  budget: number
  genres: Genre[]
  homepage?: string
  originalLanguage: string
  originalTitle: string
  overview?: string
  popularity: number
  relatedVideos?: Video[]
  productionCompanies: ProductionCompany[]
  productionCountries: { iso_3166_1: string; name: string }[]
  releaseDate: string
  revenue: number
  runtime?: number
  spokenLanguages: { iso_639_1: string; name: string }[]
  status: string
  tagline?: string
  title: string
  video: boolean
  voteAverage: number
  voteCount: number
  credits: {
    cast: Cast[]
    crew: Crew[]
  }
  collection?: {
    id: number
    name: string
    posterPath?: string
    backdropPath?: string
  }
  mediaInfo?: MediaInfo
  externalIds: ExternalIds
  watchProviders?: WatchProviders[]
  keywords: Keyword[]
}

export interface Episode {
  id: number
  name: string
  airDate: string | null
  episodeNumber: number
  overview: string
  productionCode: string
  seasonNumber: number
  showId: number
  stillPath?: string
  voteAverage: number
  voteCount: number
}

export interface TvSeason {
  airDate: string
  id: number
  episodeCount: number
  name: string
  overview: string
  posterPath?: string
  seasonNumber: number
}

export interface TvDetails {
  id: number
  backdropPath?: string
  posterPath?: string
  contentRatings: { results: { iso_3166_1: string; rating: string }[] }
  createdBy: {
    id: number
    name: string
    gender: number
    profilePath?: string
  }[]
  episodeRunTime: number[]
  firstAirDate?: string
  genres: Genre[]
  homepage: string
  inProduction: boolean
  relatedVideos?: Video[]
  languages: string[]
  lastAirDate: string
  lastEpisodeToAir?: Episode
  name: string
  nextEpisodeToAir?: Episode
  networks: Network[]
  numberOfEpisodes: number
  numberOfSeasons: number
  originCountry: string[]
  originalLanguage: string
  originalName: string
  overview: string
  popularity: number
  productionCompanies: ProductionCompany[]
  productionCountries: { iso_3166_1: string; name: string }[]
  spokenLanguages: { englishName: string; iso_639_1: string; name: string }[]
  seasons: TvSeason[]
  status: string
  tagline?: string
  type: string
  voteAverage: number
  voteCount: number
  credits: {
    cast: Cast[]
    crew: Crew[]
  }
  externalIds: ExternalIds
  keywords: Keyword[]
  mediaInfo?: MediaInfo
  watchProviders?: WatchProviders[]
}

export interface RTRating {
  criticsRating: string
  criticsScore: number
  audienceRating: string
  audienceScore: number
  url: string
}

export interface IMDBRating {
  criticsScore: number
  url: string
}

export interface RatingResponse {
  rt?: RTRating
  imdb?: IMDBRating
}

export interface SeasonWithEpisodes {
  airDate: string
  id: number
  name: string
  overview: string
  posterPath?: string
  seasonNumber: number
  episodes: Episode[]
  externalIds: ExternalIds
}

