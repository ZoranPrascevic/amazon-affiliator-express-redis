var admin = require("firebase-admin");

const serviceAccount = require("./../config/fb-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://express-754eb.firebaseio.com",
});

module.exports = admin
