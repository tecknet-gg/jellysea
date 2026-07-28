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
exports.runMigrations = void 0;
const logger_1 = __importDefault(require("../../logger"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const migrationsDir = path_1.default.join(__dirname, 'migrations');
const runMigrations = async (settings, SETTINGS_PATH) => {
    let migrated = settings;
    try {
        // we read old backup and create a backup of currents settings
        const BACKUP_PATH = SETTINGS_PATH.replace('.json', '.old.json');
        let oldBackup = null;
        try {
            oldBackup = await promises_1.default.readFile(BACKUP_PATH, 'utf-8');
        }
        catch {
            /* empty */
        }
        await promises_1.default.writeFile(BACKUP_PATH, JSON.stringify(settings, undefined, ' '));
        const migrations = (await promises_1.default.readdir(migrationsDir)).filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
        const settingsBefore = JSON.stringify(migrated);
        for (const migration of migrations) {
            try {
                logger_1.default.debug(`Checking migration '${migration}'...`, {
                    label: 'Settings Migrator',
                });
                const { default: migrationFn } = await Promise.resolve(`${path_1.default.join(migrationsDir, migration)}`).then(s => __importStar(require(s)));
                const newSettings = await migrationFn(structuredClone(migrated));
                if (JSON.stringify(migrated) !== JSON.stringify(newSettings)) {
                    logger_1.default.debug(`Migration '${migration}' has been applied.`, {
                        label: 'Settings Migrator',
                    });
                }
                migrated = newSettings;
            }
            catch (e) {
                // we stop Seerr if the migration failed
                logger_1.default.error(`Error while running migration '${migration}': ${e.message}\n${e.stack}`, {
                    label: 'Settings Migrator',
                });
                logger_1.default.error('A common cause for this error is a permission issue with your configuration folder, a network issue or a corrupted database.', {
                    label: 'Settings Migrator',
                });
                process.exit();
            }
        }
        const settingsAfter = JSON.stringify(migrated);
        if (settingsBefore !== settingsAfter) {
            // a migration occured
            // we check that the new config will be saved
            await promises_1.default.writeFile(SETTINGS_PATH, JSON.stringify(migrated, undefined, ' '));
            const fileSaved = JSON.parse(await promises_1.default.readFile(SETTINGS_PATH, 'utf-8'));
            if (JSON.stringify(fileSaved) !== settingsAfter) {
                // something went wrong while saving file
                throw new Error('Unable to save settings after migration.');
            }
        }
        else if (oldBackup) {
            // no migration occured
            // we save the old backup (to avoid settings.json and settings.old.json being the same)
            await promises_1.default.writeFile(BACKUP_PATH, oldBackup.toString());
        }
    }
    catch (e) {
        // we stop Seerr if the migration failed
        logger_1.default.error(`Something went wrong while running settings migrations: ${e.message}`, {
            label: 'Settings Migrator',
        });
        logger_1.default.error('A common cause for this issue is a permission error of your configuration folder.', {
            label: 'Settings Migrator',
        });
        process.exit();
    }
    return migrated;
};
exports.runMigrations = runMigrations;
