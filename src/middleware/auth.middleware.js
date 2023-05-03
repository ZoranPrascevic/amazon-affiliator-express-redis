const HttpException = require("../utils/HttpException.utils");
const UserModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const admin = require("./../service/firebase-service");
const dotenv = require("dotenv");

dotenv.config();

const checkToken = (req, res, next) => {
    try {
        let authHeader = req.headers["x-access-token"] || req.headers["authorization"];
        const bearer = "Bearer ";

        if (!authHeader || !authHeader.startsWith(bearer)) {
            throw new HttpException(401, "Access denied. No credentials sent!");
        }

        const token = authHeader.replace(bearer, "");
        const secretKey = process.env.SECRET_JWT;
        next();

        // jwt.verify(token, secretKey, async (err, verifiedJwt) => {
        //     try {
        //         if (err) {
        //             throw new HttpException(401, "Invalid token!");
        //         } else {
                    // const user = await UserModel.findOne({
                    //     id: verifiedJwt.user_id,
                    // });

                    // if (!user) {
                    //     throw new HttpException(401, "Authentication failed!");
                    // }

                    // const ownerAuthorized = req.params.id == user.id;

                    // if (!ownerAuthorized && roles.length && !roles.includes(user.role)) {
                    //     throw new HttpException(401, "Unauthorized");
                    // }

                    // req.currentUser = user;

                    // req.session.IS_TBCOM = req.headers.host.includes("testbericht.de") ? true : false;
        //             req.decoded = verifiedJwt;
        //             next();
        //         }
        //     } catch (e) {
        //         next(e);
        //     }
        // });
    } catch (e) {
        // e.status = 401;
        next(e);
    }
};

const getAuthToken = (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
        req.authToken = req.headers.authorization.split(" ")[1];
    } else {
        req.authToken = null;
    }
    next();
};

const checkIfAuthenticated = (req, res, next) => {
    getAuthToken(req, res, async () => {
        try {
            const { authToken } = req;
            const userInfo = await admin.auth().verifyIdToken(authToken);
            req.authId = userInfo.uid;
            return next();
        } catch (e) {
            return res.status(401).send({ error: "You are not authorized to make this request" });
        }
    });
};

module.exports = { checkToken, getAuthToken, checkIfAuthenticated };