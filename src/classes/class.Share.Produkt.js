const Strings = require("./class.Strings");
const CustomMath = require("./class.Math");
const Kategorie = require("./class.Share.Kategorie");

const db = require("../db/db-connection");
const Globals = require("../constants/globals");

class Produkt {
    identifier = "";
    typ = "";
    pid = 0;
    ppid = 0;
    purl = "";
    data = [];
    dataDate = null;
    produktText = null;
    topProducts = null;
    similar = null;
    weitere = null;
    matchedFilter = null;
    matchedKombiFilter = null;
    breadCrumb = [];
    isLoad = false;

    constructor(identifier, type = "id") {
        this.identifier = identifier;
        this.type = type;
    }

    get getIsLoad() {
        return this.isLoad;
    }

    load = async () => {
        let produktData = await this.loadData();

        if (!produktData || (produktData && !produktData["kategorieID"])) {
            return false;
        }

        produktData["tab"] = 1;
        this.data = produktData;
        this.dataDate = new Date();

        if (this.data["kategorieID"] && this.data["herstellerID"]) {
            const sql = `
                SELECT
                    anzahl
                FROM
                    filter_hersteller
                WHERE
                    kategorieID = ? AND
                    herstellerID = ?
            `;

            const res = await db.query(sql, [this.data["kategorieID"], parseInt(this.data["herstellerID"])]);

            if (res.length) this.data["herstellerFilterAnzahl"] = res[0]["anzahl"];
        } else {
            this.data["herstellerFilterAnzahl"] = 0;
        }

        let titelFilterData = null;

        if (this.data["titelFilter"]) {
            const sql = `
                SELECT
                    fn.anzeige, fn.title, fn.url, fn.filterURL, fn.anzeigeKategorie fnKatergorie,
                    fk.name, fk.anzeigeKategorie fkKatergorie
                FROM
                    filter_namen fn
                LEFT JOIN
                    filter_kategorien fk ON(fk.id = fn.fkid)
                WHERE
                    fn.id = ? AND
                    fn.anzeigen = 1 AND
                    fn.noIndex = 0 AND
                    fk.anzeigen = 1 AND
                    fn.noIndex = 0
            `;

            const res = await db.query(sql, [this.data["titelFilter"]]);

            if (res.length) {
                let name = "";
                const row = res[0];

                if (row["title"]) {
                    name = row["title"];
                } else {
                    if (row["fkKatergorie"] || row["fnKatergorie"]) {
                        name += row["name"] + ": ";
                    }
                    name += row["anzeige"];
                }

                const kategorie = await Kategorie.getByID(this.data["kategorieID"]);
                titelFilterData = {
                    name: name,
                    url: `/${kategorie.data.kategorieURL}/` + (row["filterURL"] ? row["filterURL"] : row["url"]),
                };
            }
        }

        this.data["titelFilterData"] = titelFilterData;

        this.isLoad = true;
    };

