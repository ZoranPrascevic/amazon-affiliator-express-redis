const db = require("./../../db/db-connection");
const HttpException = require("./../../utils/HttpException.utils");

class SearchPanel {
    fetch = (req) => {
        return new Promise(async (resolve, reject) => {
            if (req.query.productID) {
                const productID = parseInt(req.query.productID);

                let sql = `
                    SELECT
                        MIN(so.preis) AS min_price, MAX(so.preis) AS max_price, pm.energieEffizienzKlasse AS eek,
                        pm.SCORE AS score, pm.TESTS AS tests, COUNT(so.preis) AS offers_count, 
                        CASE
                            WHEN pm.SCORE >= 90 THEN 'sehr gu'
                            WHEN pm.SCORE >= 75 THEN 'gut'
                            WHEN pm.SCORE >= 60 THEN 'befried'
                            WHEN pm.SCORE >= 40 THEN 'ausreich'
                            WHEN pm.SCORE >= 1 THEN 'mangelhaft'
                            WHEN COUNT(t.produktID)>= 0 THEN 'keine Note'
                            ELSE 'keine Tests'
                        END AS testNoteText, pm.TESTPRO as up, pm.TESTCONTRA as down
                    FROM shops_offers AS so
                    LEFT JOIN pname2pid_mapping AS pm ON so.produktID = pm.id
                    LEFT JOIN tests AS t ON t.produktID = pm.id
                    WHERE so.produktID = ?
                `;

                let res = await db.query(sql, [productID]);

                sql = `
                    SELECT IF(review, FORMAT(stars/review, 1), 0) AS mark
                    FROM (
                        SELECT rt.*,
                            (SELECT * FROM (
                                SELECT SUM(stars) AS stars
                                FROM(
                                    SELECT stars
                                    FROM (
                                        SELECT SUM(meinungstern) stars
                                        FROM tbmeinungen
                                        WHERE  meinungstatus = 0 AND produktID = ?) AS tb_stars
                                        UNION ALL
                                        SELECT stars
                                        FROM (
                                            SELECT SUM(stars) AS stars
                                            FROM (
                                                SELECT SUM(IFNULL(star, 0) * IFNULL(anzahl, 0)) AS stars
                                                FROM  meinungen_amazon_stars
                                                WHERE  produktID = ?
                                                UNION ALL
                                                SELECT SUM(IFNULL(star, 0) * IFNULL(anzahl, 0)) AS stars
                                                FROM meinungen_otto_stars
                                                WHERE produktID = ?
                                                ) AS amazon_otto
                                        ) AS amazon_otto
                                    ) AS stars_table
                                ) AS rs
                            ) AS stars
                            FROM (
                                SELECT SUM(review) AS review
                                FROM (
                                    SELECT review
                                    FROM (
                                        SELECT
                                            COUNT(id) AS review
                                        FROM
                                            tbmeinungen
                                        WHERE
                                            meinungstatus = 0
                                            AND produktID = ?
                                        ) AS tb_review
                                    UNION ALL
                                    SELECT review
                                    FROM (
                                        SELECT IFNULL(SUM(anzahl), 0) AS review
                                        FROM
                                            meinungen_amazon_stars
                                        WHERE
                                            produktID = ?
                                        UNION ALL
                                        SELECT IFNULL(SUM(anzahl), 0) AS review
                                        FROM
                                            meinungen_otto_stars
                                        WHERE
                                            produktID = ?
                                        ) AS amazon_otto_review
                                    ) AS review_table
                            ) AS rt
                        ) AS tt;
                `;

                let res2 = await db.query(sql, Array(6).fill(productID));

                sql = `
                    SELECT
                        s.shopName, CONCAT(so.shopID, ".png") AS shopLogo, so.preis, so.versandkosten, sd.shopURL shopAddressURL, so.verfuegbarkeit
                    FROM
                        shops_offers AS so
                    LEFT JOIN
                        shops AS s ON so.shopID = s.id
                    LEFT JOIN
                        shops_details sd ON(sd.shopID = s.id)
                    WHERE so.produktID = ?
                `;

                let res3 = await db.query(sql, [productID]);

                let popular_items = [];
                for (const row of res3) {
                    popular_items.push({
                        shopName: row["shopName"],
                        shopLogo: row["shopLogo"],
                        price: row["preis"],
                        shipping: row["versandkosten"],
                        shopAddress: row["shopAddressURL"],
                        availability: row["verfuegbarkeit"],
                    });
                }

                console.log(res);

                const data = {
                    min_price: res[0] && res[0]["min_price"],
                    max_price: res[0] && res[0]["max_price"],
                    eek: res[0] && res[0]["eek"],
                    score: res[0] && res[0]["score"],
                    tests: res[0] && res[0]["tests"],
                    offers_count: res[0] && res[0]["offers_count"],
                    testNoteText: res[0] && res[0]["testNoteText"],
                    mark: res2[0] && res2[0]["mark"],
                    popularOffers: popular_items,
                    up: res[0] && res[0]["up"] && res[0]["up"].split(" // "),
                    down: res[0] && res[0]["down"] && res[0]["down"].split(" // ")
                };

                resolve(data);
            } else {
                const err = new HttpException(400, "Require productID!");
                reject(err);
            }
        });
    };
}

module.exports = new SearchPanel();
