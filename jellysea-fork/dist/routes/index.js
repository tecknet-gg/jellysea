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
const github_1 = __importDefault(require("../api/github"));
const pushover_1 = __importDefault(require("../api/pushover"));
const themoviedb_1 = __importDefault(require("../api/themoviedb"));
const datasource_1 = require("../datasource");
const DiscoverSlider_1 = __importDefault(require("../entity/DiscoverSlider"));
const permissions_1 = require("../lib/permissions");
const settings_1 = require("../lib/settings");
const logger_1 = __importDefault(require("../logger"));
const auth_1 = require("../middleware/auth");
const deprecation_1 = __importDefault(require("../middleware/deprecation"));
const Movie_1 = require("../models/Movie");
const Tv_1 = require("../models/Tv");
const common_1 = require("../models/common");
const overrideRule_1 = __importDefault(require("../routes/overrideRule"));
const settings_2 = __importDefault(require("../routes/settings"));
const watchlist_1 = __importDefault(require("../routes/watchlist"));
const appDataVolume_1 = require("../utils/appDataVolume");
const appVersion_1 = require("../utils/appVersion");
const restartFlag_1 = __importDefault(require("../utils/restartFlag"));
const typeHelpers_1 = require("../utils/typeHelpers");
const express_1 = require("express");
const auth_2 = __importDefault(require("./auth"));
const blocklist_1 = __importDefault(require("./blocklist"));
const collection_1 = __importDefault(require("./collection"));
const discover_1 = __importStar(require("./discover"));
const issue_1 = __importDefault(require("./issue"));
const issueComment_1 = __importDefault(require("./issueComment"));
const media_1 = __importDefault(require("./media"));
const movie_1 = __importDefault(require("./movie"));
const person_1 = __importDefault(require("./person"));
const request_1 = __importDefault(require("./request"));
const search_1 = __importDefault(require("./search"));
const service_1 = __importDefault(require("./service"));
const tv_1 = __importDefault(require("./tv"));
const user_1 = __importDefault(require("./user"));
const router = (0, express_1.Router)();
router.use(auth_1.checkUser);
router.get('/status', async (req, res) => {
    const githubApi = new github_1.default();
    const currentVersion = (0, appVersion_1.getAppVersion)();
    const commitTag = (0, appVersion_1.getCommitTag)();
    let updateAvailable = false;
    let commitsBehind = 0;
    if (currentVersion.startsWith('develop-') && commitTag !== 'local') {
        const commits = await githubApi.getSeerrCommits();
        if (commits.length) {
            const filteredCommits = commits.filter((commit) => !commit.commit.message.includes('[skip ci]'));
            if (filteredCommits[0].sha !== commitTag) {
                updateAvailable = true;
            }
            const commitIndex = filteredCommits.findIndex((commit) => commit.sha === commitTag);
            if (updateAvailable) {
                commitsBehind = commitIndex;
            }
        }
    }
    else if (commitTag !== 'local') {
        const releases = await githubApi.getSeerrReleases();
        if (releases.length) {
            const latestVersion = releases[0];
            if (!latestVersion.name.includes(currentVersion)) {
                updateAvailable = true;
            }
        }
    }
    return res.status(200).json({
        version: (0, appVersion_1.getAppVersion)(),
        commitTag: (0, appVersion_1.getCommitTag)(),
        updateAvailable,
        commitsBehind,
        restartRequired: restartFlag_1.default.isSet(),
    });
});
router.get('/status/appdata', (_req, res) => {
    return res.status(200).json({
        appData: (0, appDataVolume_1.appDataStatus)(),
        appDataPath: (0, appDataVolume_1.appDataPath)(),
        appDataPermissions: (0, appDataVolume_1.appDataPermissions)(),
    });
});
router.use('/user', (0, auth_1.isAuthenticated)(), user_1.default);
router.get('/settings/public', async (req, res) => {
    const settings = (0, settings_1.getSettings)();
    if (!(req.user?.settings?.notificationTypes.webpush ?? true)) {
        return res
            .status(200)
            .json({ ...settings.fullPublicSettings, enablePushRegistration: false });
    }
    else {
        return res.status(200).json(settings.fullPublicSettings);
    }
});
router.get('/settings/discover', (0, auth_1.isAuthenticated)(), async (_req, res) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    const sliders = await sliderRepository.find({ order: { order: 'ASC' } });
    return res.json(sliders);
});
router.get('/settings/notifications/pushover/sounds', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const pushoverApi = new pushover_1.default();
    try {
        if (!req.query.token) {
            throw new Error('Pushover application token missing from request');
        }
        const sounds = await pushoverApi.getSounds(req.query.token);
        res.status(200).json(sounds);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving Pushover sounds', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve Pushover sounds.',
        });
    }
});
router.use('/settings', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), settings_2.default);
router.use('/search', (0, auth_1.isAuthenticated)(), search_1.default);
router.use('/discover', (0, auth_1.isAuthenticated)(), discover_1.default);
router.use('/request', (0, auth_1.isAuthenticated)(), request_1.default);
router.use('/watchlist', (0, auth_1.isAuthenticated)(), watchlist_1.default);
router.use('/blocklist', (0, auth_1.isAuthenticated)(), blocklist_1.default);
router.use('/blacklist', (0, auth_1.isAuthenticated)(), (0, deprecation_1.default)({
    oldPath: '/api/v1/blacklist',
    newPath: '/api/v1/blocklist',
    sunsetDate: '2026-06-01',
}), blocklist_1.default);
router.use('/movie', (0, auth_1.isAuthenticated)(), movie_1.default);
router.use('/tv', (0, auth_1.isAuthenticated)(), tv_1.default);
router.use('/media', (0, auth_1.isAuthenticated)(), media_1.default);
router.use('/person', (0, auth_1.isAuthenticated)(), person_1.default);
router.use('/collection', (0, auth_1.isAuthenticated)(), collection_1.default);
router.use('/service', (0, auth_1.isAuthenticated)(), service_1.default);
router.use('/issue', (0, auth_1.isAuthenticated)(), issue_1.default);
router.use('/issueComment', (0, auth_1.isAuthenticated)(), issueComment_1.default);
router.use('/auth', auth_2.default);
router.use('/overrideRule', (0, auth_1.isAuthenticated)(permissions_1.Permission.ADMIN), overrideRule_1.default);
router.get('/regions', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const regions = await tmdb.getRegions();
        return res.status(200).json(regions);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving regions', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve regions.',
        });
    }
});
router.get('/languages', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const languages = await tmdb.getLanguages();
        return res.status(200).json(languages);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving languages', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve languages.',
        });
    }
});
router.get('/studio/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const studio = await tmdb.getStudio(Number(req.params.id));
        return res.status(200).json((0, Movie_1.mapProductionCompany)(studio));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving studio', {
            label: 'API',
            errorMessage: e.message,
            studioId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve studio.',
        });
    }
});
router.get('/network/:id', async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const network = await tmdb.getNetwork(Number(req.params.id));
        return res.status(200).json((0, Tv_1.mapNetwork)(network));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving network', {
            label: 'API',
            errorMessage: e.message,
            networkId: req.params.id,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve network.',
        });
    }
});
router.get('/genres/movie', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const genres = await tmdb.getMovieGenres({
            language: req.query.language ?? req.locale,
        });
        return res.status(200).json(genres);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie genres', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie genres.',
        });
    }
});
router.get('/genres/tv', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const genres = await tmdb.getTvGenres({
            language: req.query.language ?? req.locale,
        });
        return res.status(200).json(genres);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving series genres', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve series genres.',
        });
    }
});
router.get('/backdrops', async (req, res, next) => {
    const tmdb = (0, discover_1.createTmdbWithRegionLanguage)();
    try {
        const data = (await tmdb.getAllTrending({
            page: 1,
            timeWindow: 'week',
        })).results.filter((result) => !(0, typeHelpers_1.isPerson)(result));
        return res
            .status(200)
            .json(data
            .map((result) => result.backdrop_path)
            .filter((backdropPath) => !!backdropPath));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving backdrops', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve backdrops.',
        });
    }
});
router.get('/keyword/:keywordId', async (req, res, next) => {
    const tmdb = (0, discover_1.createTmdbWithRegionLanguage)();
    try {
        const result = await tmdb.getKeywordDetails({
            keywordId: Number(req.params.keywordId),
        });
        return res.status(200).json(result);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving keyword data', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve keyword data.',
        });
    }
});
router.get('/watchproviders/regions', async (req, res, next) => {
    const tmdb = (0, discover_1.createTmdbWithRegionLanguage)();
    try {
        const result = await tmdb.getAvailableWatchProviderRegions({});
        return res.status(200).json(result);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving watch provider regions', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve watch provider regions.',
        });
    }
});
router.get('/watchproviders/movies', async (req, res, next) => {
    const tmdb = (0, discover_1.createTmdbWithRegionLanguage)();
    try {
        const result = await tmdb.getMovieWatchProviders({
            watchRegion: req.query.watchRegion,
        });
        return res.status(200).json((0, common_1.mapWatchProviderDetails)(result));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving movie watch providers', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie watch providers.',
        });
    }
});
router.get('/watchproviders/tv', async (req, res, next) => {
    const tmdb = (0, discover_1.createTmdbWithRegionLanguage)();
    try {
        const result = await tmdb.getTvWatchProviders({
            watchRegion: req.query.watchRegion,
        });
        return res.status(200).json((0, common_1.mapWatchProviderDetails)(result));
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving tv watch providers', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve tv watch providers.',
        });
    }
});
router.get('/certifications/movie', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const certifications = await tmdb.getMovieCertifications();
        return res.status(200).json(certifications);
    }
    catch (e) {
        logger_1.default.error('Something went wrong retrieving movie certifications', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve movie certifications.',
        });
    }
});
router.get('/certifications/tv', (0, auth_1.isAuthenticated)(), async (req, res, next) => {
    const tmdb = new themoviedb_1.default();
    try {
        const certifications = await tmdb.getTvCertifications();
        return res.status(200).json(certifications);
    }
    catch (e) {
        logger_1.default.debug('Something went wrong retrieving TV certifications', {
            label: 'API',
            errorMessage: e.message,
        });
        return next({
            status: 500,
            message: 'Unable to retrieve TV certifications.',
        });
    }
});
router.get('/', (_req, res) => {
    return res.status(200).json({
        api: 'Seerr API',
        version: '1.0',
    });
});
exports.default = router;