    loadData = async () => {
        let where = "";
        let values = [];

        switch (this.type) {
            case "purl":
                where = " p.PURL = ? ";
                values.push(this.identifier);
                break;

            case "id":
                where = ` p.ID = ? `;
                values.push(parseInt(this.identifier));
                break;

            default:
                break;
        }

        if (!where) {
            return;
        }

        let sql = `
            SELECT
                p.ID, p.ID id, p.PURL, p.PURL produktURL, p.PID, p.kategorieID, p.PNAME, p.PNAME produktName, p.DATENBLATT, p.DATENBLATTDETAILS, p.AUTOR, p.IMG, p.SCORE, p.TESTS,
                p.CONTENT, p.TESTCONTENT, p.TESTPRO, p.TESTCONTRA, p.TESTDATUM, p.TESTSIEGER, p.PREISSIEGER, p.herstellerID, p.manProduktDetail, p.DATUM, p.DATENBLATTFULL, p.STATUS,
                p.AMAZONASSIN, p.EAN, p.ottoID, p.TESTSDE, p.GELISTET, p.PAGE, p.noindex noIndex, p.noIndex2, p.videoAnbieter, p.videoID, p.vorgaenger, p.nachfolger, p.serienZusatz,
                p.energieEffizienzKlasse, p.titelZusatz, p.titelFilter, UNIX_TIMESTAMP(p.INSERTDATE) insertDate, p.INSERTDATE insertDatum,
                GROUP_CONCAT(DISTINCT ps.id ORDER BY ps.id SEPARATOR '|') sIDs, GROUP_CONCAT(DISTINCT ps.titel ORDER BY ps.id SEPARATOR '|') sTs,
                h.URLSTRUKTUR herstellerURL, h.HERSTELLERNAME MAN,
                GROUP_CONCAT(DISTINCT CONCAT(phj.jahr, '-', phj.id) SEPARATOR '|') produktDesJahres,
                pa.sortPos, pa.anzAngebote, pa.preis, pa.preisHoch, pa.punkte,
                GROUP_CONCAT(DISTINCT CONCAT(mas.star, '-', mas.anzahl) SEPARATOR '|') starsAmazon,
                GROUP_CONCAT(DISTINCT CONCAT(mos.star, '-', mos.anzahl) SEPARATOR '|') starsOtto,
                GROUP_CONCAT(DISTINCT CONCAT(m.id, '-', m.meinungstern) SEPARATOR '|') starsTBDE,
                IF(IFNULL(id.id, 0) > 0, 1, 0) hasIdealoDB,
                IF(IFNULL(bd.id, 0) > 0, 1, 0) hasBilligerDB,
                IF(IFNULL(od.id, 0) > 0, 1, 0) hasOttoDB
            FROM
                pname2pid_mapping p
            LEFT JOIN
                pname2pid_angebote pa ON(pa.produktID = p.id)
            LEFT JOIN
                hersteller h ON(h.id = p.herstellerID)
            LEFT JOIN
                tbmeinungen m ON (m.produktID = p.id AND m.meinungstatus = 0)
            LEFT JOIN
                meinungen_amazon_stars mas ON (mas.produktID = p.id)
            LEFT JOIN
                meinungen_otto_stars mos ON (mos.produktID = p.id)
            LEFT JOIN
                produkt_historie_jahr phj ON(phj.produktID = p.id)
            LEFT JOIN
                produkte2serien p2s ON(p2s.pid = p.id)
            LEFT JOIN
                produktserien ps ON(p2s.serienID = ps.id)
            LEFT JOIN
                produkte2serien p2s2 ON(ps.id = p2s2.serienID)
            LEFT JOIN
                idealo_datenblatt id ON(id.idealoID = p.idealoID)
            LEFT JOIN
                billiger_datenblatt bd ON(bd.billigerID = p.billigerID)
            LEFT JOIN
                otto_datenblatt od ON(od.ottoID = p.ottoID)
            WHERE
                ${where} AND
                p.gesperrt = 0 AND
                (
                h.gesperrt = 0 OR
                h.id IS NULL
                )
            GROUP BY
                p.ID
        `;

        let res = await db.query(sql, values);

        if (!res.length) return false;

        let produktData = res[0];
        produktData["id"] = parseInt(produktData["id"]);
        produktData["TESTSIEGER"] = parseInt(produktData["TESTSIEGER"]);
        produktData["PREISSIEGER"] = parseInt(produktData["PREISSIEGER"]);
        produktData["SCORE"] = parseInt(produktData["SCORE"]);
        produktData["TESTS"] = parseInt(produktData["TESTS"]);
        produktData["anzAngebote"] = parseInt(produktData["anzAngebote"]);
        produktData["preis"] = parseFloat(produktData["preis"]);
        produktData["hasIdealoDB"] = Boolean(produktData["hasIdealoDB"]);
        produktData["hasBilligerDB"] = Boolean(produktData["hasBilligerDB"]);
        produktData["hasOttoiDB"] = Boolean(produktData["hasOttoDB"]);

        produktData["pro"] = produktData["TESTPRO"] ? produktData["TESTPRO"].split(" // ") : [];
        produktData["contra"] = produktData["TESTCONTRA"] ? produktData["TESTCONTRA"].split(" // ") : [];

        let serien = [];
        let serieID = 0;
        let serieName = "";
        let serieURL = "";

        if (produktData["sIDs"] !== null) {
            const serienIDs = produktData["sIDs"].split("|");
            const serienTitel = produktData["sTs"].split("|");

            Object.keys(serienIDs).forEach((key) => {
                serieID = serienIDs[key];
                serieName = serienTitel[key];
                serieURL = `${serieID}-${Strings.manURLEncode(serieName.toLocaleLowerCase())}`;

                serien.push({
                    serieID: {
                        prdSerienID: serieID,
                        prdSerienName: serieName,
                        prdSerienURL: serieURL,
                    },
                });
            });
        }

        if (produktData["produktDesJahres"]) {
            let ret = [];

            produktData["produktDesJahres"].split("|").forEach((element) => {
                element = element.split("-");

                ret.push({
                    jahr: element[0],
                    id: element[1],
                });
            });

            produktData["produktDesJahres"] = ret;
        }

        const serienData = {
            serien: serien,
            serieID: serieID,
            serieName: serieName,
            serieURL: serieURL,
        };

        produktData = { ...produktData, ...serienData };

        let meinungenTBDE = 0;
        let meinungenAmazon = 0;
        let meinungenOtto = 0;
        let punkte = 0;

        if (produktData["starsTBDE"]) {
            produktData["starsTBDE"].split("|").forEach((starList) => {
                const exp = starList.split("-");
                meinungenTBDE++;
                punkte += parseInt(exp[1]);
            });
        }

        if (produktData["starsAmazon"]) {
            produktData["starsAmazon"].split("|").forEach((starList) => {
                const exp = starList.split("-");
                meinungenAmazon += parseInt(exp[1]);
                punkte += parseInt(exp[0]) * parseInt(exp[1]);
            });
        }

        if (produktData["starsOtto"]) {
            produktData["starsOtto"].split("|").forEach((starList) => {
                const exp = starList.split("-");
                meinungenOtto += parseInt(exp[1]) + 6;
                punkte += parseInt(exp[0]) * parseInt(exp[1]);
            });
        }

        const meinungenGesamt = meinungenTBDE + meinungenAmazon + meinungenOtto;

        produktData["anzMeinungen"] = meinungenGesamt;
        produktData["anzMeinungenTBDE"] = meinungenTBDE;
        produktData["anzMeinungenAmazon"] = meinungenAmazon;
        produktData["anzMeinungenOtto"] = meinungenOtto;
        produktData["meinungenPunkte"] = meinungenGesamt ? Math.round((punkte / meinungenGesamt) * 100) / 100 : 0;
        produktData["MEINUNGENSCORE"] = CustomMath.round5(produktData["meinungenPunkte"]);
        produktData["meinungenScore"] = CustomMath.round5(produktData["meinungenPunkte"]);

        delete produktData.starsTBDE;
        delete produktData.starsAmnazon;

        let starsFull = Math.floor(produktData["meinungenPunkte"]);
        starsFull += produktData["meinungenPunkte"] - starsFull > 0.74 ? 1 : 0;
        const starsHalf = produktData["meinungenPunkte"] - starsFull > 0.24 ? 1 : 0;
        const starsEmpty = 5 - starsFull - starsHalf;

        let stars = Array(starsFull).fill("full");
        stars = stars.concat(Array(starsHalf).fill("half"));
        stars = stars.concat(Array(starsEmpty).fill("empty"));

        produktData["meinungenStars"] = produktData["meinungenPunkte"]; // stars variable

        sql = `
            SELECT
                pos, groesse, breite, hoehe, pfad
            FROM
                produktbilder
            WHERE
                produktID = ?
            ORDER BY
                pos ASC
        `;

        res = await db.query(sql, [produktData["ID"]]);

        let produktBilder = [];
        let pos = [];
        let i = 0;

        for (let row of res) {
            row["pos"] = parseInt(row["pos"]);
            row["breite"] = parseInt(row["breite"]);
            row["hoehe"] = parseInt(row["hoehe"]);

            if (pos[row["pos"]] === undefined) {
                pos[row["pos"]] = i++;
            }

            row["url"] = Globals.SITE_IMG_GOOGLE + row["pfad"];

            const groesse = {
                [row.groesse]: row,
            };

            produktBilder[pos[row["pos"]]] = { ...produktBilder[pos[row["pos"]]], ...groesse };
        }

        produktData["showGallery"] = true;

        if (!produktBilder.length) {
            produktData["showGallery"] = false;

            const produktBilderItems = {
                S: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 70,
                    hoehe: 70,
                },
                D: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 100,
                    hoehe: 100,
                },
                E: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 200,
                    hoehe: 200,
                },
                L: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 350,
                    hoehe: 350,
                },
                XL: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 600,
                    hoehe: 600,
                },
                XXL: {
                    pos: 1,
                    url: Globals.SITE_IMG_GOOGLE + "/no-image.svg",
                    breite: 1500,
                    hoehe: 1500,
                },
            };

            produktBilder.push(produktBilderItems);
        }

        produktData["bilder"] = produktBilder;

        return produktData;
    };

    static getByID = async (id) => {
        const obj = new Produkt(id);

        await obj.load();

        return obj;
    };

    static getByPurl = async (purl) => {
        const obj = new Produkt(purl, "purl");

        await obj.load();

        return obj;
    };
}

module.exports = Produkt;
