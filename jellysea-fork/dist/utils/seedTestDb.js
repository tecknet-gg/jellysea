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
exports.resetTestDb = exports.seedTestDb = void 0;
const user_1 = require("../constants/user");
const datasource_1 = __importStar(require("../datasource"));
const User_1 = require("../entity/User");
const gravatar_url_1 = __importDefault(require("gravatar-url"));
// Precomputed bcrypt hash of 'test1234'. We precompute this to avoid
// having to hash the password every time we seed the database.
const TEST_USER_PASSWORD_HASH = '$2b$12$Z5V2P5HZgmx4/AnWFMZN1.aD5AM1NucNi.mhNTSQ9oVtmdzu7Le/a';
/**
 * Seeds test users into the database.
 * Assumes the database schema is already set up.
 */
async function seedTestUsers() {
    const userRepository = (0, datasource_1.getRepository)(User_1.User);
    const admin = await userRepository.findOne({
        select: { id: true, plexId: true },
        where: { id: 1 },
    });
    // Create the admin user
    const user = (await userRepository.findOne({
        where: { email: 'admin@seerr.dev' },
    })) ?? new User_1.User();
    user.plexId = admin?.plexId ?? 1;
    user.plexToken = '1234';
    user.plexUsername = 'admin';
    user.username = 'admin';
    user.email = 'admin@seerr.dev';
    user.userType = user_1.UserType.PLEX;
    user.password = TEST_USER_PASSWORD_HASH;
    user.permissions = 2;
    user.avatar = (0, gravatar_url_1.default)('admin@seerr.dev', { default: 'mm', size: 200 });
    await userRepository.save(user);
    // Create the other user
    const otherUser = (await userRepository.findOne({
        where: { email: 'friend@seerr.dev' },
    })) ?? new User_1.User();
    otherUser.plexId = admin?.plexId ?? 1;
    otherUser.plexToken = '1234';
    otherUser.plexUsername = 'friend';
    otherUser.username = 'friend';
    otherUser.email = 'friend@seerr.dev';
    otherUser.userType = user_1.UserType.PLEX;
    otherUser.password = TEST_USER_PASSWORD_HASH;
    otherUser.permissions = 32;
    otherUser.avatar = (0, gravatar_url_1.default)('friend@seerr.dev', {
        default: 'mm',
        size: 200,
    });
    await userRepository.save(otherUser);
}
/**
 * Initializes the database connection and seeds test users.
 * Used by both Cypress tests and Vitest unit tests.
 */
async function seedTestDb(options = {}) {
    const dbConnection = datasource_1.default.isInitialized
        ? datasource_1.default
        : await datasource_1.default.initialize();
    if (!options.preserveDb) {
        await dbConnection.dropDatabase();
    }
    if (options.withMigrations) {
        await dbConnection.runMigrations();
    }
    else {
        await dbConnection.synchronize();
    }
    await seedTestUsers();
}
exports.seedTestDb = seedTestDb;
/**
 * Resets the database to a clean state with seeded test users.
 * Used between tests to ensure isolation.
 * Assumes DB has been initialized.
 */
async function resetTestDb() {
    await datasource_1.default.synchronize(true);
    await seedTestUsers();
}
exports.resetTestDb = resetTestDb;
