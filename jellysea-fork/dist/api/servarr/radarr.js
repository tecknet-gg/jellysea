"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../logger"));
const base_1 = __importDefault(require("./base"));
class RadarrAPI extends base_1.default {
    constructor({ url, apiKey }) {
        super({ url, apiKey, cacheName: 'radarr', apiName: 'Radarr' });
        this.getMovies = async () => {
            try {
                const response = await this.axios.get('/movie');
                return response.data;
            }
            catch (e) {
                throw new Error(`[Radarr] Failed to retrieve movies: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.getMovie = async ({ id }) => {
            try {
                const response = await this.axios.get(`/movie/${id}`);
                return response.data;
            }
            catch (e) {
                throw new Error(`[Radarr] Failed to retrieve movie: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.addMovie = async (options) => {
            try {
                const movie = await this.getMovieByTmdbId(options.tmdbId);
                if (movie.hasFile) {
                    logger_1.default.info('Title already exists and is available. Skipping add and returning success', {
                        label: 'Radarr',
                        movie,
                    });
                    return movie;
                }
                // movie exists in Radarr but is neither downloaded nor monitored
                if (movie.id && !movie.monitored) {
                    const response = await this.axios.put(`/movie`, {
                        ...movie,
                        title: options.title,
                        qualityProfileId: options.qualityProfileId,
                        profileId: options.profileId,
                        titleSlug: options.tmdbId.toString(),
                        minimumAvailability: options.minimumAvailability,
                        tmdbId: options.tmdbId,
                        year: options.year,
                        tags: Array.from(new Set([...movie.tags, ...options.tags])),
                        rootFolderPath: options.rootFolderPath,
                        monitored: options.monitored,
                        addOptions: {
                            searchForMovie: options.searchNow,
                        },
                    });
                    if (response.data.monitored) {
                        logger_1.default.info('Found existing title in Radarr and set it to monitored.', {
                            label: 'Radarr',
                            movieId: response.data.id,
                            movieTitle: response.data.title,
                        });
                        logger_1.default.debug('Radarr update details', {
                            label: 'Radarr',
                            movie: response.data,
                        });
                        if (options.searchNow) {
                            this.searchMovie(response.data.id);
                        }
                        return response.data;
                    }
                    else {
                        logger_1.default.error('Failed to update existing movie in Radarr.', {
                            label: 'Radarr',
                            options,
                        });
                        throw new Error('Failed to update existing movie in Radarr');
                    }
                }
                if (movie.id) {
                    // Movie exists and is already monitored
                    logger_1.default.info('Movie is already monitored in Radarr.', {
                        label: 'Radarr',
                        movieId: movie.id,
                        movieTitle: movie.title,
                        hasFile: movie.hasFile,
                    });
                    // If searchNow is requested and movie doesn't have a file, trigger search
                    if (options.searchNow && !movie.hasFile) {
                        logger_1.default.info('Triggering search for existing monitored movie without file', {
                            label: 'Radarr',
                            movieId: movie.id,
                            movieTitle: movie.title,
                        });
                        this.searchMovie(movie.id);
                    }
                    return movie;
                }
                const response = await this.axios.post(`/movie`, {
                    title: options.title,
                    qualityProfileId: options.qualityProfileId,
                    profileId: options.profileId,
                    titleSlug: options.tmdbId.toString(),
                    minimumAvailability: options.minimumAvailability,
                    tmdbId: options.tmdbId,
                    year: options.year,
                    rootFolderPath: options.rootFolderPath,
                    monitored: options.monitored,
                    tags: options.tags,
                    addOptions: {
                        searchForMovie: options.searchNow,
                    },
                });
                if (response.data.id) {
                    logger_1.default.info('Radarr accepted request', { label: 'Radarr' });
                    logger_1.default.debug('Radarr add details', {
                        label: 'Radarr',
                        movie: response.data,
                    });
                }
                else {
                    logger_1.default.error('Failed to add movie to Radarr', {
                        label: 'Radarr',
                        options,
                    });
                    throw new Error('Failed to add movie to Radarr');
                }
                return response.data;
            }
            catch (e) {
                logger_1.default.error('Failed to add movie to Radarr. This might happen if the movie already exists, in which case you can safely ignore this error.', {
                    label: 'Radarr',
                    errorMessage: e.message,
                    options,
                    response: e?.response?.data,
                });
                throw new Error('Failed to add movie to Radarr', { cause: e });
            }
        };
        this.removeMovie = async (movieId) => {
            try {
                const { id, title } = await this.getMovieByTmdbId(movieId);
                await this.axios.delete(`/movie/${id}`, {
                    params: {
                        deleteFiles: true,
                        addImportExclusion: false,
                    },
                });
                logger_1.default.info(`[Radarr] Removed movie ${title}`);
            }
            catch (e) {
                throw new Error(`[Radarr] Failed to remove movie: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.clearCache = ({ tmdbId, externalId, }) => {
            if (tmdbId) {
                this.removeCache('/movie/lookup', {
                    term: `tmdb:${tmdbId}`,
                });
            }
            if (externalId) {
                this.removeCache(`/movie/${externalId}`);
            }
        };
    }
    async getMovieByTmdbId(id) {
        try {
            const response = await this.axios.get('/movie/lookup', {
                params: {
                    term: `tmdb:${id}`,
                },
            });
            if (!response.data[0]) {
                throw new Error('Movie not found');
            }
            return response.data[0];
        }
        catch (e) {
            logger_1.default.error('Error retrieving movie by TMDB ID', {
                label: 'Radarr API',
                errorMessage: e.message,
                tmdbId: id,
            });
            throw new Error('Movie not found', { cause: e });
        }
    }
    async searchMovie(movieId) {
        logger_1.default.info('Executing movie search command', {
            label: 'Radarr API',
            movieId,
        });
        try {
            await this.runCommand('MoviesSearch', { movieIds: [movieId] });
        }
        catch (e) {
            logger_1.default.error('Something went wrong while executing Radarr movie search.', {
                label: 'Radarr API',
                errorMessage: e.message,
                movieId,
            });
        }
    }
}
exports.default = RadarrAPI;
