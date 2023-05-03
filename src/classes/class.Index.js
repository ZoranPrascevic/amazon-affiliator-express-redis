const Kategorie = require("./class.Kategorie");
const { CDN_TESTER, CDN_SLIDER } = require("./../constants/globals");
const db = require("./../db/db-connection");

const dotenv = require("dotenv");
dotenv.config();

class Index {
    static cache = null;
    topProdukte = null;
    topSlider = null;
    testreihen = {};

    isLoad = false;

    constructor() {
        this.load();
    }

    load = () => {
        this.isLoad = true;
    };

    getTopProdukte = async () => {
        if (this.topProdukte === null) {
            const sql = `
                SELECT
                    id
                FROM
                    kategorien
                WHERE
                    showTopprodukteStartseite = 1
            `;

            const res = await db.query(sql);

            let produkte = [];

            await Promise.all(
                res.slice(0, 6).map(async (row) => {
                    const kategorie = await Kategorie.getByID(row["id"]);

                    const kategorieProducts = await kategorie.getTopProducts();
                    console.log("TOPPRODUCTS", "kategorie")
                    for (let row2 of kategorieProducts) {
                        produkte.push({
                            pid: row2["ID"],
                            // pname: row2["PNAME"].substring(0, 85) + (row2["PNAME"].substring(0, 85) != row2["PNAME"] ? "..." : ""),
                            title: row2["PNAME"],
                            purl: "/produkte/" + row2["PURL"],
                            img: row2["imgL"],
                            // imgBreite: row2["imgBreiteL"],
                            tests: row2["TESTS"],
                            score: row2["SCORE"],
                            meinungen: row2["anzMeinungen"],
                            meinungenscore: row2["MEINUNGENSCORE"],
                            meinungenStars: row2["meinungenStars"],
                            angebote: row2["anzAngebote"],
                            preis: row2["preis"],
                            punkte: row2["punkte"],
                        });
                    }
                })
            );

            this.topProdukte = produkte;
        }

        return this.topProdukte;
    };

    getTestreihen = async (anzahl = 12) => {
        anzahl = parseInt(anzahl);

        if (!anzahl) {
            return false;
        }

        if (!this.testreihen[anzahl]) {
            const suche = ["/", ".", " ", ":"];
            const ersetze = ["-", "", "-", ""];

            let sql = `
                SELECT
                    MAX(id) trID
                FROM
                    tester_testreihen
                WHERE
                    aktiv = 1
                GROUP BY
                    testerID
                ORDER BY
                    trID DESC
                LIMIT
                    0, ?
            `;

            let res = await db.query(sql, [anzahl]);

            let trIDs = [];

            res.map((row) => {
                trIDs.push(row["trID"]);
            });

            sql = `
                SELECT
                    tr.id, tr.ueberschrift, tr.beschreibung, tr.eigeneBeschreibung, tr.ausgabe,
                    tt.testerName, tt.testerURL, tt.logoFormat, tt.logoWidth, tt.logoHeight,
                    COUNT(t.TESTID) anzTests
                FROM
                    tester_testreihen tr
                LEFT JOIN
                    tester tt ON(tt.id = tr.testerID)
                LEFT JOIN
                    tests t ON(t.testreiheID = tr.id)
                WHERE
                    tr.id IN(?)
                GROUP BY
                    tr.id, tr.ueberschrift, tr.beschreibung, tr.eigeneBeschreibung, tr.ausgabe
                ORDER BY
                    tr.id DESC
            `;

            res = await db.query(sql, [trIDs]);

            let testreihen = [];

            res.map((row) => {
                let beschreibung
                if (row["eigeneBeschreibung"]) {
                    beschreibung = row["eigeneBeschreibung"];
                } else {
                    beschreibung = row["beschreibung"];
                }

                testreihen.push({
                    testerName: row["testerName"],
                    ueberschrift: row["ueberschrift"],
                    ausgabe: row["ausgabe"],
                    beschreibung: beschreibung,
                    testreiheLink: row["testerURL"] + "-" + row["id"],
                    testerLogoLink: CDN_TESTER + "/" + row["testerURL"] + "." + row["logoFormat"],
                    // logoWidth: row["logoWidth"],
                    // logoHeight: row["logoHeight"],
                    // hasTesterLogo: row["logoFormat"] != "",
                });
            });

            this.testreihen[anzahl] = testreihen;
        }
        return this.testreihen[anzahl];
    };

    getTopSlider = async () => {
        if (this.topSlider === null) {
            const sql = `
                SELECT
                    id, ueberschrift, teaser, kategorieID, fileExtension
                FROM
                    startseite_slider
                WHERE
                    aktiv = 1 AND
                    NOW() BETWEEN startDatum AND endDatum
                ORDER BY
                    pos ASC
            `;

            const res = await db.query(sql);

            let slider = [];
            await Promise.all(
                res.map(async (row) => {
                    const kat = await Kategorie.getByID(row["kategorieID"]);
                    slider.push({
                        title: row["ueberschrift"],
                        descr: row["teaser"],
                        img: `${row["id"]}`,
                        cat: `/${kat.data.kategorieURL}/`,
                    });
                })
            );

            this.topSlider = slider;
        }

        return this.topSlider;
    };

    static getInstance = () => {
        const obj = new Index();
        return obj;
    };
}

module.exports = Index;
