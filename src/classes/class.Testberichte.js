const Produkt = require("./class.Share.Produkt");
const db = require("../db/db-connection");
const { MODUL_KEYWORDS, MODUL_TESTS_KEYWORDS } = require("../module");
const { ANZAHL_PRODUKT_TESTS } = require("../constants/globals");

class Testberichte {
    produktID = "";
    type = "";
    data = [];
    notenListe = [];
    videoIDs = [];
    score = 0;
    anzTestreihen = 0;
    isLoad = false;
    produkt = null;

    static sitemap = [];

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = async () => {
        let sql;
        let res;
        let where;
        let values = [];
        if (this.type == "serie") {
            sql = `
                SELECT
                    GROUP_CONCAT(pid SEPARATOR ',') pidList
                FROM
                    produkte2serien
                WHERE
                    serienID = ?
            `;

            res = await db.query(sql, [this.produktID]);

            if (!res.length) return false;

            const row = res[0];

            if (!row["pidList"]) {
                return false;
            }

            where = ` AND t.produktID IN(?) `;
            values.push(row["pidList"].split(","));
        } else {
            where = ` AND t.produktID = ? `;
            values.push(this.produktID);
        }

        sql = `
            SELECT 
                t.TESTID id, t.TESTID, t.produktID, t.testerID, t.TESTER, t.NOTE, t.TBNOTE, t.DATUM, t.ausgabeID, t.AUSGABE, t.testreiheID, t.DETAILS, t.teaser, t.FAZIT, t.originalFazit,
                t.TBCOM, t.PRO, t.CONTRA, t.URL, t.videoID, t.AUSZEICHNUNGEN, t.PLATZIERUNG, t.VONGESAMT, t.insertDate,
                tt.testerName, tt.testerURL, tt.logoFormat, CONCAT(tt.testerURL, '.', tt.logoFormat) logoURL, tt.logoWidth, tt.logoHeight, tt.sprache, tt.website, tt.websiteImmerAnzeigen,
                IFNULL(t.TBNOTE, 101) sortNoteA, IFNULL(t.TBNOTE, -1) sortNoteD,
                tr.aktiv isTestreiheAktiv, tr.ohnePlatzierung, tr.noIndex,
                ta.ausgabe ausgabeName, ta.kaufURL, ta.preis
            FROM
                tests t
            LEFT JOIN
                tester tt ON(tt.id = t.testerID)
            LEFT JOIN
                tester_testreihen tr ON(tr.id = t.testreiheID)
            LEFT JOIN
                tester_ausgaben ta ON(ta.id = t.ausgabeID)
            WHERE 
                t.aktiv = 1
                ${where}
        `;

        res = await db.query(sql, values);

        let notenListe = Array(6);
        notenListe.fill(0);

        if (!res.length) {
            this.notenListe = notenListe;
            return false;
        }

        let tests = [];
        let videoIDs = [];
        let gesamtNote = 0;
        let anzNoten = 0;

        await Promise.all(
            res.map(async (row) => {
                this.produkt = await Produkt.getByID(row["produktID"]);

                row["id"] = parseInt(row["id"]);
                row["ohnePlatzierung"] = Boolean(row["ohnePlatzierung"]);
                row["ausgabeURL"] =
                    "/de/magazine/" +
                    row["testerURL"] +
                    "-A" +
                    row["AUSGABE"].replace("/", "-").replace(".", "").replace(" ", "-").replace(":", "") +
                    "-" +
                    row["ausgabeID"] +
                    ".html";
                row["testreiheURL"] = "/de/vergleich/" + row["testerURL"] + "-" + row["testreiheID"] + ".html";
                row["testLesenURL"] = row["URL"] ? "/de/test-lesen/" + row["TESTID"] * 2 + "/" + this.produkt.data.produktURL + ".html" : "";
                row["insertDate"] = new Date(row["insertDate"]).toLocaleString("en-US", { timeZone: "Europe/Berlin" });

                if (row["testreiheID"]) {
                    this.anzTestreihen++;
                }

                let circleColor = "";
                if (!row["TBNOTE"]) {
                    circleColor = "grey";
                } else if (row["TBNOTE"] < 40) {
                    circleColor = "red";
                } else if (row["TBNOTE"] < 60) {
                    circleColor = "yellow";
                } else if (row["TBNOTE"] < 75) {
                    circleColor = "limegreen";
                } else {
                    circleColor = "green";
                }

                row["circleColor"] = circleColor;

                row["vorteile"] = row["PRO"] ? row["PRO"].split(" // ") : [];
                row["nachteile"] = row["CONTRA"] ? row["CONTRA"].split(" // ") : [];
                row["details"] = row["DETAILS"] ? row["DETAILS"].split(" // ") : [];

                tests.push(row);

                const note = this.getNoteZahl(row["TBNOTE"]);

                notenListe[note]++;

                if (row["TBNOTE"]) {
                    gesamtNote += row["TBNOTE"];
                    anzNoten++;
                }

                if (row["videoID"]) {
                    videoIDs.push(row["videoID"]);
                }
            })
        );

        this.data = tests;
        this.notenListe = notenListe;
        this.videoIDs = videoIDs;
        this.score = anzNoten ? Math.round(gesamtNote / anzNoten) : 0;

        // await this.setKeywords();

        this.isLoad = true;
    };

