var request = require("request");

const requestService = (url, data, callback) =>
    request.post(
        {
            headers: { "content-type": "application/x-www-form-urlencoded" },
            url: url,
            body: data,
        },
        function (error, response) {
            if (error) callback(error.message, null);

            callback(null, response.data);
        }
    );

module.exports = requestService;
