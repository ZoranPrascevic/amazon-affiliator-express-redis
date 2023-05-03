const db = require("../db/db-connection");
const { numberFormat } = require("../utils/functions.inc");
const Produkt = require("../classes/class.Produkt");

class Testreihe {
    identifier = "";

    data = [];
    breadcrumb = null;
    isLoad = false;

    constructor(identifier) {
        this.identifier = identifier;
    }

    laod = async () => {
        let sql = `
            SELECT
                ttr.id, ttr.ueberschrift, ttr.beschreibung, ttr.eigeneBeschreibung, ttr.testerID, ttr.ausgabeID, ttr.noIndex, ttr.ohnePlatzierung,
                t.testerURL, t.testerName, t.logoFormat,
                ta.ausgabe
            FROM
                tester_testreihen ttr
            LEFT JOIN
                tester_ausgaben ta ON(ta.id = ttr.ausgabeID)
            LEFT JOIN
                tester t ON(t.id = ttr.testerID)
            WHERE
                ttr.id = ? AND
                ttr.aktiv = 1
        `;

        let res = await db.query(sql, [this.identifier]);

        if (!res.length) {
            return false;
        }

        let data = res[0];

        data["url"] = "/de/vergleich/" + data["testerURL"] + "-" + data["id"];

        if (data["ohnePlatzierung"]) {
            var orderBy = "p.PNAME ASC";
        } else {
            var orderBy = "t.PLATZIERUNG ASC";
        }

        sql = `
            SELECT
            t.produktID, t.TESTER, t.NOTE, t.TBNOTE, t.TBNOTE, t.AUSGABE, t.DETAILS, t.FAZIT, t.PRO, t.CONTRA, t.AUSZEICHNUNGEN, t.PLATZIERUNG, t.VONGESAMT, t.URL, t.teaser, t.originalFazit
            FROM
            tests t
            LEFT JOIN
            pname2pid_mapping p ON(p.id = t.produktID)
            WHERE
            t.testreiheID =? AND
            t.aktiv = 1
            ORDER BY
            ?
        `;

        res = await db.query(sql, [this.identifier, orderBy]);

        if (!res.length) {
            return false;
        }

        let katIDs = [];
        let testsData = [];
        await Promise.all(
            res.map(async (row) => {
                const prd = await Produkt.getByID(row["produktID"]);

                if (prd.data.isLoad) {
                    const kategorie = prd.getKategorie();

                    if (kategorie.data.id && !katIDs.includes(kategorie.data.id)) {
                        katIDs.push(kategorie.data.id);
                    }

                    testsData.push({
                        id: prd.data.id,
                        produktName: prd.data.produktName,
                        kategorieName: kategorie.data.kategorieName,
                        bildLink: prd.data.bilder[1]["E"]["url"],
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
                        preis: prd.data.preis ? numberFormat(prd.preis, 2) : "",
                        platz: row["PLATZIERUNG"],
                        anzahlTests: row["VONGESAMT"],
                        score: prd.data.SCORE,
                        breite: prd.data.bilder[1]["L"]["breite"],
                        hoehe: prd.data.bilder[1]["L"]["hoehe"],
                        noIndex: prd.data.noIndex || prd.data.noIndex2 || kategorie.data.noIndex,
                    });
                }
            })
        );

        data["tests"] = testsData;

        this.data = data;
        this.isLoad = true;
    };

    static getByID = async (id) => {
        const obj = new Testreihe(id);

        await obj.laod();

        return obj;
    };
}

module.exports = Testreihe;
