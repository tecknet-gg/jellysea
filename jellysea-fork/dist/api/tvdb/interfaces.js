"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTmdbLanguageToTvdbWithFallback = exports.convertTMDBToTVDB = void 0;
const TMDB_TO_TVDB_MAPPING = {
    ar: 'ara', // Arabic
    bg: 'bul', // Bulgarian
    ca: 'cat', // Catalan
    cs: 'ces', // Czech
    da: 'dan', // Danish
    de: 'deu', // German
    el: 'ell', // Greek
    en: 'eng', // English
    es: 'spa', // Spanish
    et: 'est', // Estonian
    fi: 'fin', // Finnish
    fr: 'fra', // French
    he: 'heb', // Hebrew
    hi: 'hin', // Hindi
    hr: 'hrv', // Croatian
    hu: 'hun', // Hungarian
    it: 'ita', // Italian
    ja: 'jpn', // Japanese
    ko: 'kor', // Korean
    lb: 'ltz', // Luxembourgish
    lt: 'lit', // Lithuanian
    nl: 'nld', // Dutch
    pl: 'pol', // Polish
    ro: 'ron', // Romanian
    ru: 'rus', // Russian
    sq: 'sqi', // Albanian
    sr: 'srp', // Serbian
    sv: 'swe', // Swedish
    tr: 'tur', // Turkish
    uk: 'ukr', // Ukrainian
    vi: 'vie', // Vietnamese
    'es-MX': 'spa', // Spanish (Latin America) -> Spanish
    'nb-NO': 'nor', // Norwegian Bokmål -> Norwegian
    'pt-BR': 'pt', // Portuguese (Brazil) -> Portuguese - Brazil (from TVDB data)
    'pt-PT': 'por', // Portuguese (Portugal) -> Portuguese - Portugal (from TVDB data)
    'zh-CN': 'zho', // Chinese (Simplified) -> Chinese - China
    'zh-TW': 'zhtw', // Chinese (Traditional) -> Chinese - Taiwan
};
function convertTMDBToTVDB(tmdbCode) {
    const normalizedCode = tmdbCode.toLowerCase();
    return (TMDB_TO_TVDB_MAPPING[tmdbCode] ||
        TMDB_TO_TVDB_MAPPING[normalizedCode] ||
        null);
}
exports.convertTMDBToTVDB = convertTMDBToTVDB;
function convertTmdbLanguageToTvdbWithFallback(tmdbCode, fallback) {
    // First try exact match
    const tvdbCode = convertTMDBToTVDB(tmdbCode);
    if (tvdbCode)
        return tvdbCode;
    return tvdbCode || fallback || 'eng'; // Default to English if no match found
}
exports.convertTmdbLanguageToTvdbWithFallback = convertTmdbLanguageToTvdbWithFallback;
