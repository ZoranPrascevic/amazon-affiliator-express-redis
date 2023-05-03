const redis = require("redis");

class redisMiddleware {
    constructor(cb) {
        this.REDIS_PORT = process.env.REDIS_PORT || 6379;
        this.REDIS_URL = process.env.REDIS_URL;
        this.REDIS_HOST = process.env.REDIS_HOST;
    }

    init = () => {
        return new Promise((resolve, reject) => {
            this.client = redis.createClient(this.REDIS_PORT);

            // this.client = redis.createClient({
            //     host: this.REDIS_HOST,
            //     port: this.REDIS_PORT,
            // });

            const timer = setTimeout(() => reject("Redis Timeout!"), 1000);
            this.client.on("ready", () => {
                clearTimeout(timer);
                resolve();
            });
            this.client.on("error", (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    };

    makeKey = (originKey) => {
        return originKey + "rock";
    };

    getCached = (req) => {
        return new Promise((resolve, reject) => {
            this.client.get(req.url, function (err, reply) {
                if (err) {
                    reject();
                }
                if (reply === null) {
                    reject();
                } else {
                    resolve(reply);
                }
            });
        });
    };

    getRockCached = (key) => {
        return new Promise((resolve, reject) => {
            this.client.get(key, function (err, reply) {
                if (err) {
                    reject();
                }
                if (reply === null) {
                    reject();
                } else {
                    resolve(reply);
                }
            });
        });
    };

    sessionCache = (key) => {
        this.client.get(key, function (err, reply) {
            if (err) {
                throw new Error("Error in Session");
            }

            return reply;
        });
    };

    getStaticCache = (key) => {
        this.client.get(key, function (err, reply) {
            if (err) return false;

            return JSON.parse(reply);
        });
    };

    caching = (key, data) => {
        this.client.set(key, data);
        this.client.expire(key, 1);
    };

    rockCaching = (key, data) => {};

    delCache = (key) => {
        client.del(key);
    };
}

module.exports = redisMiddleware;
