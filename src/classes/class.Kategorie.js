const Produkt = require("./class.Produkt");
const Strings = require("./class.Strings");

const db = require("./../db/db-connection");

const { ANZAHL_TESTREIHEN_KATEGORIE } = require("../constants/globals");
const { stripHtmlTags } = require("../utils/functions.inc");

class Kategorie {
    identifier = "";
    typ = "";
    data = [];
    parent = null;
    topProducts = null;
    tree = null;
    breadCrumb = null;
    hersteller = null;
    tester = null;
    testreihen = null;
    filterKombinationen = null;
    hkFilter = null;
    childs = null;
    isLoad = false;
    isLeaf = false;

    katTree = [];
    sitemap = [];

    static menueData = {};

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ;
    }

    get getIsLoad() {
        return this.isLoad;
    }

    get getIsLeaf() {
        return this.isLeaf;
    }

    load = async () => {
        let where = "";
        let values = [];

        switch (this.typ) {
            case "url":
                where = " k.kategorieURL = ? ";
                values = [this.identifier];
                break;

            case "id":
                where = " k.id = ? ";
                values = [parseInt(this.identifier)];
                break;

            default:
                break;
        }

        if (!where) {
            return;
        }

        console.log("where", where)
        let sql = `
                    SELECT
                        k.id, k.parentID, k.lft, k.rgt, k.kategorieURL, k.kategorieName, k.kategorieNameSingular, k.kategorieNamePlural, k.kategorieBild, k.noIndex, k.catNoIndex, k.amazonIDs,
                        k.nischenkategorie, k.datenblatt, k.CATDESCTOP, k.CATDESCBOTTOM, k.anzeigeTbCom, k.showKategorie, k.author,
                        COUNT(p.produktID) anzahlProdukte
                    FROM
                        kategorien k
                    LEFT JOIN
                        pname2pid_show p ON(p.kategorieID = k.id)
                    WHERE
                        ${where}
                    GROUP BY
                        k.id
                `;

        let res = await db.query(sql, values);

        if (!res.length) {
            return false;
        }

        let row = res[0];

        row["id"] = parseInt(row["id"]);
        row["parentID"] = parseInt(row["parentID"]);
        row["lft"] = parseInt(row["lft"]);
        row["rgt"] = parseInt(row["rgt"]);
        row["noIndex"] = Boolean(row["noIndex"]);
        row["catNoIndex"] = Boolean(row["catNoIndex"]);
        row["catNoIndex"] = Boolean(row["catNoIndex"]);
        row["nischenkategorie"] = Boolean(row["nischenkategorie"]);
        row["datenblatt"] = Boolean(row["datenblatt"]);
        row["anzeigeTbCom"] = Boolean(row["anzeigeTbCom"]);
        row["showKategorie"] = Boolean(row["showKategorie"]);
        row["anzahlProdukte"] = parseInt(row["anzahlProdukte"]);

        if (!row["kategorieNameSingular"]) {
            row["kategorieNameSingular"] = row["kategorieName"];
        }

        if (!row["kategorieNamePlural"]) {
            row["kategorieNamePlural"] = row["kategorieName"];
        }

        this.data = row;

        sql = `
            SELECT
                id, ueberschrift, kategorieText, glossar, insertDate
            FROM
                kategorietexte
            WHERE
                kategorieID = ?
            ORDER BY
                sort ASC
        `;

        res = await db.query(sql, [this.data["id"]]);

        let kategorietext = [];
        let glossar = [];
        let insertDate = "";

        for (const row of res) {
            if (row["glossar"]) {
                glossar.push(row);
            } else {
                kategorietext.push(row);
            }

            if (!insertDate) {
                insertDate = row["insertDate"];
            }
        }

        this.data["kategorieTextPublished"] = insertDate;
        this.data["kategorieText"] = kategorietext;
        this.data["glossar"] = glossar;

        this.isLeaf = this.data["lft"] + 1 === this.data["rgt"];

        this.isLoad = true;

        return res;
    };

    getTopProducts = async () => {
        if (this.data.nischenkategorie) {
            return [];
        }

        if (this.topProducts === null) {
            const sql = `
                SELECT
                    produktID, anzAngebote, preis, preisHoch
                FROM
                    pname2pid_angebote pa
                WHERE
                    kategorieID = ? AND
                    sortPos < 20 AND
                    noIndex = 0
                ORDER BY    
                    sortPos ASC
                LIMIT
                    0, 5
            `;

            const res = await db.query(sql, [this.data.id]);

            let ret = [];

            await Promise.all(
                res.map(async (row) => {
                    const prd = await Produkt.getByID(row["produktID"]);

                    if (prd.data.noIndex === 1) {
                        return;
                    }

                    const row2 = {
                        ID: prd.data.id,
                        PNAME: prd.data.produktName,
                        PURL: prd.data.produktURL,
                        IMG: prd.data.bilder[0]["D"]["url"],
                        imgE: prd.data.bilder[0]["E"]["url"],
                        imgL: prd.data.bilder[0]["L"]["url"],
                        imgBreiteD: prd.data.bilder[0]["D"]["breite"],
                        imgBreiteE: prd.data.bilder[0]["E"]["breite"],
                        imgBreiteL: prd.data.bilder[0]["L"]["breite"],
                        kategorieURL: this.kategorieURL,
                        link: "/produkte/" + prd.data.produktURL,
                        TESTS: prd.data.TESTS,
                        SCORE: prd.data.SCORE,
                        anzMeinungen: prd.data.anzMeinungen,
                        MEINUNGENSCORE: prd.data.MEINUNGENSCORE,
                        meinungenStars: prd.data.meinungenStars,
                        angebote: prd.data.anzAngebote,
                        preis: prd.data.preis
                            ? prd.data.preis.toLocaleString("en-IN", {
                                  maximumSignificantDigits: 3,
                              })
                            : "",
                        punkte: prd.data.punkte,
                        noIndex2: prd.data.noIndex2,
                    };

                    row = { ...row, ...row2 };

                    ret.push(row);
                })
            );

            this.topProducts = ret;
        }

        return this.topProducts;
    };

    getTestreihen = async () => {
        if (this.testreihen === null) {
            const sql = `
                SELECT
                    tr.id, tr.ueberschrift, tr.beschreibung, tr.eigeneBeschreibung, tr.ausgabe,
                    tt.testerURL, tt.logoFormat, tt.testerName
                FROM
                    tester_testreihen tr
                LEFT JOIN
                    tester tt ON(tr.testerID = tt.id)
                LEFT JOIN
                    tests t ON(t.testreiheID = tr.id)
                LEFT JOIN
                    pname2pid_mapping p ON(p.ID = t.produktID)
                WHERE
                    tr.aktiv = 1 AND
                    p.kategorieID = ?
                GROUP BY
                    tr.id
                ORDER BY
                    t.TESTID DESC
                LIMIT
                    0, ?
            `;

            const res = await db.query(sql, [this.data.id, ANZAHL_TESTREIHEN_KATEGORIE]);

            let ret = [];
            for (const row of res) {
                if (row["eigeneBeschreibung"]) {
                    var desc = row["eigeneBeschreibung"];
                } else {
                    var desc = row["beschreibung"];
                }

                desc = stripHtmlTags(desc);

                ret.push({
                    id: row["id"],
                    title: row["ueberschrift"],
                    desc: desc,
                    descKurz: Strings.dataSnippet(desc, 30),
                    ausgabe: row["ausgabe"],
                    testerName: row["testerName"],
                    testerUrl: row["testerURL"],
                    testerBild: `${row["testerURL"]}.${row["logoFormat"]}`,
                    testreiheURL: `${row["testerURL"]}-${row["id"]}`,
                });
            }

            this.testreihen = ret;
        }

        return this.testreihen;
    };

    getFilterKombinationen = async () => {
        if (this.filterKombinationen === null) {
            const sql = `
                SELECT
                    fko.title, fko.anzahl,
                    GROUP_CONCAT(fn.url ORDER BY
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
                WHERE
                    fk.kategorieID = ? AND
                    fko.aktiv = 1 AND
                    fko.noIndex = 0 AND
                    fko.anzahl > 0
                GROUP BY
                    fko.id
                ORDER BY
                    fko.anzahl DESC
            `;

            const res = await db.query(sql, [this.data.id]);

            let ret = [];

            res.forEach((row) => {
                row["filterLink"] = "/" + this.kategorieURL + "/" + row["url"];
                row["titleShow"] = row["title"] ? row["title"] : this.kategorieName + " " + row["anzeige"];

                ret.push(row);
            });

            this.filterKombinationen = ret;
        }

        return this.filterKombinationen;
    };

    getChilds = async () => {
        if (this.childs === null) {
            let sql = `
                SELECT
                    k.id, k.parentID, k.kategorieURL, k.kategorieName, k.kategorieBild, IF(k.lft+1 <> k.rgt, 0, 1) isLeaf, k.lft, k.rgt, k.nischenkategorie, k.anzeigeKat, k.noIndex, k.catNoIndex,
                    COUNT(ps.produktID) anzProdukte
                FROM
                    kategorien k
                LEFT JOIN
                    pname2pid_show ps ON(ps.kategorieID = k.id)
                WHERE
                    k.lft > ? AND
                    k.rgt < ? AND
                    k.showKategorie = 1
                GROUP BY
                    k.id
                ORDER BY
                    k.lft ASC
            `;

            let res = await db.query(sql, [this.data.lft, this.data.rgt]);

            let childs = [];
            let parent = 0;

            for (const row of res) {
                if (row["parentID"] === this.data.id) {
                    row["childs"] = [];
                    row["kategorieBildE"] = row["kategorieBild"].replace("/S", "/E");
                    row["topProductsKats"] = row["anzeigeKat"];
                    row["link"] = "/" + row["kategorieURL"] + "/";
                    row["isLeaf"] = row["isLeaf"] === 1;
                    row["catNoIndex"] = row["catNoIndex"] === 1;

                    childs.push({
                        [row["id"]]: row,
                    });

                    parent = row["id"];
                } else if (parent === row["parentID"]) {
                    for (let i = 0; i < childs.length; i++) {
                        if (parent in childs[i]) {
                            childs[i][parent].childs.push({
                                kategorieName: row["kategorieName"],
                                title: row["kategorieName"],
                                kategorieURL: row["kategorieURL"],
                                kategorieBild: row["kategorieBild"],
                                kategorieBildE: row["kategorieBild"].replace("/S", "/E"),
                                link: "/" + row["kategorieURL"] + "/",
                                isLeaf: row["isLeaf"] === 1,
                                catNoIndex: row["catNoIndex"],
                                noIndex: row["noIndex"],
                                anzProdukte: row["anzProdukte"],
                                isNoIndex: row["catNoIndex"] || (row["isLeaf"] === 1 && row["anzProdukte"] < 15),
                            });
                        }
                    }
                }
            }

            this.childs = childs;
        }

        return this.childs;
    };

    static getByID = async (id) => {
        const obj = new Kategorie(id);

        await obj.load();

        return obj;
    };

    static getCompleteTreeRekursive = async (zweig = [], hk = 0) => {
        if (hk === 0) this.menueData = await this.getCompleteTree();

        if (!zweig.length) {
            zweig = this.menueData["s"][1];
        }

        let kats = {};
        zweig.forEach(async (v) => {
            if (!kats[hk]) kats[hk] = {};
            kats[hk][v] = this.menueData["k"][v];
            if (this.menueData["s"][v] && this.menueData["s"][v].length) {
                const ret = await this.getCompleteTreeRekursive(this.menueData["s"][v], v);
                kats[hk][v]["childs"] = ret[v];
            }
        });

        return kats;
    };

    static getCompleteTree = async () => {
        let katTree = new Kategorie().katTree;
        if (katTree.length) {
            return katTree;
        }

        const sql = `
            SELECT
                id, parentID, lft, rgt, kategorieURL, kategorieName, kategorieBild, catNoIndex, showStartseite, IF(lft+1 <> rgt, 0, 1) isLeaf
            FROM
                kategorien
            WHERE
                catNoIndex = 0 AND
                showKategorie = 1
            ORDER BY
                lft ASC
        `;

        const res = await db.query(sql);

        let kats = {};
        let struktur = {};

        res.forEach((row) => {
            row["id"] = parseInt(row["id"]);
            row["parentID"] = parseInt(row["parentID"]);
            row["lft"] = parseInt(row["lft"]);
            row["rgt"] = parseInt(row["rgt"]);
            row["catNoIndex"] = Boolean(row["catNoIndex"]);
            row["showStartseite"] = Boolean(row["showStartseite"]);
            row["isLeaf"] = Boolean(row["isLeaf"]);
            row["kategorieLink"] = `/${row["kategorieURL"]}/`;

            kats[row["id"]] = row;

            if (!struktur[row["parentID"]]) {
                struktur[row["parentID"]] = [];
            }

            struktur[row["parentID"]].push(row["id"]);
        });

        katTree = {
            k: kats,
            s: struktur,
        };

        return katTree;
    };

    static getByURL = async (cname) => {
        const obj = new Kategorie(cname, "url");

        await obj.load();

        return obj;
    };
}

module.exports = Kategorie;
