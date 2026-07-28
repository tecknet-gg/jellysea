"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const themoviedb_1 = require("../api/themoviedb");
const media_1 = require("../constants/media");
const datasource_1 = __importDefault(require("../datasource"));
const Blocklist_1 = require("../entity/Blocklist");
const Media_1 = __importDefault(require("../entity/Media"));
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const discover_1 = require("../routes/discover");
const TMDB_API_DELAY_MS = 250;
class AbortTransaction extends Error {
}
class BlocklistedTagProcessor {
    constructor() {
        this.running = false;
        this.progress = 0;
        this.total = 0;
    }
    async run() {
        this.running = true;
        try {
            await datasource_1.default.transaction(async (em) => {
                await this.cleanBlocklist(em);
                await this.createBlocklistEntries(em);
            });
        }
        catch (err) {
            if (err instanceof AbortTransaction) {
                logger_1.default.info('Aborting job: Process Blocklisted Tags', {
                    label: 'Jobs',
                });
            }
            else {
                throw err;
            }
        }
        finally {
            this.reset();
        }
    }
    status() {
        return {
            running: this.running,
            progress: this.progress,
            total: this.total,
        };
    }
    cancel() {
        this.running = false;
        this.progress = 0;
        this.total = 0;
    }
    reset() {
        this.cancel();
    }
    async createBlocklistEntries(em) {
        const tmdb = (0, discover_1.createTmdbWithBlocklistSettings)();
        const settings = (0, settings_1.getSettings)();
        const blocklistedTags = settings.main.blocklistedTags;
        const blocklistedTagsArr = blocklistedTags.split(',');
        const pageLimit = settings.main.blocklistedTagsLimit;
        const invalidKeywords = new Set();
        if (blocklistedTags.length === 0) {
            return;
        }
        // The maximum number of queries we're expected to execute
        this.total =
            2 * blocklistedTagsArr.length * pageLimit * themoviedb_1.SortOptionsIterable.length;
        for (const type of [media_1.MediaType.MOVIE, media_1.MediaType.TV]) {
            const getDiscover = type === media_1.MediaType.MOVIE ? tmdb.getDiscoverMovies : tmdb.getDiscoverTv;
            // Iterate for each tag
            for (const tag of blocklistedTagsArr) {
                const keywordDetails = await tmdb.getKeywordDetails({
                    keywordId: Number(tag),
                });
                if (keywordDetails === null) {
                    logger_1.default.warn('Skipping invalid keyword in blocklisted tags', {
                        label: 'Blocklisted Tags Processor',
                        keywordId: tag,
                    });
                    invalidKeywords.add(tag);
                    continue;
                }
                let queryMax = pageLimit * themoviedb_1.SortOptionsIterable.length;
                let fixedSortMode = false; // Set to true when the page limit allows for getting every page of tag
                for (let query = 0; query < queryMax; query++) {
                    const page = fixedSortMode
                        ? query + 1
                        : (query % pageLimit) + 1;
                    const sortBy = fixedSortMode
                        ? undefined
                        : themoviedb_1.SortOptionsIterable[query % themoviedb_1.SortOptionsIterable.length];
                    if (!this.running) {
                        throw new AbortTransaction();
                    }
                    try {
                        const response = await getDiscover({
                            page,
                            sortBy,
                            keywords: tag,
                        });
                        await this.processResults(response, tag, type, em);
                        await new Promise((res) => setTimeout(res, TMDB_API_DELAY_MS));
                        this.progress++;
                        if (page === 1 && response.total_pages <= queryMax) {
                            // We will finish the tag with less queries than expected, move progress accordingly
                            this.progress += queryMax - response.total_pages;
                            fixedSortMode = true;
                            queryMax = response.total_pages;
                        }
                    }
                    catch (error) {
                        logger_1.default.error('Error processing keyword in blocklisted tags', {
                            label: 'Blocklisted Tags Processor',
                            keywordId: tag,
                            errorMessage: error.message,
                        });
                    }
                }
            }
        }
        if (invalidKeywords.size > 0) {
            const currentTags = blocklistedTagsArr.filter((tag) => !invalidKeywords.has(tag));
            const cleanedTags = currentTags.join(',');
            if (cleanedTags !== blocklistedTags) {
                settings.main.blocklistedTags = cleanedTags;
                await settings.save();
                logger_1.default.info('Cleaned up invalid keywords from settings', {
                    label: 'Blocklisted Tags Processor',
                    removedKeywords: Array.from(invalidKeywords),
                    newBlocklistedTags: cleanedTags,
                });
            }
        }
    }
    async processResults(response, keywordId, mediaType, em) {
        const blocklistRepository = em.getRepository(Blocklist_1.Blocklist);
        for (const entry of response.results) {
            const blocklistEntry = await blocklistRepository.findOne({
                where: { tmdbId: entry.id, mediaType },
            });
            if (blocklistEntry) {
                // Don't mark manual blocklists with tags
                // If media wasn't previously blocklisted for this tag, add the tag to the media's blocklist
                if (blocklistEntry.blocklistedTags &&
                    !blocklistEntry.blocklistedTags.includes(`,${keywordId},`)) {
                    await blocklistRepository.update(blocklistEntry.id, {
                        blocklistedTags: `${blocklistEntry.blocklistedTags}${keywordId},`,
                    });
                }
            }
            else {
                // Media wasn't previously blocklisted, add it to the blocklist
                await Blocklist_1.Blocklist.addToBlocklist({
                    blocklistRequest: {
                        mediaType,
                        title: 'title' in entry ? entry.title : entry.name,
                        tmdbId: entry.id,
                        blocklistedTags: `,${keywordId},`,
                    },
                }, em);
            }
        }
    }
    async cleanBlocklist(em) {
        // Remove blocklist and media entries blocklisted by tags
        const mediaRepository = em.getRepository(Media_1.default);
        const mediaToRemove = await mediaRepository
            .createQueryBuilder('media')
            .innerJoinAndSelect(Blocklist_1.Blocklist, 'blist', 'blist.tmdbId = media.tmdbId AND blist.mediaType = media.mediaType')
            .where(`blist.blocklistedTags IS NOT NULL`)
            .getMany();
        // Batch removes so the query doesn't get too large
        for (let i = 0; i < mediaToRemove.length; i += 500) {
            await mediaRepository.remove(mediaToRemove.slice(i, i + 500)); // This also deletes the blocklist entries via cascading
        }
    }
}
const blocklistedTagsProcessor = new BlocklistedTagProcessor();
exports.default = blocklistedTagsProcessor;
