"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DiscoverSlider_1;
Object.defineProperty(exports, "__esModule", { value: true });
const discover_1 = require("../constants/discover");
const datasource_1 = require("../datasource");
const logger_1 = __importDefault(require("../logger"));
const DbColumnHelper_1 = require("../utils/DbColumnHelper");
const typeorm_1 = require("typeorm");
let DiscoverSlider = DiscoverSlider_1 = class DiscoverSlider {
    static async bootstrapSliders() {
        const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1);
        for (const slider of discover_1.defaultSliders) {
            const existingSlider = await sliderRepository.findOne({
                where: {
                    type: slider.type,
                },
            });
            if (!existingSlider) {
                logger_1.default.info('Creating built-in discovery slider', {
                    label: 'Discover Slider',
                    slider,
                });
                await sliderRepository.save(new DiscoverSlider_1(slider));
            }
        }
    }
    constructor(init) {
        Object.assign(this, init);
    }
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], DiscoverSlider.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], DiscoverSlider.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], DiscoverSlider.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], DiscoverSlider.prototype, "isBuiltIn", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], DiscoverSlider.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true })
    // Title is not required for built in sliders because we will
    // use translations for them.
    ,
    __metadata("design:type", String)
], DiscoverSlider.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DiscoverSlider.prototype, "data", void 0);
__decorate([
    (0, DbColumnHelper_1.DbAwareColumn)({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], DiscoverSlider.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        type: (0, DbColumnHelper_1.resolveDbType)('datetime'),
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], DiscoverSlider.prototype, "updatedAt", void 0);
DiscoverSlider = DiscoverSlider_1 = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DiscoverSlider);
exports.default = DiscoverSlider;
