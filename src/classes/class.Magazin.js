const { CDN_TESTER } = require("../constants/globals");
const db = require("../db/db-connection");
const { numberFormat } = require("../utils/functions.inc");
const Ausgabe = require("./class.Ausgabe");
const Kategorie = require("./class.Share.Kategorie");
const Produkt = require("./class.Share.Produkt");

class Magazin {
    identifier = "";
    typ = "";

    data = [];
    tests = [];
    testreihen = [];
    testsFilter = [];
    testreihenFilter = [];
    anzahl = [];

    breadcrumb = null;
    isLoad = false;

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ;
    }

    load = async () => {
        let where;
        let values = [this.identifier];
        let sql;
        let res;

        switch (this.typ) {
            case "url":
                where = " testerURL = ? ";
                break;

            case "id":
                where = " id = ? ";
                break;

            default:
                break;
        }

        if (!where) return false;

        sql = `
            SELECT
                id, testerName, testerURL, bildName, logoWidth, logoHeight, logoFormat, sprache, website, websiteImmerAnzeigen, qualitaet, vertrauensvolleQuelle, blockiert
            FROM
                tester
            WHERE
                ${where}
        `;

        res = await db.query(sql, values);

        if (!res.length) {
            return false;
        }

        let data = res[0];

        data["testerLogo"] = CDN_TESTER + "/" + data["testerURL"] + "." + data["logoFormat"];
        data["url"] = "/de/magazine/" + data["testerURL"] + ".html";

        sql = `
            SELECT
                t.TESTID id, t.ausgabeID,
                p.kategorieID
            FROM
                tests t
            LEFT JOIN
                pname2pid_mapping p ON(p.ID = t.produktID)
            WHERE
                t.testerID = ? AND
                NOT t.produktID IS NULL AND
                NOT t.ausgabeID IS NULL AND
                t.aktiv = 1 AND
                t.testreiheID IS NULL AND
                NOT p.id IS NULL
            ORDER BY
                t.TESTID DESC
        `;

        res = await db.query(sql, [data["id"]]);

        let anzahl = {
            t: {},
            r: {},
        };

        let testsListe = [];
        for (const row of res) {
            row["ausgabeID"] = parseInt(row["ausgabeID"]);
            row["kategorieID"] = parseInt(row["kategorieID"]);

            if (row["ausgabeID"]) {
                if (!anzahl["t"][row["ausgabeID"]]) {
                    anzahl["t"][row["ausgabeID"]] = {
                        [row["kategorieID"]]: 0,
                    };
                } else if (!anzahl["t"][row["ausgabeID"]][row["kategorieID"]]) {
                    anzahl["t"][row["ausgabeID"]][row["kategorieID"]] = 0;
                }
                anzahl["t"][row["ausgabeID"]][row["kategorieID"]]++;
            }

            if (!anzahl["t"][row["ausgabeID"]]) {
                anzahl["t"][row["ausgabeID"]] = {
                    0: 0,
                };
            } else if (!anzahl["t"][row["ausgabeID"]][0]) {
                anzahl["t"][row["ausgabeID"]][0] = 0;
            }

            anzahl["t"][row["ausgabeID"]][0]++;

            if (!anzahl["t"][0]) {
                anzahl["t"][0] = {
                    [row["kategorieID"]]: 0,
                };
            } else if (!anzahl["t"][0][row["kategorieID"]]) {
                anzahl["t"][0][row["kategorieID"]] = 0;
            }

            anzahl["t"][0][row["kategorieID"]]++;

            if (!anzahl["t"][0][0]) anzahl["t"][0][0] = 0;

            anzahl["t"][0][0]++;

            testsListe.push({
                id: row["id"],
                ausgabeID: row["ausgabeID"],
                kategorieID: row["kategorieID"],
            });
        }

        sql = `
            SELECT
                tr.id, tr.ausgabeID,
                p.kategorieID
            FROM
                tester_testreihen tr
            LEFT JOIN
                tests t ON(t.testreiheID = tr.id)
            LEFT JOIN
                pname2pid_mapping p ON(p.id = t.produktID)
            WHERE
                tr.testerID = ? AND
                tr.aktiv = 1 AND
                t.aktiv = 1
            GROUP BY
                tr.id
            ORDER BY
                tr.id DESC
        `;

        res = await db.query(sql, [data["id"]]);

        let testreihenListe = [];
        for (const row of res) {
            if (row["ausgabeID"]) {
                if (!anzahl["r"][row["ausgabeID"]]) {
                    anzahl["r"][row["ausgabeID"]] = {
                        [row["kategorieID"]]: 0,
                    };
                } else if (!anzahl["r"][row["ausgabeID"]][row["kategorieID"]]) {
                    anzahl["r"][row["ausgabeID"]][row["kategorieID"]] = 0;
                }

                anzahl["r"][row["ausgabeID"]][row["kategorieID"]]++;
            }

            if (!anzahl["r"][row["ausgabeID"]]) {
                anzahl["r"][row["ausgabeID"]] = { 0: 0 };
            } else if (!anzahl["r"][row["ausgabeID"]][0]) {
                anzahl["r"][row["ausgabeID"]][0] = 0;
            }

            anzahl["r"][row["ausgabeID"]][0]++;

            if (!anzahl["r"][0]) {
                anzahl["r"][0] = {
                    [row["kategorieID"]]: 0,
                };
            } else if (!anzahl["r"][0][row["kategorieID"]]) {
                anzahl["r"][0][row["kategorieID"]] = 0;
            }

            anzahl["r"][0][row["kategorieID"]]++;

            if (!anzahl["r"][0][0]) anzahl["r"][0][0] = 0;

            anzahl["r"][0][0]++;

            testreihenListe.push({
                id: row["id"],
                ausgabeID: row["ausgabeID"],
                kategorieID: row["kategorieID"],
            });
        }

        this.tests = testsListe;
        this.testreihen = testreihenListe;
        this.anzahl = anzahl;

        this.data = data;

        this.isLoad = true;
    };

    getFilter = async (ausgabeID = null, kategorieID = 0) => {
        ausgabeID = parseInt(ausgabeID);
        kategorieID = parseInt(kategorieID);

        let filterArray = {};
        let url = "/de/magazine/" + this.data.testerURL;
        let restURL = "";

        if (ausgabeID) {
            const ausgabe = await Ausgabe.getByID(ausgabeID);
            url += "-A" + ausgabe.data.ausgabeURL;
            restURL = "";
        }
        if (kategorieID) {
            const kategorie = await Kategorie.getByID(kategorieID);
            restURL = "-K" + kategorie.data.kategorieURL;
        }

        if (!ausgabeID) {
            filterArray["a"] = {
                name: "Ausgaben",
                oberFilter: 0,
                pos: 0,
                arrow: "tf-arr-t",
                filter: {},
            };
        }
        if (!kategorieID) {
            filterArray["k"] = {
                name: "Kategorien",
                oberFilter: 0,
                pos: 0,
                arrow: "tf-arr-t",
                filter: {},
            };
        }

        if (!ausgabeID) {
            let keys = [];

            for (const [aID, kats] of Object.entries(this.anzahl["t"])) {
                if (kats[kategorieID]) keys.push(aID);
            }

            for (const [aID, kats] of Object.entries(this.anzahl["r"])) {
                if (kats[kategorieID]) keys.push(aID);
            }

            keys = keys.filter((value, index, self) => {
                return self.indexOf(value) === index;
            });

            keys.sort();
            let k = 0;

            await Promise.all(
                keys.map(async (aID) => {
                    if (aID) {
                        k++;
                        const ausgabe = await Ausgabe.getByID(aID);

                        const fURL = url + "-A" + ausgabe.data.ausgabeURL + restURL;

                        let anzahl = this.anzahl["t"][aID] && this.anzahl["t"][aID][kategorieID] ? parseInt(this.anzahl["t"][aID][kategorieID]) : 0;
                        anzahl += " / ";
                        anzahl += this.anzahl["r"][aID] && this.anzahl["r"][aID][kategorieID] ? parseInt(this.anzahl["r"][aID][kategorieID]) : 0;

                        filterArray["a"]["filter"][ausgabe.data.id] = {
                            url: ausgabe.data.ausgabeURL,
                            name: ausgabe.data.ausgabe,
                            anzahl: anzahl,
                            noIndex: false,
                        };
                    }
                })
            );
        }

        if (!kategorieID) {
            let keys = [
                ...Object.keys(this.anzahl["t"][ausgabeID] ? this.anzahl["t"][ausgabeID] : {}),
                ...Object.keys(this.anzahl["r"][ausgabeID] ? this.anzahl["r"][ausgabeID] : {}),
            ].filter((value, index, self) => {
                return self.indexOf(value) === index;
            });

            let k = 0;
            await Promise.all(
                keys.map(async (katID) => {
                    if (katID) {
                        k++;
                        const kategorie = await Kategorie.getByID(katID);
                        if (kategorie.data) {
                            const fURL = url + "-K" + kategorie.data.kategorieURL + restURL;

                            let anzahl = this.anzahl["t"][ausgabeID] && this.anzahl["t"][ausgabeID][katID] ? parseInt(this.anzahl["t"][ausgabeID][katID]) : 0;
                            anzahl += " / ";
                            anzahl += this.anzahl["r"][ausgabeID] && this.anzahl["r"][ausgabeID][katID] ? parseInt(this.anzahl["r"][ausgabeID][katID]) : 0;

                            if (!filterArray["a"]) filterArray["a"] = {};
                            if (!filterArray["a"]["filter"]) filterArray["a"]["filter"] = {};
                            filterArray["k"]["filter"][kategorie.data.id] = {
                                url: kategorie.data.kategorieURL,
                                name: kategorie.data.kategorieName,
                                anzahl: anzahl,
                                noIndex: false,
                            };
                        }
                    }
                })
            );
        }

        return {
            filter: filterArray,
        };
    };

    getTests = (start, length, ausgabeID = null, kategorieID = null) => {
        const itemsList = this.getTestsList(start, length, ausgabeID, kategorieID);

        if (!itemsList.length) {
            return [];
        }

        return this.getTestsContent(itemsList);
    };

    getTestsContent = async (itemsList) => {
        let pL = [];
        itemsList.forEach((val) => {
            pL.push(val["id"]);
        });

        const sql = `
            SELECT
                t.TESTID id, t.produktID, t.NOTE, t.TBNOTE, t.AUSZEICHNUNGEN, t.PRO, t.CONTRA, t.DETAILS, t.FAZIT, t.teaser, t.originalFazit, t.URL, t.ausgabeID, t.PLATZIERUNG,
                p.kategorieID,
                pb.pfad bildPfad, pb.breite, pb.hoehe
            FROM
                tests t
            LEFT JOIN
                pname2pid_mapping p ON(p.ID = t.produktID)
            LEFT JOIN
                produktbilder pb ON(pb.produktID = t.produktID AND pb.pos = 1 AND pb.groesse = 'L')
            WHERE
                t.TESTID IN(?) AND
                NOT t.produktID IS NULL AND
                NOT t.ausgabeID IS NULL AND
                t.aktiv = 1 AND
                t.testreiheID IS NULL AND
                NOT p.id IS NULL
            ORDER BY
                t.TESTID DESC
        `;

        const res = await db.query(sql, [pL]);

        let items = [];
        await Promise.all(
            res.map(async (row) => {
                const prd = await Produkt.getByID(row["produktID"]);

                if (prd.isLoad) {
                    items.push({
                        id: row["id"],
                        produktName: prd.data.produktName,
                        bildLink: prd.data.bilder[1] ? prd.data.bilder[1]["E"]["url"] : "",
                        note: row["NOTE"],
                        noteTB: row["TBNOTE"],
                        auszeichnung: row["AUSZEICHNUNGEN"],
                        fazit: row["FAZIT"],
                        teaser: row["teaser"],
                        originalFazit: row["originalFazit"],
                        pros: row["PRO"] ? row["PRO"].split(" // ") : [],
                        contras: row["CONTRA"] ? row["CONTRA"].split(" // ") : [],
                        details: row["DETAILS"] ? row["DETAILS"].split(" // ") : [],
                        produktURL: "/produkte/" + prd.data.produktURL,
                        angebote: prd.data.anzAngebote,
                        preis: prd.data.preis ? numberFormat(prd.data.preis, 2) : "",
                        platz: row["PLATZIERUNG"],
                        score: prd.data.SCORE,
                        breite: prd.data.bilder[1] ? prd.data.bilder[1]["L"]["breite"] : "",
                        hoehe: prd.data.bilder[1] ? prd.data.bilder[1]["L"]["hoehe"] : "",
                        noIndex: prd.data.noIndex || prd.data.noIndex2,
                    });
                }
            })
        );

        items.sort((a, b) => {
            if (!a || !b) return 0;

            if (a["id"] > b["id"]) {
                return -1;
            }

            if (a["id"] < b["id"]) {
                return 1;
            }

            return 0;
        });

        return items;
    };

    getTestsList = (start, length, ausgabeID = null, kategorieID = null) => {
        if (length < 1) {
            return [];
        }

        if (this.countTests(ausgabeID, kategorieID) <= start) {
            return [];
        }

        if (!ausgabeID && !kategorieID) {
            if (this.countTests() <= start + length) {
                return this.tests.slice(start, start + length);
            }

            return this.tests.slice(start, start + length);
        }

        const tests = this.getTestsFilter(ausgabeID, kategorieID);
        if (tests.length <= start + length) {
            return tests.slice(start);
        }

        return tests.slice(start, start + length);
    };

    getTestsFilter = (ausgabeID = null, kategorieID = null) => {
        ausgabeID = parseInt(ausgabeID);
        kategorieID = parseInt(kategorieID);

        if (this.testsFilter[ausgabeID] && this.testsFilter[ausgabeID][kategorieID]) {
            return this.testsFilter[ausgabeID][kategorieID];
        }

        let tests = [];
        this.tests.forEach((row) => {
            if ((!ausgabeID || row["ausgabeID"] == ausgabeID) && (!kategorieID || row["kategorieID"] == kategorieID)) {
                tests.push(row);
            }
        });

        return tests;
    };

    getTestreihen = (start, length, ausgabeID = null, kategorieID = null) => {
        const itemsList = this.getTestreihenList(start, length, ausgabeID, kategorieID);

        if (!itemsList.length) {
            return [];
        }

        return this.getTestreihenContent(itemsList);
    };

    getTestreihenList = (start, length, ausgabeID = null, kategorieID = null) => {
        if (length < 1) {
            return [];
        }

        if (this.countTestreihen(ausgabeID, kategorieID) <= start) {
            return [];
        }

        if (!ausgabeID && !kategorieID) {
            return this.testreihen.slice(start, start + length);
        }

        const tests = this.getTestreihenFilter(ausgabeID, kategorieID);
        if (tests.length <= start + length) {
            return tests.slice(start);
        }

        return tests.slice(start, start + length);
    };

    getTestreihenContent = async (itemsList) => {
        let pL = [];
        itemsList.forEach((val) => {
            pL.push(val["id"]);
        });

        const sql = `
            SELECT
                tr.id, tr.testreihe, tr.ueberschrift, tr.eigeneBeschreibung, tr.beschreibung, tr.ausgabeID, tr.ausgabe, tr.testerID, tr.noIndex,
                tt.testerName, tt.testerURL,
                p.kategorieID,
                COUNT(t.TESTID) anzTests
            FROM
                tester_testreihen tr
            LEFT JOIN
                tests t ON(t.testreiheID = tr.id)
            LEFT JOIN
                tester tt ON(tt.id = tr.testerID)
            LEFT JOIN
                pname2pid_mapping p ON(p.id = t.produktID)
            WHERE
                tr.id IN(?) AND
                tr.aktiv = 1 AND
                t.aktiv = 1
            GROUP BY
                tr.id
            ORDER BY
                tr.id DESC
        `;

        const res = await db.query(sql, [pL]);

        let items = [];
        for (const p of pL) {
            for (const row of res) {
                if (p === row["id"]) {
                    items.push({
                        id: row["id"],
                        testreihe: row["testreihe"],
                        ueberschrift: row["ueberschrift"],
                        eigeneBeschreibung: row["eigeneBeschreibung"],
                        beschreibung: row["beschreibung"],
                        ausgabeID: row["ausgabeID"],
                        ausgabe: row["ausgabe"],
                        testerID: row["testerID"],
                        testerName: row["testerName"],
                        testerURL: row["testerURL"],
                        kategorieID: row["kategorieID"],
                        anzahlTests: row["anzTests"],
                        noIndex: row["noIndex"] == 1,
                    });
                }
            }
        }

        return items;
    };

    getTestreihenFilter = (ausgabeID = null, kategorieID = null) => {
        ausgabeID = parseInt(ausgabeID);
        kategorieID = parseInt(kategorieID);

        if (this.testreihenFilter[ausgabeID] && this.testreihenFilter[ausgabeID][kategorieID]) {
            return this.testreihenFilter[ausgabeID][kategorieID];
        }

        let tests = [];
        this.testreihen.forEach((row) => {
            if ((!ausgabeID || row["ausgabeID"] == ausgabeID) && (!kategorieID || row["kategorieID"] == kategorieID)) {
                tests.push(row);
            }
        });

        return tests;
    };

    countTests = (ausgabeID = null, kategorieID = null) => {
        ausgabeID = parseInt(ausgabeID);
        kategorieID = parseInt(kategorieID);

        if (!this.anzahl["t"][ausgabeID] || (this.anzahl["t"][ausgabeID] && !this.anzahl["t"][ausgabeID][kategorieID])) {
            return 0;
        }

        return this.anzahl["t"][ausgabeID][kategorieID];
    };

    countTestreihen = (ausgabeID = null, kategorieID = null) => {
        ausgabeID = parseInt(ausgabeID);
        kategorieID = parseInt(kategorieID);

        if (!this.anzahl["r"][ausgabeID] && this.anzahl["r"][ausgabeID] && !this.anzahl["r"][ausgabeID][kategorieID]) {
            return 0;
        }

        return this.anzahl["r"][ausgabeID][kategorieID];
    };

    static getByURL = async (url) => {
        const obj = new Magazin(url, "url");

        await obj.load();

        return obj;
    };
}

module.exports = Magazin;
