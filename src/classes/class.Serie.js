const Strings = require("./class.Strings");
const Datenblatt = require("./class.Serie.Datenblatt");
const Hersteller = require("./class.Hersteller");

const db = require("../db/db-connection");

const { DB_REPLACE, SITE_IMG_GOOGLE } = require("../constants/globals");
const { numberFormat, stripHtmlTags } = require("../utils/functions.inc");

class Serie {
    identifier = "";
    typ = "";

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ;
    }

    load = async () => {
        switch (this.typ) {
            case "url":
                if (!this.identifier.match(/^([0-9]+)-.*$/)) return false;
                else var serienID = parseInt(/^([0-9]+)-.*$/.exec(this.identifier)[1]);

                break;

            case "id":
                if (this.identifier == parseInt(this.identifier).toString()) var serienID = parseInt(this.identifier);
                else if (this.identifier.match(/^1-([0-9]+)$/)) var serienID = parseInt(/^1-([0-9]+)$/.exec(this.identifier)[2]);
                else return false;

                break;

            default:
                return false;
        }

        const sql = `
            SELECT
                ps.id, ps.titel, ps.titleKey, ps.description, ps.noIndex, ps.serienUeberschrift, ps.serienText, ps.autor, ps.insertDatum,
                p2s.pid, p2s.zusatz,
                p.herstellerID, p.serienZusatz, p.kategorieID
            FROM
                produktserien ps
            LEFT JOIN
                produkte2serien p2s ON(ps.id = p2s.serienID)
            LEFT JOIN
                pname2pid_mapping p ON(p.id = p2s.pid)
            LEFT JOIN
                hersteller h ON(h.id = p.herstellerID)
            WHERE
                ps.id = ? AND
                p.id IS NOT NULL AND
                h.gesperrt = 0
        `;

        const res = await db.query(sql, [serienID]);

        if (!res.length) return false;

        const row = res[0];

        const data = {
            id: serienID,
            titel: row["titel"],
            title: row["titel"],
            serienName: row["titel"],
            titelKey: row["titleKey"],
            description: row["description"],
            serieURL: `${serienID}-${Strings.manURLEncode(row["titel"]).replace(/|-+|/, "-")}`,
            serienURL: `${serienID}-${Strings.manURLEncode(row["titel"]).replace(/|-+|/, "-")}`,
            serienZusatz: "",
            serienUeberschrift: row["serienUeberschrift"],
            serienText: row["serienText"],
            autor: row["autor"],
            modell: "",
            herstellerID: row["herstellerID"],
            kategorieID: row["kategorieID"],
            noIndex: row["noIndex"] === "1",
            insertDatum: row["insertDatum"],
        };

        let zusatz = {};
        let pidList = [];
        for (const row of res) {
            pidList.push(row["pid"]);
            zusatz[row["pid"]] = (row["zusatz"] ? row["zusatz"] : row["serienZusatz"]).replace('"', " Zoll");

            if (!data["herstellerID"] && row["herstellerID"]) data["herstellerID"] = row["herstellerID"];
        }

        data["zusatz"] = zusatz;

        this.data = data;

        await this.loadProducts(pidList);

        this.isLoad = true;
    };

    loadProducts = async (pidList) => {
        const sql = `
                SELECT
                    p.id, p.PNAME, p.PURL, p.kategorieID, p.DATENBLATT, p.DATENBLATTDETAILS, p.IMG, p.MAN, p.EAN, p.CONTENT, p.TESTCONTENT, p.SCORE, p.TESTS, p.TESTPRO, p.TESTCONTRA, p.TESTSIEGER,
                    p.PREISSIEGER, p.MEINUNGENSCORE, p.MEINUNGEN, p.meinungenPunkte, p.energieEffizienzKlasse, p.serienZusatz, p.noindex, p.noIndex2,
                    pa.anzAngebote, pa.preis, pa.sortPos,
                    k.noIndex noIndexKategorie, k.kategorieURL,
                    pb.pfad bildPfad, pb.breite, pb.hoehe,
                    GROUP_CONCAT(DISTINCT CONCAT(mas.star, '-', mas.anzahl) SEPARATOR '|') starsAmazon,
                    GROUP_CONCAT(DISTINCT CONCAT(mos.star, '-', mos.anzahl) SEPARATOR '|') starsOtto,
                    GROUP_CONCAT(DISTINCT CONCAT(m.id, '-', m.meinungstern) SEPARATOR '|') starsTBDE
                FROM
                    pname2pid_mapping p
                LEFT JOIN
                    pname2pid_angebote pa ON(pa.produktID = p.id)
                LEFT JOIN
                    kategorien k ON(k.id = p.kategorieID)
                LEFT JOIN
                    tbmeinungen m ON (m.produktID = p.ID AND m.meinungstatus = 0)
                LEFT JOIN
                    meinungen_amazon_stars mas ON (mas.produktID = p.id)
                LEFT JOIN
                    meinungen_otto_stars mos ON (mos.produktID = p.id)
                LEFT JOIN
                    produktbilder pb ON(pb.produktID = p.id AND pb.pos = 1 AND pb.groesse = 'L')
                WHERE
                    p.id IN(?)
                GROUP BY
                    p.id
                ORDER BY
                    pa.sortPos ASC
                `;

        const res = await db.query(sql, [pidList]);

        const hersteller = await Hersteller.getByID(this.data.herstellerID);

        let items = [];

        for (const row of res) {
            const dbData = await Datenblatt.getByID(row["id"]);
            var datenblatt = [];
            if (dbData.isLoad && dbData.haveDatenblattKurz()) {
                const dbDataKurz = dbData.getDatenblattKurzSort();

                for (const labelID in dbDataKurz) {
                    if (Object.hasOwnProperty.call(dbDataKurz, labelID)) {
                        const attributIDs = dbDataKurz[labelID];
                        const label = dbData.getLabel(labelID);

                        let attribute = [];

                        for (const aID of attributIDs["attribute"]) {
                            attribute.push(dbData.getAttribut(aID));
                        }

                        let dbLine = "";

                        if (attributIDs["data"]["showLabel"]) dbLine = `${label}: `;

                        dbLine += attribute.join(", ");

                        datenblatt.push(dbLine);
                    }
                }
            } else {
                if (row["DATENBLATTDETAILS"]) datenblatt = stripHtmlTags(row["DATENBLATTDETAILS"]);
                else datenblatt = stripHtmlTags(row["DATENBLATT"]);

                datenblatt = Strings.dataSnippet(datenblatt, 25);

                for (const key in DB_REPLACE) {
                    if (Object.hasOwnProperty.call(DB_REPLACE, key)) {
                        const value = DB_REPLACE[key];
                        datenblatt = datenblatt.replace(key, value);
                    }
                }

                datenblatt = datenblatt.split(" / ");
            }

            if (row["bildPfad"]) {
                var cImg = SITE_IMG_GOOGLE + row["bildPfad"];
                var imgS = cImg.replace("L1_", "S1_");
                var imgXXL = cImg.replace("L1_", "XXL1_");
                var breite = row["breite"];
                if (!row["breite"] || !row["hoehe"]) {
                    var hoehe = 200;
                } else {
                    var hoehe = Math.round((breite / row["breite"]) * row["hoehe"]);
                }
            } else {
                var cImg = SITE_IMG_GOOGLE + "/no-image.svg";
                var imgS = "";
                var imgXXL = "";
                var breite = 200;
                var hoehe = 200;
            }

            let meinungenTBDE = 0;
            let meinungenAmazon = 0;
            let meinungenOtto = 0;
            let punkte = 0;

            if (row["starsTBDE"]) {
                for (const starList of row["starsTBDE"].split("|")) {
                    const exp = starList.split("-");
                    meinungenTBDE++;
                    punkte += parseInt(exp[1]);
                }
            }

            if (row["starsAmazon"]) {
                for (const starList of row["starsAmazon"].split("|")) {
                    const exp = starList.split("-");
                    meinungenAmazon += parseInt(exp[1]);
                    punkte += parseInt(exp[0]) * parseInt(exp[1]);
                }
            }

            if (row["starsOtto"]) {
                for (const starList of row["starsOtto"].split("|")) {
                    const exp = starList.split("-");
                    meinungenOtto += parseInt(exp[1]);
                    punkte += parseInt(exp[0]) * parseInt(exp[1]);
                }
            }

            let meinungenGesamt = meinungenTBDE + meinungenAmazon + meinungenOtto;
            let meinungenPunkte = meinungenGesamt ? Math.round((punkte / meinungenGesamt + Number.EPSILON) * 100) / 100 : 0;

            let starsFull = Math.floor(meinungenPunkte);
            starsFull += meinungenPunkte - starsFull > 0.74 ? 1 : 0;
            const starsHalf = meinungenPunkte - starsFull > 0.24 ? 1 : 0;
            const starsEmpty = 5 - starsFull - starsHalf;

            let stars = Array(starsFull).fill("full");
            stars = stars.concat(Array(starsHalf).fill("half"));
            stars = stars.concat(Array(starsEmpty).fill("empty"));

            items.push({
                id: row["id"],
                kategorieID: row["kategorieID"],
                pname: row["PNAME"],
                produktURL: row["PURL"],
                serienZusatz: row["serienZusatz"],
                hersteller: hersteller.data.herstellerName,
                herstellerID: hersteller.data.id,
                img: cImg,
                imgS: imgS,
                imgXXL: imgXXL,
                datenblatt: datenblatt,
                tests: row["TESTS"],
                testsieger: row["TESTSIEGER"],
                preissieger: row["PREISSIEGER"],
                score: row["SCORE"],
                noteID: row["id"],
                meinungen: meinungenGesamt,
                meinungenscore: Math.ceil(meinungenPunkte / 5) * 5,
                meinungenPunkte: meinungenPunkte,
                meinungenStars: meinungenPunkte, // stars variable
                pro: row["TESTPRO"] ? row["TESTPRO"].split(" // ") : [],
                contra: row["TESTCONTRA"] ? row["TESTCONTRA"].split(" // ") : [],
                purl: "/produkte/" + row["PURL"],
                produktLink: "/produkte/" + row["PURL"],
                produktURL: row["PURL"],
                ean: row["EAN"],
                angebote: row["anzAngebote"],
                preis: row["preis"] ? numberFormat(row["preis"], 2) : null,
                preisSort: parseFloat(row["preis"]),
                breite: breite,
                hoehe: hoehe,
                energieEffizienzKlasse: row["energieEffizienzKlasse"],
                noIndex: row["noindex"],
                noIndex2: row["noIndex2"],
                noIndexKategorie: row["noIndexKategorie"],
            });
        }

        this.data["produkte"] = items;
    };

    static getByID = async (id) => {
        const obj = new Serie(id, "id");

        await obj.load();

        return obj;
    };

    static getByURL = async (serieURL) => {
        const obj = new Serie(serieURL, "url");

        await obj.load();

        return obj;
    };
}

module.exports = Serie;
