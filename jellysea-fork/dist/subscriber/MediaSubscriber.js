"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaSubscriber = void 0;
const media_1 = require("../constants/media");
const datasource_1 = require("../datasource");
const Media_1 = __importDefault(require("../entity/Media"));
const MediaRequest_1 = require("../entity/MediaRequest");
const Season_1 = __importDefault(require("../entity/Season"));
const SeasonRequest_1 = __importDefault(require("../entity/SeasonRequest"));
const typeorm_1 = require("typeorm");
let MediaSubscriber = class MediaSubscriber {
    async updateChildRequestStatus(event, is4k) {
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const requests = await requestRepository.find({
            where: { media: { id: event.id } },
        });
        for (const request of requests) {
            if (request.is4k === is4k &&
                request.status === media_1.MediaRequestStatus.PENDING) {
                request.status = media_1.MediaRequestStatus.APPROVED;
                await requestRepository.save(request);
            }
        }
    }
    async updateRelatedMediaRequest(event, databaseEvent, is4k) {
        const requestRepository = (0, datasource_1.getRepository)(MediaRequest_1.MediaRequest);
        const seasonRequestRepository = (0, datasource_1.getRepository)(SeasonRequest_1.default);
        const relatedRequests = await requestRepository.find({
            relations: {
                media: true,
            },
            where: {
                media: { id: event.id },
                status: (0, typeorm_1.In)([media_1.MediaRequestStatus.APPROVED, media_1.MediaRequestStatus.FAILED]),
                is4k,
            },
        });
        // Check the media entity status and if available
        // or deleted, set the related request to completed
        if (relatedRequests.length > 0) {
            const completedRequests = [];
            for (const request of relatedRequests) {
                let shouldComplete = false;
                if ((event[request.is4k ? 'status4k' : 'status'] ===
                    media_1.MediaStatus.AVAILABLE ||
                    event[request.is4k ? 'status4k' : 'status'] ===
                        media_1.MediaStatus.DELETED) &&
                    event.mediaType === media_1.MediaType.MOVIE) {
                    shouldComplete = true;
                }
                else if (event.mediaType === 'tv') {
                    const allSeasonResults = await Promise.all(request.seasons.map(async (requestSeason) => {
                        const matchingSeason = event.seasons.find((mediaSeason) => mediaSeason.seasonNumber === requestSeason.seasonNumber);
                        const matchingOldSeason = databaseEvent.seasons.find((oldSeason) => oldSeason.seasonNumber === requestSeason.seasonNumber);
                        if (!matchingSeason) {
                            return false;
                        }
                        const currentSeasonStatus = matchingSeason[request.is4k ? 'status4k' : 'status'];
                        const previousSeasonStatus = matchingOldSeason?.[request.is4k ? 'status4k' : 'status'];
                        const hasStatusChanged = currentSeasonStatus !== previousSeasonStatus;
                        const shouldUpdate = (hasStatusChanged ||
                            requestSeason.status === media_1.MediaRequestStatus.COMPLETED) &&
                            (currentSeasonStatus === media_1.MediaStatus.AVAILABLE ||
                                currentSeasonStatus === media_1.MediaStatus.DELETED);
                        if (shouldUpdate) {
                            requestSeason.status = media_1.MediaRequestStatus.COMPLETED;
                            await seasonRequestRepository.save(requestSeason);
                            return true;
                        }
                        return false;
                    }));
                    const allSeasonsReady = allSeasonResults.every((result) => result);
                    shouldComplete = allSeasonsReady;
                }
                if (shouldComplete) {
                    request.status = media_1.MediaRequestStatus.COMPLETED;
                    completedRequests.push(request);
                }
            }
            await requestRepository.save(completedRequests);
        }
    }
    async beforeUpdate(event) {
        if (!event.entity) {
            return;
        }
        if (event.entity.status === media_1.MediaStatus.AVAILABLE &&
            event.databaseEntity.status === media_1.MediaStatus.PENDING) {
            this.updateChildRequestStatus(event.entity, false);
        }
        if (event.entity.status4k === media_1.MediaStatus.AVAILABLE &&
            event.databaseEntity.status4k === media_1.MediaStatus.PENDING) {
            this.updateChildRequestStatus(event.entity, true);
        }
        // Manually load related seasons into databaseEntity
        // for seasonStatusCheck in afterUpdate
        const seasons = await event.manager
            .getRepository(Season_1.default)
            .createQueryBuilder('season')
            .leftJoin('season.media', 'media')
            .where('media.id = :id', { id: event.databaseEntity.id })
            .getMany();
        event.databaseEntity.seasons = seasons;
    }
    async afterUpdate(event) {
        if (!event.entity) {
            return;
        }
        const validStatuses = [
            media_1.MediaStatus.PARTIALLY_AVAILABLE,
            media_1.MediaStatus.AVAILABLE,
            media_1.MediaStatus.DELETED,
        ];
        const seasonStatusCheck = (is4k) => {
            return event.entity?.seasons?.some((season, index) => {
                const previousSeason = event.databaseEntity.seasons[index];
                return (season[is4k ? 'status4k' : 'status'] !==
                    previousSeason?.[is4k ? 'status4k' : 'status']);
            });
        };
        if ((event.entity.status !== event.databaseEntity?.status ||
            (event.entity.mediaType === media_1.MediaType.TV &&
                seasonStatusCheck(false))) &&
            validStatuses.includes(event.entity.status)) {
            this.updateRelatedMediaRequest(event.entity, event.databaseEntity, false);
        }
        if ((event.entity.status4k !== event.databaseEntity?.status4k ||
            (event.entity.mediaType === media_1.MediaType.TV && seasonStatusCheck(true))) &&
            validStatuses.includes(event.entity.status4k)) {
            this.updateRelatedMediaRequest(event.entity, event.databaseEntity, true);
        }
    }
    listenTo() {
        return Media_1.default;
    }
};
exports.MediaSubscriber = MediaSubscriber;
exports.MediaSubscriber = MediaSubscriber = __decorate([
    (0, typeorm_1.EventSubscriber)()
], MediaSubscriber);
