const admin = require("./../service/firebase-service");
const { md5 } = require("./../utils/auth.utils");
const db = require("./../db/db-connection");
// const { sendVerificationEmail } = require("./../utils/auth.utils");

class FirebaseController {
    createUser = async (req, res) => {
        const { nickName, email, password } = req.body;

        admin
            .auth()
            .createUser({
                displayName: nickName,
                email,
                password: md5(password),
                emailVerified: false,
                disabled: false,
            })
            .then(async (userRecord) => {
                console.log("Successfully created new user:", userRecord);

                const userIDHash = md5(userRecord.uid);

                const sql = `
                    INSERT INTO user_verification (hashID, uid)
                    VALUES (?, ?)
                `;

                await db.query(sql, [userIDHash, userRecord.uid]);

                const verificationLink = "https://api.testbericht.de/confirm_email/" + userIDHash;
                // sendVerificationEmail(useremail, verificationLink);
                return res.status(200).send(JSON.stringify(userRecord));
            })
            .catch((err) => {
                console.log("Error creating new user:", err.message);
                return res.status(400).send(err.message);
            });
    };
}

module.exports = new FirebaseController();
