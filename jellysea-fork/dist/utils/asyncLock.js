"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
// whenever you need to run async code on tv show or movie that does "get existing" / "check if need to create new" / "save"
// then you need to put all of that code in "await asyncLock.dispatch" callback based on media id
// this will guarantee that only one part of code will run at the same for this media id to avoid code
// trying to create two or more entries for same movie/tvshow (which would result in sqlite unique constraint failrue)
class AsyncLock {
    constructor() {
        this.locked = {};
        this.ee = new events_1.EventEmitter();
        this.acquire = async (key) => {
            return new Promise((resolve) => {
                if (!this.locked[key]) {
                    this.locked[key] = true;
                    return resolve(undefined);
                }
                const nextAcquire = () => {
                    if (!this.locked[key]) {
                        this.locked[key] = true;
                        this.ee.removeListener(key, nextAcquire);
                        return resolve(undefined);
                    }
                };
                this.ee.on(key, nextAcquire);
            });
        };
        this.release = (key) => {
            delete this.locked[key];
            setImmediate(() => this.ee.emit(key));
        };
        this.dispatch = async (key, callback) => {
            const skey = String(key);
            await this.acquire(skey);
            try {
                await callback();
            }
            finally {
                this.release(skey);
            }
        };
        this.ee.setMaxListeners(0);
    }
}
exports.default = AsyncLock;
