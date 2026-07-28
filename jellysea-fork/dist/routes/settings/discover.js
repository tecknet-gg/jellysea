"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const datasource_1 = require("../../datasource");
const DiscoverSlider_1 = __importDefault(require("../../entity/DiscoverSlider"));
const logger_1 = __importDefault(require("../../logger"));
const express_1 = require("express");
const discoverSettingRoutes = (0, express_1.Router)();
discoverSettingRoutes.post('/', async (req, res) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    const sliders = req.body;
    if (!Array.isArray(sliders)) {
        return res.status(400).json({ message: 'Invalid request body.' });
    }
    for (let x = 0; x < sliders.length; x++) {
        const slider = sliders[x];
        const existingSlider = await sliderRepository.findOne({
            where: {
                id: slider.id,
            },
        });
        if (existingSlider && slider.id) {
            existingSlider.enabled = slider.enabled;
            existingSlider.order = x;
            // Only allow changes to the following when the slider is not built in
            if (!existingSlider.isBuiltIn) {
                existingSlider.title = slider.title;
                existingSlider.data = slider.data;
                existingSlider.type = slider.type;
            }
            await sliderRepository.save(existingSlider);
        }
        else {
            const newSlider = new DiscoverSlider_1.default({
                isBuiltIn: false,
                data: slider.data,
                title: slider.title,
                enabled: slider.enabled,
                order: x,
                type: slider.type,
            });
            await sliderRepository.save(newSlider);
        }
    }
    return res.json(sliders);
});
discoverSettingRoutes.post('/add', async (req, res) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    const slider = req.body;
    const newSlider = new DiscoverSlider_1.default({
        isBuiltIn: false,
        data: slider.data,
        title: slider.title,
        enabled: false,
        order: -1,
        type: slider.type,
    });
    await sliderRepository.save(newSlider);
    return res.json(newSlider);
});
discoverSettingRoutes.get('/reset', async (_req, res) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    await sliderRepository.clear();
    await DiscoverSlider_1.default.bootstrapSliders();
    return res.status(204).send();
});
discoverSettingRoutes.put('/:sliderId', async (req, res, next) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    const slider = req.body;
    try {
        const existingSlider = await sliderRepository.findOneOrFail({
            where: {
                id: Number(req.params.sliderId),
            },
        });
        // Only allow changes to the following when the slider is not built in
        if (!existingSlider.isBuiltIn) {
            existingSlider.title = slider.title;
            existingSlider.data = slider.data;
            existingSlider.type = slider.type;
        }
        await sliderRepository.save(existingSlider);
        return res.status(200).json(existingSlider);
    }
    catch (e) {
        logger_1.default.error('Something went wrong updating a slider.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Slider not found or cannot be updated.' });
    }
});
discoverSettingRoutes.delete('/:sliderId', async (req, res, next) => {
    const sliderRepository = (0, datasource_1.getRepository)(DiscoverSlider_1.default);
    try {
        const slider = await sliderRepository.findOneOrFail({
            where: { id: Number(req.params.sliderId), isBuiltIn: false },
        });
        await sliderRepository.remove(slider);
        return res.status(204).send();
    }
    catch (e) {
        logger_1.default.error('Something went wrong deleting a slider.', {
            label: 'API',
            errorMessage: e.message,
        });
        next({ status: 404, message: 'Slider not found or cannot be deleted.' });
    }
});
exports.default = discoverSettingRoutes;
