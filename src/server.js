const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const upload = multer();

const dotenv = require("dotenv");

const HttpException = require("./utils/HttpException.utils");
const errorMiddleware = require("./middleware/error.middleware");
const userRouter = require("./routes/user.route");
const apiRouter = require("./routes/api.route");
const authMiddleware = require("./middleware/auth.middleware");

// Init express
const app = express();

// Init environment
dotenv.config();
// parse requests of content-type: application/json
// parses incoming requests with JSON payloads
app.use(express.json());

// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// for parsing multipart/form-data
app.use(upload.array());

// enabling cors for all requests by using cors middleware
app.use(cors());

app.use(cookieParser());

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", true);
    return next();
});

// Enable pre-flight
app.options("*", cors());
// app.use('/', authMiddleware.checkToken);

const port = process.env.PORT || 3000;

app.use('/users', userRouter);
app.use('/', authMiddleware.checkToken, apiRouter);

// 404 error
app.all("*", (req, res, next) => {
    const err = new HttpException(404, "Endpoint Not Found");
    next(err);
});

// Error middleware
app.use(errorMiddleware);

// starting the server
app.listen(port, () => console.log(`🚀 Server running on port ${port}!`));

module.exports = app;
