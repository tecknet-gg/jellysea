"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../logger"));
const base_1 = __importDefault(require("./base"));
class SonarrAPI extends base_1.default {
    constructor({ url, apiKey }) {
        super({ url, apiKey, apiName: 'Sonarr', cacheName: 'sonarr' });
        this.removeSeries = async (serieId) => {
            try {
                const { id, title } = await this.getSeriesByTvdbId(serieId);
                await this.axios.delete(`/series/${id}`, {
                    params: {
                        deleteFiles: true,
                        addImportExclusion: false,
                    },
                });
                logger_1.default.info(`[Sonarr] Removed series ${title}`);
            }
            catch (e) {
                throw new Error(`[Sonarr] Failed to remove series: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.clearCache = ({ tvdbId, externalId, title, }) => {
            if (tvdbId) {
                this.removeCache('/series/lookup', {
                    term: `tvdb:${tvdbId}`,
                });
            }
            if (externalId) {
                this.removeCache(`/series/${externalId}`);
            }
            if (title) {
                this.removeCache('/series/lookup', {
                    term: title,
                });
            }
        };
    }
    async getSeries() {
        try {
            const response = await this.axios.get('/series');
            return response.data;
        }
        catch (e) {
            throw new Error(`[Sonarr] Failed to retrieve series: ${e.message}`, {
                cause: e,
            });
        }
    }
    async getSeriesById(id) {
        try {
            const response = await this.axios.get(`/series/${id}`);
            return response.data;
        }
        catch (e) {
            throw new Error(`[Sonarr] Failed to retrieve series by ID: ${e.message}`, { cause: e });
        }
    }
    async getSeriesByTitle(title) {
        try {
            const response = await this.axios.get('/series/lookup', {
                params: {
                    term: title,
                },
            });
            if (!response.data[0]) {
                throw new Error('No series found');
            }
            return response.data;
        }
        catch (e) {
            logger_1.default.error('Error retrieving series by series title', {
                label: 'Sonarr API',
                errorMessage: e.message,
                title,
            });
            throw new Error('No series found', { cause: e });
        }
    }
    async getSeriesByTvdbId(id) {
        try {
            const response = await this.axios.get('/series/lookup', {
                params: {
                    term: `tvdb:${id}`,
                },
            });
            if (!response.data[0]) {
                throw new Error('Series not found');
            }
            return response.data[0];
        }
        catch (e) {
            logger_1.default.error('Error retrieving series by tvdb ID', {
                label: 'Sonarr API',
                errorMessage: e.message,
                tvdbId: id,
            });
            throw new Error('Series not found', { cause: e });
        }
    }
    async addSeries(options) {
        try {
            const series = await this.getSeriesByTvdbId(options.tvdbid);
            // If the series already exists, we will simply just update it
            if (series.id) {
                series.monitored = options.monitored ?? series.monitored;
                series.tags = options.tags
                    ? Array.from(new Set([...series.tags, ...options.tags]))
                    : series.tags;
                series.seasons = this.buildSeasonList(options.seasons, series.seasons);
                const newSeriesResponse = await this.axios.put('/series', series);
                if (newSeriesResponse.data.id) {
                    logger_1.default.info('Updated existing series in Sonarr.', {
                        label: 'Sonarr',
                        seriesId: newSeriesResponse.data.id,
                        seriesTitle: newSeriesResponse.data.title,
                    });
                    logger_1.default.debug('Sonarr update details', {
                        label: 'Sonarr',
                        series: newSeriesResponse.data,
                    });
                    try {
                        const episodes = await this.getEpisodes(newSeriesResponse.data.id);
                        const episodeIdsToMonitor = episodes
                            .filter((ep) => options.seasons.includes(ep.seasonNumber) && !ep.monitored)
                            .map((ep) => ep.id);
                        if (episodeIdsToMonitor.length > 0) {
                            logger_1.default.debug('Re-monitoring unmonitored episodes for requested seasons.', {
                                label: 'Sonarr',
                                seriesId: newSeriesResponse.data.id,
                                episodeCount: episodeIdsToMonitor.length,
                            });
                            await this.monitorEpisodes(episodeIdsToMonitor);
                        }
                    }
                    catch (e) {
                        logger_1.default.warn('Failed to re-monitor episodes', {
                            label: 'Sonarr',
                            errorMessage: e.message,
                            seriesId: newSeriesResponse.data.id,
                        });
                    }
                    if (options.searchNow) {
                        this.searchSeries(newSeriesResponse.data.id);
                    }
                    return newSeriesResponse.data;
                }
                else {
                    logger_1.default.error('Failed to update series in Sonarr', {
                        label: 'Sonarr',
                        options,
                    });
                    throw new Error('Failed to update series in Sonarr');
                }
            }
            const createdSeriesResponse = await this.axios.post('/series', {
                tvdbId: options.tvdbid,
                title: options.title,
                qualityProfileId: options.profileId,
                languageProfileId: options.languageProfileId,
                seasons: this.buildSeasonList(options.seasons, series.seasons.map((season) => ({
                    seasonNumber: season.seasonNumber,
                    // We force all seasons to false if its the first request
                    monitored: false,
                }))),
                tags: options.tags,
                seasonFolder: options.seasonFolder,
                monitored: options.monitored,
                monitorNewItems: options.monitorNewItems,
                rootFolderPath: options.rootFolderPath,
                seriesType: options.seriesType,
                addOptions: {
                    ignoreEpisodesWithFiles: true,
                    searchForMissingEpisodes: options.searchNow,
                },
            });
            if (createdSeriesResponse.data.id) {
                logger_1.default.info('Sonarr accepted request', { label: 'Sonarr' });
                logger_1.default.debug('Sonarr add details', {
                    label: 'Sonarr',
                    series: createdSeriesResponse.data,
                });
            }
            else {
                logger_1.default.error('Failed to add series to Sonarr', {
                    label: 'Sonarr',
                    options,
                });
                throw new Error('Failed to add series to Sonarr');
            }
            return createdSeriesResponse.data;
        }
        catch (e) {
            logger_1.default.error('Something went wrong while adding a series to Sonarr.', {
                label: 'Sonarr API',
                errorMessage: e.message,
                options,
                response: e?.response?.data,
            });
            throw new Error('Failed to add series', { cause: e });
        }
    }
    async getLanguageProfiles() {
        try {
            const data = await this.getRolling('/languageprofile', undefined, 3600);
            return data;
        }
        catch (e) {
            logger_1.default.error('Something went wrong while retrieving Sonarr language profiles.', {
                label: 'Sonarr API',
                errorMessage: e.message,
            });
            throw new Error('Failed to get language profiles', { cause: e });
        }
    }
    async searchSeries(seriesId) {
        logger_1.default.info('Executing series search command.', {
            label: 'Sonarr API',
            seriesId,
        });
        try {
            await this.runCommand('MissingEpisodeSearch', { seriesId });
        }
        catch (e) {
            logger_1.default.error('Something went wrong while executing Sonarr missing episode search.', {
                label: 'Sonarr API',
                errorMessage: e.message,
                seriesId,
            });
        }
    }
    async getEpisodes(seriesId) {
        try {
            const response = await this.axios.get('/episode', {
                params: { seriesId },
            });
            return response.data;
        }
        catch (e) {
            logger_1.default.error('Failed to retrieve episodes', {
                label: 'Sonarr API',
                errorMessage: e.message,
                seriesId,
            });
            throw new Error('Failed to get episodes', { cause: e });
        }
    }
    async monitorEpisodes(episodeIds) {
        try {
            await this.axios.put('/episode/monitor', {
                episodeIds,
                monitored: true,
            });
        }
        catch (e) {
            logger_1.default.error('Failed to monitor episodes', {
                label: 'Sonarr API',
                errorMessage: e.message,
                episodeIds,
            });
            throw new Error('Failed to monitor episodes', { cause: e });
        }
    }
    buildSeasonList(seasons, existingSeasons) {
        if (existingSeasons) {
            const newSeasons = existingSeasons.map((season) => {
                if (seasons.includes(season.seasonNumber)) {
                    season.monitored = true;
                }
                return season;
            });
            return newSeasons;
        }
        const newSeasons = seasons.map((seasonNumber) => ({
            seasonNumber,
            monitored: true,
        }));
        return newSeasons;
    }
}
exports.default = SonarrAPI;
