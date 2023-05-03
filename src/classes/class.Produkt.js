const Strings = require("./class.Strings");
const CustomMath = require("./class.Math");
const Kategorie = require("./class.Share.Kategorie");
const Testberichte = require("./class.Testberichte");
const Angebote = require("./class.Angebote");
const Preishistorie = require("./class.Preishistorie");
const Meinungen = require("./class.Meinungen");
const FragenAntworten = require("./class.FragenAntworten");
const Datenblatt = require("./class.Datenblatt");
const Hersteller = require("./class.Hersteller");

const db = require("../db/db-connection");
const Globals = require("../constants/globals");
const Serie = require("./class.Serie");
const { getRandomThree, shuffle, replaceArray, ProduktFormatDate } = require("../utils/functions.inc");
const {
    PRODUKTE_TOP_DAVOR,
    PRODUKTE_TOP_DANACH,
    PRODUKTE_WEITERE_DAVOR,
    PRODUKTE_WEITERE_DANACH,
    PRODUKTE_SIMILAR_DAVOR,
    PRODUKTE_SIMILAR_DANACH,
    PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTER,
    PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTERKOMBI,
    PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN,
} = require("../constants/globals");

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
                values = [this.identifier];
                break;

            case "id":
                where = ` p.ID = ? `;
                values = [parseInt(this.identifier)];
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

        let res = await db.query(sql, [...values]);

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

            produktBilder[pos[row["pos"]]] = {
                ...produktBilder[pos[row["pos"]]],
                ...groesse,
            };
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

    getKategorie = async () => {
        const kategorie = await Kategorie.getByID(this.data.kategorieID);

        return kategorie;
    };

    getTestberichte = async () => {
        const tests = await Testberichte.getByID(this.data.id);

        return tests;
    };

    getAngebote = async () => {
        const angebote = await Angebote.getByID(this.data.id);

        return angebote;
    };

    getPreishistorie = async () => {
        const preishistorie = await Preishistorie.getByID(this.data.id);

        return preishistorie;
    };

    getMeinungen = async () => {
        const meinungen = await Meinungen.getByID(this.data.id);

        return meinungen;
    };

    getFragen = async () => {
        const fragen = await FragenAntworten.getByID(this.data.id);

        return fragen;
    };

    getDatenblatt = async () => {
        const datenblatt = await Datenblatt.getByID(this.data.id);

        return datenblatt;
    };

    getHersteller = () => {
        const hersteller = Hersteller.getByID(this.data.herstellerID);

        return hersteller;
    };

    getSerien = async () => {
        let serien = [];
        for (const serie of this.data.serien) {
            const serieObj = await Serie.getByURL(serie["serieID"]["prdSerienURL"]);
            serien.push(serieObj);
        }

        return serien;
    };

    getProduktText = async () => {
        if (this.produktText === null) {
            const sql = `
                SELECT
                    pt.text
                FROM
                    produkte_texte pt
                LEFT JOIN
                    produkte2texte p2t ON(pt.id = p2t.textID)
                LEFT JOIN
                    produkte_texte_kategorien ptk ON(ptk.id = pt.produkteTextKategorie)
                WHERE
                    p2t.produktID = ? AND
                    pt.gesperrt = 0 AND
                    ptk.gesperrt = 0
                ORDER BY
                    p2t.sort ASC
            `;

            const res = await db.query(sql, [this.data.id]);

            let produktText = [];
            for (const row of res) {
                produktText.push(row["text"]);
            }

            this.produktText = produktText;
        }

        let datenblatt = await this.getDatenblatt();
        let hersteller = await this.getHersteller();
        let tests = await this.getTestberichte();
        let meinungen = await this.getMeinungen();

        const suchen = [
            "{PRODUKTNAME}",
            "{HERSTELLERNAME}",
            "{ANZAHL_TESTS}",
            "{ANZAHL_TESTREIHEN}",
            "{TESTNOTE_TEXT}",
            "{TESTNOTE_PROZENT}",
            "{ANZAHL_TESTSIEGER}",
            "{ANZAHL_PREISSIEGER}",
            "{ANZAHL_MEINUNGEN}",
            "{BEWERTUNG_STERNE}",
        ];

        const ersetzen = [
            this.data.produktName.replace(hersteller.data.herstellerName, "").trim(),
            hersteller.data.herstellerName,
            tests.countTests(),
            tests.countTestreihen(),
            tests.getTestnoteText(),
            tests.getScore(),
            this.data.TESTSIEGER,
            this.data.PREISSIEGER,
            meinungen.countMeinungen(),
            meinungen.getMeinungenPunkte(true),
        ];

        const SUCHEN2 = ["[ANZAHL_TESTS]", "[ANZAHL_TESTSIEGER]", "[ANZAHL_PREISSIEGER]", "[ANZAHL_TESTREIHEN]", "[ANZAHL_MEINUNGEN]"];

        const ERSETZEN2 = [tests.countTests(), this.data.TESTSIEGER, this.data.PREISSIEGER, tests.countTestreihen(), meinungen.countMeinungen()];

        let text = "";
        for (const row of this.produktText) {
            let matches = [...row.matchAll(/\{IF\([^\(\)]+\)\}.*\{\/IF\}/g)][0];

            if (matches) {
                for (const match of matches) {
                    let m = [...match.matchAll(/\{IF\((.*)\)\}(.*)\{\/IF\}/g)][0];
                    var erg = eval(m[1].replaceArray(SUCHEN2, ERSETZEN2));

                    let exp = m[2].split("{ELSE}");
                    if (erg) {
                        row.replace(match, exp[0]);
                        break;
                    } else {
                        row.replace(match, exp[1]);
                        break;
                    }
                }
            }

            matches = row.match(/{[A-Z0-9_|]+}/g);
            if (matches) {
                for (const m of matches) {
                    if (suchen.includes(m)) continue;

                    let match = [...m.matchAll(/\{DBID_([0-9]+)(\|([0-9])+)?\}/g)][0];
                    if (match && match.length) {
                        var attribute = datenblatt.getAttributByLabel(match[1]);
                        if (!attribute) continue;

                        if (match[3] && parseInt(match[3]) < attribute.length) {
                            attribute = getRandomThree(attribute);
                        } else {
                            attribute = shuffle(attribute);
                        }
                    }

                    if (attribute && attribute.length > 1) {
                        var attribut = "";
                        for (const k in attribute) {
                            const a = attribute[k];
                            if (attribut) {
                                if (k === attribute.length - 1) attribut += " und ";
                                else attribut += ", ";
                            }

                            attribut += a;
                        }
                    } else {
                        var attribut = attribute[0];
                    }

                    suchen.push(m);
                    ersetzen.push(attribut);
                }
            }

            text += row + "\n";
        }

        text = replaceArray(text, suchen, ersetzen).trim();

        return text;
    };

    getTestsInVarianten = async () => {
        let serienIDs = [];

        if (!this.serien) {
            return [];
        }

        this.serien.forEach((serie) => {
            serienIDs.push(serie["prdSerienID"]);
        });

        const sql = `
            SELECT
                p.PURL, p.PNAME
            FROM
                pname2pid_mapping p
            LEFT JOIN
                produkte2serien p2s ON(p2s.pid = p.ID)
            WHERE
                p2s.serienID IN(?) AND
                NOT p.ID = ? AND
                p.TESTS > 0
        `;

        const res = await db.query(sql, [serienIDs, this.data.id]);

        let sData = {};
        res.forEach((row) => {
            sData[row["PURL"]] = row["PNAME"];
        });

        return sData;
    };

    getTopProducts = async () => {
        if (this.topProducts === null) {
            const prdTopGesamt = PRODUKTE_TOP_DAVOR + PRODUKTE_TOP_DANACH;

            let sql = `
                SELECT
                    fn.id, IF(fn.sort <> 0, fn.sort, 999) sortFN,
                    IF(fk.sort <> 0, fk.sort, 999) sortFK
                FROM
                    filter_namen fn
                LEFT JOIN
                    filterid2pid f2p ON(f2p.fid = fn.id)
                LEFT JOIN
                    filter_kategorien fk ON(fk.id = fn.fkid)
                WHERE
                    f2p.produktID = ?
                UNION
                SELECT
                    0, 999, 999
                ORDER BY
                    sortFK ASC,
                    sortFN ASC
            `;

            let res = await db.query(sql, [this.data.ID]);

            let ret = [];
            for (const row of res) {
                let values = [];
                let join = "";
                let where = "";

                if (row["id"]) {
                    join += " LEFT JOIN filterid2pid f2p ON(ps.produktID = f2p.produktID) ";
                    where += ` AND f2p.fid = ? `;
                }

                values.push(this.data.kategorieID);
                values.push(this.data.sortPos - prdTopGesamt - 1);
                values.push(this.data.sortPos + prdTopGesamt + 1);
                values.push(
                    [this.data.id].concat(
                        ret,
                        this.topProducts === null ? [] : this.topProducts,
                        this.similar === null ? [] : this.similar,
                        this.weitere === null ? [] : this.weitere
                    )
                );

                sql = `
                    SELECT
                        ps.produktID, ps.sortPos
                    FROM
                        pname2pid_show ps
                        ${join}
                    WHERE
                        ps.kategorieID = ? AND
                        ps.noIndex2 = 0 AND
                        ps.sortPos BETWEEN (?) AND (?) AND
                        NOT ps.produktID IN (?) 
                        ${where}
                    GROUP BY
                        ps.produktID
                    ORDER BY
                        ps.sortPos ASC
                `;

                let res2 = await db.query(sql, [...values, row["id"]]);

                if (res2.length > 0) {
                    let tmp = {
                        davor: [],
                        danach: [],
                    };

                    for (const row2 of res2) {
                        if (row2["sortPos"] < this.sortPos) {
                            if (tmp["davor"].length < prdTopGesamt) tmp["davor"].push(row2["produktID"]);
                        } else {
                            tmp["danach"].push(row2["produktID"]);
                            if (tmp["danach"].length + tmp["davor"].length >= prdTopGesamt) {
                                break;
                            }
                        }
                    }

                    tmp["davor"] = tmp["davor"].reverse();

                    if (tmp["danach"].length < PRODUKTE_TOP_DANACH) {
                        var anzDavor = prdTopGesamt - tmp["danach"].length;
                    } else if (tmp["davor"].length < PRODUKTE_TOP_DANACH) {
                        var anzDavor = tmp["davor"].length;
                    } else {
                        var anzDavor = PRODUKTE_TOP_DAVOR;
                    }

                    if (anzDavor > tmp["davor"].length) {
                        anzDavor = tmp["davor"].length;
                    }

                    for (let k = 0; k < tmp["davor"].length; k++) {
                        if (k >= anzDavor) break;

                        ret.push(tmp["davor"][k]);

                        if (ret.length === prdTopGesamt) break;
                    }

                    if (ret.length < prdTopGesamt) {
                        for (let k = 0; k < tmp["danach"].length; k++) {
                            if (k >= prdTopGesamt - anzDavor) break;

                            ret.push(tmp["danach"][k]);

                            if (ret.length === prdTopGesamt) break;
                        }
                    }

                    if (ret.length === prdTopGesamt) {
                        break;
                    }
                }
            }

            this.topProducts = ret;
        }

        return this.topProducts;
    };

    getMoreProducts = async () => {
        if (this.weitere === null) {
            let prdTopGesamt = PRODUKTE_WEITERE_DAVOR + PRODUKTE_WEITERE_DANACH;

            let tmp = {
                davor: [],
                danach: [],
            };

            const values = [
                this.data.kategorieID,
                parseInt(this.data.anzAngebote),
                parseInt(this.data.anzAngebote),
                this.data.sortPos,
                [this.data.id].concat(
                    this.topProducts === null ? [] : this.topProducts,
                    this.similar === null ? [] : this.similar,
                    this.weitere === null ? [] : this.weitere
                ),
                prdTopGesamt,
            ];

            let sql = `
                SELECT
                    pa.produktID
                FROM
                    pname2pid_angebote pa
                WHERE
                    pa.kategorieID = ? AND
                    pa.noIndex = 0 AND
                    pa.noIndex2 = 0 AND
                    pa.anzAngebote > 0 AND
                    (
                    pa.anzAngebote > ? OR
                    (
                        pa.anzAngebote = ? AND
                        pa.sortPos < ?
                    )
                    ) AND
                    NOT pa.produktID IN (?)
                ORDER BY
                    pa.anzAngebote ASC,
                    pa.sortPos DESC
                LIMIT
                    0, ?
            `;

            let res = await db.query(sql, values);

            for (const row of res) {
                tmp["davor"].push(row["produktID"]);
            }

            sql = `
                SELECT
                    pa.produktID
                FROM
                    pname2pid_angebote pa
                WHERE
                    pa.kategorieID = ? AND
                    pa.noIndex = 0 AND
                    pa.noIndex2 = 0 AND
                    pa.anzAngebote > 0 AND
                    (
                        pa.anzAngebote < ? OR
                    (
                        pa.anzAngebote = ? AND
                        pa.sortPos > ?
                    )
                    ) AND
                    NOT pa.produktID IN (?)
                ORDER BY
                    pa.anzAngebote DESC,
                    pa.sortPos ASC
                LIMIT
                    0, ?
            `;

            res = await db.query(sql, values);

            for (const row of res) {
                tmp["davor"].push(row["produktID"]);
            }

            let ret = [];
            if (tmp["danach"].length < PRODUKTE_WEITERE_DANACH) {
                var anzDavor = prdTopGesamt - tmp["danach"].length;
            } else {
                var anzDavor = PRODUKTE_WEITERE_DAVOR;
            }
            if (tmp["davor"].length <= anzDavor) {
                ret = tmp["davor"];
            } else {
                ret = tmp["davor"].slice(0, anzDavor);
            }

            const anzDanach = prdTopGesamt - ret.length;
            if (tmp["danach"].length <= anzDanach) {
                ret = ret.concat(tmp["danach"]);
            } else {
                ret = ret.concat(ret, tmp["danach"].slice(0, anzDanach));
            }

            this.weitere = ret;
        }

        return this.weitere;
    };

    getSimilarProducts = async () => {
        if (this.similar === null) {
            let join = "";
            let where = "";

            let values = [
                this.data.kategorieID,
                this.data.sortPos,
                [this.data.id].concat(
                    this.topProducts === null ? [] : this.topProducts,
                    this.similar === null ? [] : this.similar,
                    this.weitere === null ? [] : this.weitere
                ),
            ];

            if (this.data.titelFilter) {
                join += `
                    LEFT JOIN
                        filterid2pid f2p ON(f2p.produktID = ps.produktID)
                    LEFT JOIN
                        filter_namen fn ON(f2p.fid = fn.id)
                `;
                where += ` AND fn.id =? `;
                values.push(this.data.titelFilter);
            }

            let prdSimilarGesamt = PRODUKTE_SIMILAR_DAVOR + PRODUKTE_SIMILAR_DANACH;

            let tmp = {
                davor: [],
                danach: [],
            };

            let sql = `
                SELECT
                    ps.produktID
                FROM
                    pname2pid_show ps
                ${join}
                WHERE
                    ps.kategorieID = ? AND
                    ps.sortPos < ? AND
                    ps.noIndex2 = 0 AND
                    NOT ps.produktID IN (?)
                    ${where}
                GROUP BY
                    ps.produktID
                ORDER BY
                    ps.sortPos
                LIMIT
                    0, 50
            `;

            let res = await db.query(sql, values);

            for (const row of res) {
                tmp["davor"].push(row["produktID"]);

                if (tmp["davor"].length === PRODUKTE_SIMILAR_DAVOR) {
                    break;
                }
            }

            tmp["davor"] = tmp["davor"].reverse();

            let anzDavor = tmp["davor"].length;
            let anzDanach = PRODUKTE_SIMILAR_DANACH;
            if (anzDavor < PRODUKTE_SIMILAR_DAVOR) {
                anzDanach += PRODUKTE_SIMILAR_DAVOR - anzDavor;
            }

            sql = `
                SELECT
                    pa.produktID
                FROM
                    pname2pid_show pa
                ${join}
                WHERE
                    pa.kategorieID = ? AND
                    pa.sortPos > ? AND
                    pa.noIndex2 = 0 AND
                    NOT pa.produktID IN (?)
                    ${where}
                GROUP BY
                    pa.produktID
                ORDER BY
                    pa.sortPos
                LIMIT
                    0, 50
            `;

            res = await db.query(sql, values);

            for (const row of res) {
                tmp["danach"].push(row["produktID"]);

                if (tmp["danach"].length === PRODUKTE_SIMILAR_DANACH) {
                    break;
                }
            }

            this.similar = tmp["davor"].concat(tmp["danach"]);
        }

        return this.similar;
    };

    getMatchedKombiFilter = async () => {
        if (this.matchedKombiFilter === null) {
            const kategorie = await this.getKategorie();

            let sql = `
                SELECT
                    fn.id, fn.title, fn.anzahl,
                    GROUP_CONCAT(IFNULL(fn.filterURL, fn.url) ORDER BY
                    IF(fk.sort <> 0, fk.sort, 999) ASC,
                    fk.name ASC,
                    IF(fn.sort <> 0, fn.sort, 999) ASC,
                    fn.anzeige ASC
                    SEPARATOR '-') url,
                    GROUP_CONCAT(
                    CONCAT(
                        IF(fk.anzeigeKategorie = 1 OR fn.anzeigeKategorie = 1, CONCAT(fk.name, ' '), ''), fn.anzeige
                    ) ORDER BY
                    IF(fk.sort <> 0, fk.sort, 999) ASC,
                    fk.name ASC,
                    IF(fn.sort <> 0, fn.sort, 999) ASC,
                    fn.anzeige ASC
                    SEPARATOR ' ') anzeige
                FROM
                    filter_namen fn
                LEFT JOIN
                    filter_kategorien fk ON(fk.id = fn.fkid)
                LEFT JOIN
                    filterid2pid f2p ON(f2p.fid = fn.id)
                WHERE
                    f2p.produktID = ? AND
                    fn.noIndex = 0 AND
                    fk.noIndex = 0 AND
                    fn.anzeigen = 1 AND
                    fk.anzeigen = 1 AND
                    fn.anzahl > 9
                GROUP BY
                    fn.id
                ORDER BY
                    fk.sort ASC,
                    fn.sort ASC,
                    fn.anzahl DESC
                LIMIT
                    0, ?
            `;

            let res = await db.query(sql, [this.data.id, PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTER]);

            let ret = [];
            for (const row of res) {
                row["filterLink"] = "/" + kategorie.data.kategorieURL + "/" + row["url"];
                row["titleShow"] = row["title"] ? row["title"] : kategorie.data.kategorieName + " " + row["anzeige"];

                ret.push(row);
            }

            sql = `
                SELECT
                    fko.id, fko.title, fko.anzahl,
                    GROUP_CONCAT(IFNULL(fn.filterURL, fn.url) ORDER BY
                    IF(fk.sort <> 0, fk.sort, 999) ASC,
                    fk.name ASC,
                    IF(fn.sort <> 0, fn.sort, 999) ASC,
                    fn.anzeige ASC
                    SEPARATOR '-') url,
                    GROUP_CONCAT(
                    CONCAT(
                        IF(fk.anzeigeKategorie = 1 OR fn.anzeigeKategorie = 1, CONCAT(fk.name, ' '), ''), fn.anzeige
                    ) ORDER BY
                    IF(fk.sort <> 0, fk.sort, 999) ASC,
                    fk.name ASC,
                    IF(fn.sort <> 0, fn.sort, 999) ASC,
                    fn.anzeige ASC
                    SEPARATOR ' ') anzeige
                FROM
                    filter_kombinieren fko
                LEFT JOIN
                    filter_kombinieren_eintraege fke ON(fke.fkoid = fko.id)
                LEFT JOIN
                    filter_namen fn ON(fn.id = fke.fnid)
                LEFT JOIN
                    filter_kategorien fk ON(fk.id = fn.fkid)
                LEFT JOIN
                    filter_kombinieren_produkte fkp ON(fkp.fkoid = fko.id)
                WHERE
                    fkp.produktID = ? AND
                    fko.aktiv = 1 AND
                    fko.noIndex = 0 AND
                    fko.anzahl > 9
                GROUP BY
                    fko.id
                HAVING
                    COUNT(fke.fkoid) > 1
                ORDER BY
                    fko.anzahl DESC
                LIMIT
                    0, ?
            `;

            res = await db.query(sql, [this.data.id, PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTERKOMBI]);

            let fkoIDs = [];
            for (const row of res) {
                row["filterLink"] = "/" + kategorie.data.kategorieURL + "/" + row["url"];
                row["titleShow"] = row["title"] ? row["title"] : kategorie.data.kategorieName + " " + row["anzeige"];

                ret.push(row);

                fkoIDs.push(row["id"]);
            }

            if (ret.length < PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN) {
                let where = "";
                let values;

                if (fkoIDs.length) {
                    where = ` AND NOT fko.id IN(?) `;
                    values = [this.data.kategorieID, fkoIDs, PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN];
                } else {
                    values = [this.data.kategorieID, PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN];
                }

                sql = `
                    SELECT
                        fko.title, fko.anzahl,
                        GROUP_CONCAT(DISTINCT IFNULL(fn.filterURL, fn.url) ORDER BY
                        IF(fk.sort <> 0, fk.sort, 999) ASC,
                        fk.name ASC,
                        IF(fn.sort <> 0, fn.sort, 999) ASC,
                        fn.anzeige ASC
                        SEPARATOR '-') url,
                        GROUP_CONCAT(DISTINCT
                        CONCAT(
                            IF(fk.anzeigeKategorie = 1 OR fn.anzeigeKategorie = 1, CONCAT(fk.name, ' '), ''), fn.anzeige
                        ) ORDER BY
                        IF(fk.sort <> 0, fk.sort, 999) ASC,
                        fk.name ASC,
                        IF(fn.sort <> 0, fn.sort, 999) ASC,
                        fn.anzeige ASC
                        SEPARATOR ' ') anzeige
                    FROM
                        filter_kombinieren fko
                    LEFT JOIN
                        filter_kombinieren_eintraege fke ON(fke.fkoid = fko.id)
                    LEFT JOIN
                        filter_namen fn ON(fn.id = fke.fnid)
                    LEFT JOIN
                        filter_kategorien fk ON(fk.id = fn.fkid)
                    WHERE
                        fko.kategorieID = ? AND
                        fko.aktiv = 1 AND
                        fko.noIndex = 0 AND
                        fko.anzahl > 0
                        ${where}
                    GROUP BY
                        fko.id
                    HAVING
                        COUNT(fke.fkoid) > 1
                    ORDER BY
                        fko.anzahl DESC
                    LIMIT
                        0, ?
                `;

                res = await db.query(sql, values);

                for (const row of res) {
                    row["filterLink"] = "/" + kategorie.data.kategorieURL + "/" + row["url"];
                    row["titleShow"] = row["title"] ? row["title"] : kategorie.data.kategorieName + " " + row["anzeige"];

                    ret.push(row);

                    if (ret.length == PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN) {
                        break;
                    }
                }
            }

            this.matchedKombiFilter = ret;
        }

        return this.matchedKombiFilter;
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