    setKeywords = async () => {
        if (MODUL_KEYWORDS) {
            if (this.produkt === null) this.produkt = await Produkt.getByID(this.produktID);

            if (!this.produkt || !this.produkt.getIsLoad) {
                return null;
            }

            const sql = `
                SELECT
                    keyword, ziel
                FROM
                    tbde_keywords
                WHERE
                    keywordGroup = 1 AND
                    katID IN(0, ?)
            `;

            const res = await db.query(sql, [this.produkt.data.kategorieID]);

            let testKeywords = {};

            res.forEach((row) => {
                testKeywords[row["keyword"]] = row["ziel"];
            });

            let anzKW = 0;
            let anzTests = this.data.length;
            if (anzTests <= 3) {
                var maxKW = anzTests;
            } else if (anzTests >= ANZAHL_PRODUKT_TESTS) {
                var maxKW = ANZAHL_PRODUKT_TESTS - 3;
            } else {
                var maxKW = anzTests - 1;
            }

            var tests = this.data;
            const kw = Object.keys(tests);
            if (!MODUL_TESTS_KEYWORDS) {
                tests = tests.reverse();
            }

            testsLoop: for (let i = 0; i < tests.length; i++) {
                if (tests[i]["FAZIT"]) {
                    for (let j = 0; j < kw.length; j++) {
                        let m = tests[i]["FAZIT"].match(`/(\s{1}(${kw[j]})\s{1})/i`);
                        if (m) {
                            tests[i]["FAZIT"] = tests[i]["FAZIT"].replace(
                                "|" + m[0] + "|",
                                m[0].substring(0, 1) +
                                    '<a href="' +
                                    testKeywords[kw[j]] +
                                    '" title="' +
                                    m[2] +
                                    '" class="link">' +
                                    m[2] +
                                    "</a>" +
                                    m[0].substr(m[0].length - 1)
                            );
                            anzKW++;

                            if (anzKW >= maxKW) {
                                break testsLoop;
                            }

                            const searchKey = testKeywords[kw[j]];
                            delete kw[j];
                            delete testKeywords[kw[j]];

                            while (testKeywords.indexOf(searchKey) > -1) {
                                delete testKeywords[testKeywords.indexOf(searchKey)];

                                const intKey = kw.indexOf(searchKey);
                                if (intKey > -1) delete kw[intKey];
                            }

                            break;
                        }
                    }
                }

                delete tests[i];
            }
        }

        if (!MODUL_TESTS_KEYWORDS) {
            var tests = array_reverse(tests);
        }

        this.data = tests;
    };

    countTests = () => {
        return this.data.length;
    };

    countTestreihen = () => {
        return this.anzTestreihen;
    };

    getNoteZahl = (score) => {
        score = parseInt(score);

        if (score >= 90) {
            return 1;
        }
        if (score >= 75) {
            return 2;
        }
        if (score >= 60) {
            return 3;
        }
        if (score >= 40) {
            return 4;
        }
        if (score >= 1) {
            return 5;
        }

        return 0;
    };

    getNotenliste = () => {
        return this.notenListe;
    };

    getScore = () => {
        return this.score;
    };

    getVideos = () => {
        return this.data.videoIDs;
    };

    orderByNoteDESC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            return b["sortNoteD"] - a["sortNoteD"];
        });
    };

    orderByNeueDESC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            return b["TESTID"] - a["TESTID"];
        });
    };

    getTests = (start = null, length = null) => {
        if (start === null) {
            return this.data;
        }

        if (length !== null && length < 1) {
            return [];
        }

        if (length && start + length <= this.countTests()) {
            return this.data.slice(start, start + length);
        }

        return this.data.slice(start);
    };

    getTestnoteText = () => {
        if (this.score >= 90) {
            return "sehr gut";
        }
        if (this.score >= 75) {
            return "gut";
        }
        if (this.score >= 60) {
            return "befriedigend";
        }
        if (this.score >= 40) {
            return "ausreichend";
        }
        if (this.score >= 1) {
            return "mangelhaft";
        }
        if (this.countTests()) {
            return "keine Note";
        }

        return "keine Tests";
    };

    static getByID = async (id) => {
        const obj = new Testberichte(id);

        await obj.load();

        return obj;
    };
}

module.exports = Testberichte;
