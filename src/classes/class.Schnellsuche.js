const { SITE_IMG_GOOGLE } = require("../constants/globals");
const { db } = require("../db/db-connection");
const { microtime, htmlEntities, manURLEncode, mb_substr_replace, replaceArray, reset } = require("../utils/functions.inc");
const Suchen = require("./class.Suchen");

class Schnellsuche {
    suchwort = "";

    suche = null;

    checkAbort = true;

    startTime = 0;

    constructor(suchWort) {
        this.startTime = microtime(true);

        this.suchwort = suchWort;

        this.suche = new Suchen(this.suchwort, "", 1);
    }

    sucheKategorien = async () => {
        this.suche.setDataTable("kategorie");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                kategorieName title, CONCAT('/', kategorieURL, '/') url
            FROM
                kategorien
            WHERE
                id IN(?)
            ORDER BY
                kategorieName ASC
        `;

        let res = await db.query(sql, [erg]);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            sql = `
                SELECT
                    id
                FROM
                    kategorien
                WHERE
                    id IN(?) AND
                    LOWER(kategorieName) = ?
            `;

            res = db.query(sql, [erg, this.suchwort]);

            var id = 0;
            if (res.length == 1) {
                id = res[0]["id"];
            }
        } else {
            if (erg.length) var id = erg[0];
            else var id = 0;
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                kategorieID = ?
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [parseInt(id)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheFilterHersteller = async () => {
        this.suche.setDataTable("filterhersteller");

        let erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                CONCAT('/', k.kategorieURL, '/', h.URLSTRUKTUR, '/') url, CONCAT(h.HERSTELLERNAME, ' ', k.kategorieName) title
            FROM
                filter_hersteller fh
            LEFT JOIN
                hersteller h ON(h.id = fh.herstellerID)
            LEFT JOIN
                kategorien k ON(fh.kategorieID = k.id)
            WHERE
                fh.id IN(?)
            ORDER BY
                fh.anzahl DESC,
                h.HERSTELLERNAME ASC,
                k.kategorieName ASC
        `;

        let res = await db.query(sql, erg);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            var id = 0;
        } else {
            var id = reset(erg);
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                kategorieID, herstellerID
                FROM
                filter_hersteller
            WHERE
                id = ?
        `;

        res = await db.query(sql, parseInt(id));

        const row = res[0];

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                herstellerID = ? AND
                kategorieID = ?
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [parseInt(row["herstellerID"]), parseInt(row["kategorieID"])]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheHersteller = async () => {
        this.suche.setDataTable("hersteller");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                HERSTELLERNAME title, CONCAT('/de/man/', IF(STRCMP(URLSTRUKTUR, ''), URLSTRUKTUR, HERSTELLERNAME), '.html') url
            FROM
                hersteller
            WHERE
                id IN(".implode(?)
            ORDER BY
                anzahl DESC,
                HERSTELLERNAME ASC
        `;

        let res = await db.query(sql, [erg]);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            sql = `
                SELECT
                    id
                FROM
                    hersteller
                WHERE
                    id IN(?) AND
                    LOWER(HERSTELLERNAME) = ?
            `;

            res = await db.query(sql, [erg, this.suchwort]);

            let id = 0;
            if (res.length == 1) {
                id = res[0]["id"];
            }
        } else {
            id = reset(erg);
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                herstellerID = ?
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [parseInt(id)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheFilter = async () => {
        this.suche.setDataTable("filter");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                CONCAT('/', k.kategorieURL, '/', IFNULL(fn.filterURL, fn.url)) url,
                IF(STRCMP(fn.title, ''), fn.title, CONCAT(k.kategorieName, ' ', IF(fn.anzeigeKategorie OR fk.anzeigeKategorie, CONCAT(fk.name, ': '), ''), fn.anzeige)) title
            FROM
                filter_namen fn
            LEFT JOIN
                filter_kategorien fk ON(fk.id = fn.fkid)
            LEFT JOIN
                kategorien k ON(fk.kategorieID = k.id)
            WHERE
                fn.id IN(?)
            ORDER BY
                fn.anzahl DESC,
                IF(fk.sort <> 0, fk.sort, 999) ASC,
                fk.name ASC,
                IF(fn.sort <> 0, fn.sort, 999) ASC,
                fn.anzeige ASC
        `;

        let res = await db.query(sql, [erg]);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            sql = `
                SELECT
                    id
                FROM
                    filter_namen
                WHERE
                    id IN(?) AND
                    (
                    LOWER(anzeige) = ? OR
                    LOWER(title) = ?
                    )
            `;

            res = await db.query(sql, [erg, this.suchwort, this.suchwort]);

            var id = 0;
            if (res.length == 1) {
                id = res[0]["id"];
            }
        } else {
            var id = reset(erg);
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                produktID
                FROM
                filterid2pid
            WHERE
                fid = ?
        `;

        res = await db.query(sql, [parseInt(id)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        let fids = [];
        for (const row of res) {
            fids.push(row["produktID"]);
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                produktID IN(?)
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [fids]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheFilterkombi = async () => {
        this.suche.setDataTable("filterkombi");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                CONCAT('/', k.kategorieURL, '/',
                GROUP_CONCAT(IFNULL(fn.filterURL, fn.url) ORDER BY
                IF(fk.sort <> 0, fk.sort, 999) ASC,
                fk.name ASC,
                IF(fn.sort <> 0, fn.sort, 999) ASC,
                fn.anzeige ASC
                SEPARATOR '-')) url,
                fko.title
            FROM
                filter_namen fn
            LEFT JOIN
                filter_kombinieren_eintraege fke ON(fn.id = fke.fnid)
            LEFT JOIN
                filter_kombinieren fko ON(fko.id = fke.fkoid)
            LEFT JOIN
                kategorien k ON(k.id = fko.kategorieID)
            LEFT JOIN
                filter_kategorien fk ON(fk.id = fn.fkid)
            WHERE
                fko.id IN(?)
            GROUP BY
                k.kategorieURL, fko.title
            ORDER BY
                fko.anzahl DESC,
                fko.title ASC
        `;

        let res = await db.query(sql, [erg]);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            sql = `
                SELECT
                    id
                FROM
                    filter_kombinieren
                WHERE
                    id IN(?) AND
                    LOWER(title) = ?
            `;

            res = await db.query(sql, [erg, this.suchwort]);

            var id = 0;
            if (res.length == 1) {
                id = res[0]["id"];
            }
        } else {
            var id = reset(erg);
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                f2p.produktID, COUNT(f2p.produktID) anz
            FROM
                filterid2pid f2p
            LEFT JOIN
                filter_kombinieren_eintraege fke ON(fke.fnid = f2p.fid)
            WHERE
                fke.fkoid = ?
            GROUP BY
                f2p.produktID
            HAVING
                anz = (
                    SELECT
                        COUNT(fkoid)
                    FROM
                        filter_kombinieren_eintraege
                    WHERE
                        fkoid = ?
                )
        `;

        res = await db.query(sql, [parseInt(id), parseInt(id)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        let fids = [];
        for (const row of res) {
            fids.push(row["produktID"]);
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                produktID IN(?)
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [fids]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheHerstellerfilter = async () => {
        this.suche.setDataTable("herstellerfilter");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let sql = `
            SELECT
                CONCAT('/', k.kategorieURL, '/', h.URLSTRUKTUR, '/', IFNULL(fn.filterURL, fn.url)) url,
                CONCAT(h.HERSTELLERNAME, ' ', IF(STRCMP(fn.title, ''), fn.title, CONCAT(k.kategorieName, ' ', IF(fn.anzeigeKategorie OR fk.anzeigeKategorie, CONCAT(fk.name, ': '), ''), fn.anzeige))) title
            FROM
                filter2hersteller_anzahl f2h
            LEFT JOIN
                hersteller h ON(h.id = f2h.herstellerID)
            LEFT JOIN
                filter_namen fn ON(fn.id = f2h.filterID)
            LEFT JOIN
                filter_kategorien fk ON(fk.id = fn.fkid)
            LEFT JOIN
                kategorien k ON(fk.kategorieID = k.id)
            WHERE
                f2h.id IN(?)
            ORDER BY
                f2h.anzahl DESC,
                h.HERSTELLERNAME ASC,
                fn.title ASC,
                fn.anzeige ASC,
                k.kategorieName ASC
        `;

        let res = await db.query(sql, [erg]);

        const dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            var id = 0;
        } else {
            var id = reset(erg);
        }

        if (!id) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                f2h.filterID, f2h.herstellerID,
                f2p.produktID
            FROM
                filter2hersteller_anzahl f2h
            LEFT JOIN
                filterid2pid f2p ON(f2h.filterID = f2p.fid)
            WHERE
                id = ?
        `;

        res = await db.query(sql, [parseInt(id)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        let fids = [];
        let herstellerID;
        for (const row of res) {
            fids.push(row["produktID"]);
            herstellerID = row["herstellerID"];
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte
            FROM
                pname2pid_angebote
            WHERE
                herstellerID = ? AND
                produktID IN(?)
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [parseInt(herstellerID), pids]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheSerien = async () => {
        this.suche.setDataTable("serie");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        let dataRight = [];
        let sql = `
            SELECT
                titel title, CONCAT('/serien/', id, '-') url, titel url2
            FROM
                produktserien
            WHERE
                id IN(?)
            ORDER BY
                id DESC
        `;

        let res = await db.query(sql, [erg]);

        dataRight = this.makeDataRight(res);

        if (erg.length > 1) {
            sql = `
                SELECT
                    id
                FROM
                    produktserien
                WHERE
                    id IN(?) AND
                    LOWER(titel) = ?
            `;

            res = await db.query(sql, [erg, this.suchwort]);

            var id1 = 0;
            if (res.length == 1) {
                id1 = res[0]["id"];
            }
        } else {
            var id1 = reset(erg);
        }

        if (!id1) {
            return {
                right: dataRight,
            };
        }

        sql = `
            SELECT
                pa.produktID, pa.kategorieID, pa.anzAngebote, pa.preis, pa.punkte, pa.sortPos
            FROM
                pname2pid_angebote pa
            LEFT JOIN
                produkte2serien p2s ON(p2s.pid = pa.produktID)
            WHERE
                p2s.serienID = ?
            ORDER BY
                pa.punkte DESC,
                pa.sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [parseInt(id1)]);

        if (!res.length) {
            return {
                right: dataRight,
            };
        }

        const ret = {
            left: this.makeData(res),
            right: dataRight,
        };

        return ret;
    };

    sucheProdukte = async () => {
        this.suche.setDataTable("pname");

        const erg = this.suche.suchen();

        if (!erg.length) {
            return [];
        }

        sql = `
            SELECT
                produktID, kategorieID, anzAngebote, preis, punkte, sortPos
            FROM
                pname2pid_angebote
            WHERE
                produktID IN (?)
            ORDER BY
                punkte DESC,
                sortPos ASC
            LIMIT
                0, 8
        `;

        res = await db.query(sql, [erg]);

        if (!res.length) {
            return [];
        }

        const ret = {
            left: this.makeData(res),
        };

        return ret;
    };

    saveSuchanfrage = () => {
        const endTime = microtime(true);
        
        const dauer = endTime - this.startTime;
        
        const sql = `
            INSERT INTO
                schnellsuche_anfragen
            SET
                suchanfrage = ?,
                zeit = NOW(),
                dauer = ?
        `;
        
        db.query(sql, [this.suchwort, dauer]);
      }

    makeDataRight = (res) => {
        let ret = [];
        for (const row of res) {
            title = this.ersetze(row["title"], this.suche.getSuchWoerter());
            ret.push({
                show: htmlEntities(title),
                link: row["url"] + (row["url2"] ? manURLEncode(row["url2"]) : ""),
            });
        }

        return ret;
    };

    makeData = async (resF) => {
        let pids = [];
        let kids = [];
        let erg = [];

        for (const row of resF) {
            pids.push(row["produktID"]);
            kids.push(row["kategorieID"]);
            erg.push(row);
        }

        let bilder = {};
        let produkte = {};

        let sql = `
            SELECT
                produktID, pfad
            FROM
                produktbilder
            WHERE
                produktID IN(?) AND
                pos = 1 AND
                groesse = 'S'
        `;

        let res = await db.query(sql, [pids]);

        for (const row of res) {
            bilder[row["produktID"]] = row["pfad"];
        }

        sql = `
            SELECT
                id, PNAME, PURL, SCORE, TESTS, IMG
            FROM
                pname2pid_mapping
            WHERE
                id IN(?)
        `;

        res = await db.query(sql, [pids]);

        for (const row of res) {
            produkte[row["id"]] = row;
        }

        kategorien = {};
        if (kids.length) {
            sql = `
                SELECT
                    id, kategorieName, kategorieURL
                FROM
                    kategorien
                WHERE
                    id IN(?)
            `;

            res = await db.query(sql, [kids]);

            for (const row of res) {
                kategorien[row["id"]] = row;
            }
        }

        let ret = [];
        for (const row of erg) {
            if (!produkte[row["produktID"]]) {
                continue;
            }
            const pname = this.ersetze(produkte[row["produktID"]]["PNAME"], this.suche.getSuchWoerter());
            if (bilder[row["produktID"]]) {
                row["IMG"] = SITE_IMG_GOOGLE + bilder[row["produktID"]];
            } else {
                row["IMG"] = SITE_IMG_GOOGLE + "/no-image.svg";
            }

            ret.push({
                produktID: "1-".row["produktID"],
                show: htmlEntities(pname),
                produktName: produkte[row["produktID"]]["PNAME"],
                kategorieName: kategorien[row["kategorieID"]]["kategorieName"],
                anzahlTests: parseInt(produkte[row["produktID"]]["TESTS"]),
                score: parseInt(produkte[row["produktID"]]["SCORE"]),
                link: "/product/" + produkte[row["produktID"]]["PURL"],
                preis: row["preis"],
                bild: row["IMG"],
            });
        }

        return ret;
    };

    ersetze = (ausgangsWort, woerter) => {
        let ret = ausgangsWort;
        let laengeErsetze = null;

        woerter.forEach((wort) => {
            let start = ret.indexOf("###");
            if (start !== -1) {
                laengeErsetze = null;
                do {
                    if (start == 0 || laengeErsetze) {
                        var startErsetze = ret.indexOf("###", start + 3) + 3;
                    } else {
                        var startErsetze = 0;
                    }

                    laengeErsetze = ret.indexOf("###", startErsetze);
                    if (laengeErsetze === -1) {
                        laengeErsetze = ret.length;
                    }
                    laengeErsetze -= startErsetze;

                    let ersetzString = ret.substring(startErsetze, startErsetze + laengeErsetze);
                    let erg = this.ersetzeWorte(ersetzString, wort);
                    ret = mb_substr_replace(ret, erg, startErsetze, laengeErsetze);

                    start = ret.indexOf("###", startErsetze + erg.length);
                } while (start !== -1);
            } else {
                ret = this.ersetzeWorte(ret, wort);
            }
        });

        return ret;
    };

    getWort = (zk, wort) => {
        let start = 0;
        let laenge = wort.length;
        if (!laenge) {
            return [];
        }
        let ret = [];
        const pos = zk.toLowerCase().indexOf(wort.toLowerCase(), start);
        while (pos > -1) {
            ret.push(zk.substring(pos, pos + laenge));
            start = pos + laenge;
        }

        ret = ret.filter((value, index, self) => {
            return self.indexOf(value) === index;
        });

        return ret;
    };

    ersetzeWorte = (ret, wort) => {
        const origWorte = this.getWort(ret, wort);
        let ersetzWorte = [];

        origWorte.forEach((origWort) => {
            ersetzWorte.push("###" + origWort + "###");
        });

        ret = replaceArray(ret, origWorte, ersetzWorte);

        return ret;
    };

    saveSuchanfrage = async () => {
        const endTime = microtime(true);

        const dauer = endTime - this.startTime;

        const sql = `
            INSERT INTO
                schnellsuche_anfragen
            SET
                suchanfrage = ?,
                zeit = NOW(),
                dauer = ?
        `;

        await db.query(sql, [this.suchwort, dauer]);
    };
}

module.exports = Schnellsuche;
