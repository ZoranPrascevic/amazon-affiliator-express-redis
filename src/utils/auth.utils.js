const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("./../db/db-connection");
const admin = require("./../service/firebase-service");

exports.md5 = (string) => {
    return crypto.createHash("md5").update(string).digest("hex");
};

exports.sendVerificationEmail = (email, link) => {
    const smtpConfig = {
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // use SSL
        auth: {
            user: "from@email.com",
            pass: "pass",
        },
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const mailOptions = {
        from: "app@email.com", // sender address
        to: email, // list of receivers
        subject: "Email verification", // Subject line
        text: "Email verification, press here to verify your email: " + link,
        html: "<b>Hello there,<br> click <a href=" + link + "> here to verify</a></b>", // html body
    };

    transporter.sendMail(mailOptions, function (err, res) {
        if (err) {
            console.log(err);
        } else {
            console.log("Message sent: " + res.message);
        }
    });
};

exports.verifyEmail = (req, res) => {
    const hash = req.params.hash;

    const sql = `
        SELECT * FROM user_verification
        WHERE hashID = ?
    `;

    db.query(sql, [hash])
        .then((rows) => {
            if (!rows.length) return res.send("No such Hash!");
            else {
                console.log(rows[0]['uid']);
                admin
                    .auth()
                    .updateUser(rows[0]["uid"], {
                        emailVerified: true,
                    })
                    .then(async (userRecord) => {
                        console.log("Successfully updated user", userRecord.toJSON());

                        const sql = `
                            DELETE FROM user_verification WHERE hashID=?;
                        `;

                        await db.query(sql, [hash]);

                        return res.status(200).send('Successfully Verified!');
                    })
                    .catch(function (error) {
                        console.log("Error updating user:", error);
                        return res.status(500);
                    });
            }
        })
        .catch((err) => {
            return res.status(500).send(err.message);
        });
};
