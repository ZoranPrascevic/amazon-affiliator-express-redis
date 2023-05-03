const redisMiddleware = require("../middleware/redis.middleware");
const HttpException = require("./../utils/HttpException.utils");

const errorHandlerFactory = (middleware) => {
    return async (req, res, next) => {
        try {
            console.log(req.url);
            const redis = new redisMiddleware();

            redis
                .init()
                .then(() => {
                    redis
                        .getCached(req)
                        .then((result) => {
                            res.setHeader("Content-Type", "application/json");
                            res.status(200).send(result);
                        })
                        .catch(async () => {
                            try {
                                const result = await middleware(req, res, next);

                                const rockKey = redis.makeKey(req.url);

                                redis.caching(req.url, JSON.stringify(result));
                                redis.rockCaching(rockKey, JSON.stringify(result));

                                res.setHeader("Content-Type", "application/json");
                                res.status(200).send(result);
                            } catch (err) {
                                if (err.status === 400) next(err);

                                const key = redis.makeKey(req.url);

                                redis
                                    .getRockCached(key)
                                    .then((result) => {
                                        res.setHeader("Content-Type", "application/json");
                                        res.status(200).send(result);
                                    })
                                    .catch(() => {
                                        err = new HttpException(503, "Failed on rockCache!");
                                        next(err);
                                    });
                            }
                        });
                })
                .catch(async () => {
                    try {
                        const result = await middleware(req, res, next);

                        res.setHeader("Content-Type", "application/json");
                        res.status(200).send(result);
                    } catch (err) {
                        err = new HttpException(503, err.message);
                        next(err);
                    }
                });
        } catch (err) {
            err = new HttpException(503, err.message);
            next(err);
        }
    };
};

module.exports = { errorHandlerFactory };
