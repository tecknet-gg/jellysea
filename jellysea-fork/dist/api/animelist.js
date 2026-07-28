"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../logger"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const xml2js_1 = __importDefault(require("xml2js"));
const UPDATE_INTERVAL_MSEC = 24 * 3600 * 1000; // how often to download new mapping in milliseconds
// originally at https://raw.githubusercontent.com/ScudLee/anime-lists/master/anime-list.xml
const MAPPING_URL = 'https://raw.githubusercontent.com/Anime-Lists/anime-lists/master/anime-list.xml';
const LOCAL_PATH = process.env.CONFIG_DIRECTORY
    ? `${process.env.CONFIG_DIRECTORY}/anime-list.xml`
    : path_1.default.join(__dirname, '../../config/anime-list.xml');
const mappingRegexp = new RegExp(/;[0-9]+-([0-9]+)/g);
class AnimeListMapping {
    constructor() {
        this.syncing = false;
        this.mapping = {};
        // mapping file modification date when it was loaded
        this.mappingModified = null;
        // each episode in season 0 from TVDB can map to movie
        this.specials = {};
        this.isLoaded = () => Object.keys(this.mapping).length !== 0;
        this.loadFromFile = async () => {
            logger_1.default.info('Loading mapping file', { label: 'Anime-List Sync' });
            try {
                const mappingStat = await fs_1.promises.stat(LOCAL_PATH);
                const file = await fs_1.promises.readFile(LOCAL_PATH);
                const xml = (await xml2js_1.default.parseStringPromise(file));
                this.mapping = {};
                this.specials = {};
                for (const anime of xml['anime-list'].anime) {
                    // tvdbId can be nonnumber, like 'movie' string
                    let tvdbId;
                    if (anime.$.tvdbid && !isNaN(Number(anime.$.tvdbid))) {
                        tvdbId = Number(anime.$.tvdbid);
                    }
                    else {
                        tvdbId = undefined;
                    }
                    let imdbIds;
                    if (anime.$.imdbid) {
                        // if there are multiple imdb entries, then they map to different movies
                        imdbIds = anime.$.imdbid.split(',');
                    }
                    else {
                        // in case there is no imdbid, that's ok as there will be tmdbid
                        imdbIds = [undefined];
                    }
                    const tmdbId = anime.$.tmdbid ? Number(anime.$.tmdbid) : undefined;
                    const anidbId = Number(anime.$.anidbid);
                    this.mapping[anidbId] = {
                        // for season 0 ignore tvdbid, because this must be movie/OVA
                        tvdbId: anime.$.defaulttvdbseason === '0' ? undefined : tvdbId,
                        tmdbId: tmdbId,
                        imdbId: imdbIds[0], // this is used for one AniDB -> one imdb movie mapping
                        tvdbSeason: Number(anime.$.defaulttvdbseason),
                    };
                    if (tvdbId) {
                        const mappingList = anime['mapping-list'];
                        if (mappingList && mappingList.length != 0) {
                            let imdbIndex = 0;
                            for (const mapping of mappingList[0].mapping) {
                                const text = mapping._;
                                if (text && mapping.$.tvdbseason === '0') {
                                    let matches;
                                    while ((matches = mappingRegexp.exec(text)) !== null) {
                                        const episode = Number(matches[1]);
                                        if (!this.specials[tvdbId]) {
                                            this.specials[tvdbId] = {};
                                        }
                                        // map next available imdbid to episode in s0
                                        const imdbId = imdbIndex > imdbIds.length ? undefined : imdbIds[imdbIndex];
                                        if (tmdbId || imdbId) {
                                            this.specials[tvdbId][episode] = {
                                                tmdbId: tmdbId,
                                                imdbId: imdbId,
                                            };
                                            imdbIndex++;
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            // some movies do not have mapping-list, so map episode 1,2,3,..to movies
                            // movies must have imdbId or tmdbId
                            const hasImdb = imdbIds.length > 1 || imdbIds[0] !== undefined;
                            if ((hasImdb || tmdbId) && anime.$.defaulttvdbseason === '0') {
                                if (!this.specials[tvdbId]) {
                                    this.specials[tvdbId] = {};
                                }
                                // map each imdbid to episode in s0, episode index starts with 1
                                for (let idx = 0; idx < imdbIds.length; idx++) {
                                    this.specials[tvdbId][idx + 1] = {
                                        tmdbId: tmdbId,
                                        imdbId: imdbIds[idx],
                                    };
                                }
                            }
                        }
                    }
                }
                this.mappingModified = mappingStat.mtime;
                logger_1.default.info(`Loaded ${Object.keys(this.mapping).length} AniDB items from mapping file`, { label: 'Anime-List Sync' });
            }
            catch (e) {
                throw new Error(`Failed to load Anime-List mappings: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.downloadFile = async () => {
            logger_1.default.info('Downloading latest mapping file', {
                label: 'Anime-List Sync',
            });
            try {
                const response = await axios_1.default.get(MAPPING_URL, {
                    responseType: 'stream',
                });
                await new Promise((resolve, reject) => {
                    const writer = fs_1.default.createWriteStream(LOCAL_PATH);
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                    response.data.pipe(writer);
                });
            }
            catch (e) {
                throw new Error(`Failed to download Anime-List mapping: ${e.message}`, {
                    cause: e,
                });
            }
        };
        this.sync = async () => {
            // make sure only one sync runs at a time
            if (this.syncing) {
                return;
            }
            this.syncing = true;
            try {
                // check if local file is not "expired" yet
                if (fs_1.default.existsSync(LOCAL_PATH)) {
                    const now = new Date();
                    const stat = await fs_1.promises.stat(LOCAL_PATH);
                    if (now.getTime() - stat.mtime.getTime() < UPDATE_INTERVAL_MSEC) {
                        if (!this.isLoaded()) {
                            // no need to download, but make sure file is loaded
                            await this.loadFromFile();
                        }
                        else if (this.mappingModified &&
                            stat.mtime.getTime() > this.mappingModified.getTime()) {
                            // if file has been modified externally since last load, reload it
                            await this.loadFromFile();
                        }
                        return;
                    }
                }
                await this.downloadFile();
                await this.loadFromFile();
            }
            finally {
                this.syncing = false;
            }
        };
        this.getFromAnidbId = (anidbId) => {
            return this.mapping[anidbId];
        };
        this.getSpecialEpisode = (tvdbId, episode) => {
            const episodes = this.specials[tvdbId];
            return episodes ? episodes[episode] : undefined;
        };
    }
}
const animeList = new AnimeListMapping();
exports.default = animeList;
