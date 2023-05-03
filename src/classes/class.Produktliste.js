const Kategorie = require("./class.Kategorie");
const Hersteller = require("./class.Hersteller");
const Datenblatt = require("./class.Datenblatt");
const Strings = require("./class.Strings");

const { FILTER_INDEX_MAX, ANZAHL_FILTER_AUFGEKLAPPT, DB_REPLACE, SITE_IMG_GOOGLE } = require("../constants/globals");

const db = require("../db/db-connection");
const { numberFormat, stripHtmlTags, arraysEqual } = require("../utils/functions.inc");

class Produktliste {
    kategorieURL = "";
    herstellerURL = "";
    filter = [];
    sonderFilter = "";
    sortierung = "";
    data = {};
    breadCrumb = null;
    aktiveFilter = [];
    filterKombi = false;
    filterNoIndex = false;
    filterListe = null;
    noIndexCount = 0;

    static sitemap = [];
    kategorie = null;
    hersteller = null;

    min = 0;
    max = Number.MAX_SAFE_INTEGER;
    minMaxFlag = false;

    sliderMin = 0;
    sliderMax = 0;

    constructor(
        kategorie = null,
        herstellerURL = "",
        filter = [],
        minMaxFlag = false,
        min = 0,
        max = Number.MAX_SAFE_INTEGER,
        sonderFilter = "",
        sortierung = ""
    ) {
        filter.forEach((element) => {
            if (!this.filter.includes(element)) this.filter.push(element.toString());
        });

        if (typeof kategorie == "object") this.kategorieURL = kategorie.data.kategorieURL.toString();
        else this.kategorieURL = "";
        this.herstellerURL = herstellerURL.toString();
        this.sonderFilter = sonderFilter.toString();
        this.sortierung = sortierung.toString();
        this.kategorie = kategorie;
        this.min = min;
        this.max = max;
        this.minMaxFlag = minMaxFlag;
    }

    load = async () => {
        let produktList;

        if (this.kategorieURL) {
            produktList = await this.loadFromKategorie();
        } else if (this.herstellerURL) {
            produktList = await this.loadFromHersteller();
        }

        this.data["produktList"] = produktList;
        console.log("produktList", this.kategorieURL)
        // console.log("key", this.produkte["2553828"])

        return this.data;
    };

    multipleLoad = async (kategorie) => {
        if (typeof kategorie == "object") this.kategorieURL = kategorie.data.kategorieURL.toString();
        else this.kategorieURL = "";

        this.kategorie = kategorie;

        let produktList;
        if (this.kategorieURL) {
            produktList = await this.loadFromKategorie();
        } else if (this.herstellerURL) {
            produktList = await this.loadFromHersteller();
        }

        if (this.data.produktList) this.data["produktList"] = this.data["produktList"].concat(produktList);
        else this.data.produktList = produktList;
    };

    loadFromKategorie = async () => {
        let select = "";
        let join = "";
        let order = "";
        let joinProdukt = false;

        let where = ` AND ps.kategorieID = ? `;
        let values = [parseInt(this.kategorie.data.id)];

        if (this.herstellerURL) {
            await Promise.all(
                this.herstellerURL.split("_").map(async (hersteller) => {
                    this.hersteller = await Hersteller.getByURL(hersteller);

                    if (this.hersteller.data) {
                        if (!where.includes("p.herstellerID =")) where += ` AND (p.herstellerID = ? `;
                        else where += ` OR p.herstellerID = ? `;
                        values.push(parseInt(this.hersteller.data.id));
                    }
                })
            );

            where += ")";

            joinProdukt = true;
            join += " LEFT JOIN pname2pid_mapping p ON(ps.produktID = p.id) ";
        }

        if (this.sonderFilter == "testsieger") {
            where += " AND p.TESTSIEGER > 0 ";

            if (!joinProdukt) {
                join += " LEFT JOIN pname2pid_mapping p ON(ps.produktID = p.id) ";
            }
        }

        if (this.filter.length) {
            let filterPIDs = await this.getFilterPIDs();

            if (!filterPIDs.length) {
                filterPIDs.push(0);
            }

            where += ` AND ps.produktID IN(?) `;
            values.push(filterPIDs);
        }

        switch (this.sortierung) {
            case "neueTests":
                order += " maxTests DESC, ";
                select += " , MAX(t.TESTID) maxTests ";
                join += " LEFT JOIN tests t ON(t.produktID = ps.produktID) ";
                break;

            case "preisA":
                order += " IFNULL(pa.preis, 9999999999.99) ASC, ";
                join += " LEFT JOIN pname2pid_angebote pa ON(pa.produktID = ps.produktID) ";
                break;

            case "preisD":
                order += " pa.preis DESC, ";
                join += " LEFT JOIN pname2pid_angebote pa ON(pa.produktID = ps.produktID) ";
                break;

            case "angD":
                order += " pa.anzAngebote DESC, ";
                join += " LEFT JOIN pname2pid_angebote pa ON(pa.produktID = ps.produktID) ";
                break;
        }

        let sql = `
            SELECT
                MIN(pa.preis) min, MAX(pa.preisHoch) max
            FROM
                pname2pid_show ps
                ${join}
            LEFT JOIN
                pname2pid_angebote pa ON(pa.produktID = ps.produktID) 
            WHERE
                ps.sortPos > 0
                ${where}
        `;

        let res = await db.query(sql, values);

        if (res.length) {
            this.sliderMin = parseFloat(res[0].min);
            this.sliderMax = parseFloat(res[0].max);
        } else {
            this.sliderMin = 0;
            this.sliderMax = 0;
        }

        if (this.minMaxFlag) {
            if (!join.includes("pname2pid_angebote")) join += " LEFT JOIN pname2pid_angebote pae ON(pae.produktID = ps.produktID) ";
            where += " AND pae.preis >= ? AND pae.preisHoch <= ? ";
            values.push(this.min);
            values.push(this.max);
        }

        sql = `
            SELECT
                ps.produktID, ps.noIndex2
                ${select}
            FROM
                pname2pid_show ps
                ${join}
            WHERE
                ps.sortPos > 0
                ${where}
            GROUP BY
                ps.produktID
            ORDER BY
                ${order}
                ps.sortPos ASC
        `;

        res = await db.query(sql, values);

        let produktList = [];
        let noIndexCount = 0;

        for (const row of res) {
            produktList.push({
                produktID: row["produktID"],
            });

            if (row["noIndex2"]) noIndexCount++;
        }

        this.noIndexCount = noIndexCount;

        return produktList;
    };

    loadFromHersteller = async () => {
        let where = "";
        let values = [];

        await Promise.all(
            this.herstellerURL.split("-").map(async (hersteller) => {
                this.hersteller = await Hersteller.getByURL(hersteller);

                if (this.hersteller.data) {
                    if (!where.includes("p.herstellerID =")) where += ` AND (p.herstellerID = ? `;
                    else where += ` OR p.herstellerID = ? `;
                    values.push(parseInt(this.hersteller.data.id));
                }
            })
        );

        where += ")";

        let sql = `
            SELECT
                MIN(pa.preis) min, MAX(pa.preisHoch) max
            FROM
                pname2pid_show p
            LEFT JOIN
                pname2pid_angebote pa ON(pa.produktID = p.produktID) 
            WHERE
                p.sortPos > 0
                ${where}
        `;

        let res = await db.query(sql, values);

        if (res.length) {
            this.sliderMin = parseFloat(res[0].min);
            this.sliderMax = parseFloat(res[0].max);
        } else {
            this.sliderMin = 0;
            this.sliderMaxn = 0;
        }

        if (this.minMaxFlag) {
            where += " AND pa.preis >= ? AND pa.preisHoch <= ? ";
            values.push(this.min);
            values.push(this.max);
        }

        sql = `
            SELECT
                p.produktID, p.noIndex2,
                pa.sortPos, pa.punkte
            FROM
                pname2pid_show p
            LEFT JOIN
                pname2pid_angebote pa ON(pa.produktID = p.produktID)
            LEFT JOIN
                kategorien k ON(p.kategorieID = k.id)
            WHERE
                k.showKategorie = 1
                ${where}
        `;

        res = await db.query(sql, values);

        let produktList = [];
        let noIndexCount = 0;

        for (const row of res) {
            produktList.push({
                produktID: row["produktID"],
                sortPos: row["sortPos"],
                punkte: row["punkte"],
            });

            if (row["noIndex2"]) noIndexCount++;
        }

        produktList.sort((a, b) => {
            if (a.punkte < b.punkte) {
                return -1;
            }
            if (a.punkte > b.punkte) {
                return 1;
            }
            return 0;
        });

        this.noIndexCount = noIndexCount;

        return produktList;
    };

    checkFilter = async () => {
        if (!this.aktiveFilter.length) {
            let filterNoIndex = false;
            let aktiveFilter = [];
            let filterKombi = false;

            if (this.filter.length) {
                if (this.filter.length > FILTER_INDEX_MAX) {
                    filterNoIndex = true;
                }

                let sql = `
                    SELECT
                        fn.url, fn.filterURL, fn.anzeige, fn.noIndex fnNoIndex, fn.anzeigeKategorie fnAnzeigeKategorie, fn.title, fn.description, fn.video, fn.bild,
                        fk.id fkid, fk.name, fk.noIndex fkNoIndex, fk.anzeigeKategorie fkAnzeigeKategorie
                    FROM
                        filter_kategorien fk
                    LEFT JOIN
                        filter_namen fn ON(fn.fkid = fk.id)
                    WHERE
                        fk.kategorieID = ? AND
                        (
                        fn.url IN(?) OR
                        fn.filterURL IN(?)
                        ) AND
                        fn.anzeigen = 1 AND
                        fk.anzeigen = 1
                    ORDER BY
                        IF(fk.sort <> 0, fk.sort, 999) ASC,
                        fk.name ASC,
                        IF(fn.sort <> 0, fn.sort, 999) ASC,
                        fn.anzeige ASC
                `;

                let res = await db.query(sql, [this.kategorie.data.id, this.filter, this.filter]);

                let tmp = [];
                let fhKat = {};

                for (const row of res) {
                    if (row["filterURL"]) tmp.push(row["filterURL"]);
                    else tmp.push(row["url"]);

                    if (!filterNoIndex && (fhKat[row["fkid"]] || row["fkNoIndex"] || row["fnNoIndex"])) filterNoIndex = true;

                    fhKat[row["fkid"]] = true;

                    aktiveFilter.push(row);
                }

                // if (!arraysEqual(tmp, this.filter)) {
                //     const fURL = `/${this.kategorie.data.kategorieURL}/${this.herstellerURL ? this.herstellerURL : ""}${tmp.length ? tmp.join("-") : ""}`;
                //     return [];
                // }

                if (this.herstellerURL && this.sonderFilter && this.filter.length > 1) {
                    sql = `
                        SELECT
                            fko.title, fko.description, fko.beschreibungText, fko.noIndex,
                            GROUP_CONCAT(fn.url ORDER BY
                            IF(fk.sort <> 0, fk.sort, 999) ASC,
                            fk.name ASC,
                            IF(fn.sort <> 0, fn.sort, 999) ASC,
                            fn.anzeige ASC
                            SEPARATOR '-') url
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
                            fko.aktiv = 1
                        GROUP BY
                            fko.id, fko.title, fko.description, fko.noindex, fko.aktiv
                        HAVING
                            url = '?'
                    `;

                    res = await db.query(sql, [this.kategorie.data.id, tmp.join("-")]);

                    if (res.length) {
                        filterKombi = res[0];
                        if (!filterKombi["noIndex"]) filterNoIndex = false;
                    }
                }
            }

            this.aktiveFilter = aktiveFilter;
            this.filterKombi = filterKombi;
            this.filterNoIndex = filterNoIndex;
        }

        return this.aktiveFilter;
    };

    getFilterKombi = () => {
        return this.filterKombi;
    };

    getFilter = async () => {
        if (!this.kategorieURL && this.herstellerURL) {
            return this.getFilterHersteller();
        }

        return this.getFilterKategorie();
    };

    getFilterHersteller = async () => {
        if (this.filterListe === null) {
            if (this.hersteller === null) this.hersteller = await Hersteller.getByURL(this.herstellerURL);

            const sql = `
                SELECT
                    fh.kategorieID, fh.anzahl,
                    k.kategorieURL, k.kategorieName, k.noIndex
                FROM
                    filter_hersteller fh
                LEFT JOIN
                    kategorien k ON(k.id = fh.kategorieID)
                WHERE
                    fh.herstellerID = ? AND
                    NOT k.kategorieURL IS NULL AND
                    fh.anzahl > 0 AND
                    k.showKategorie = 1
                ORDER BY
                    fh.anzahl DESC
            `;

            const res = await db.query(sql, [this.hersteller.data.id]);

            let f = {};
            let i = 0;

            for (const row of res) {
                i++;
                f[row["kategorieID"]] = {
                    url: row["kategorieURL"],
                    apply: this.kategorieURL.includes(row["kategorieURL"]),
                    name: row["kategorieName"],
                    anzahl: parseInt(row["anzahl"]),
                    noIndex: row["anzahl"] < 15 || row["noIndex"] ? true : false,
                };
            }

            let filterArray = {};
            if (f) {
                filterArray = {
                    name: "Kategorien",
                    filter: f,
                };
            }

            this.filterListe = filterArray;

            return this.filterListe;
        }
    };

    getFilterKategorie = async () => {
        if (this.filterListe === null) {
            let filterKombisIndex = {};

            if (!this.herstellerURL && !this.sonderFilter && this.filter.length) {
                const sql = `
                    SELECT
                        GROUP_CONCAT(IFNULL(fn.filterURL, fn.url) ORDER BY
                        IF(fk.sort <> 0, fk.sort, 999) ASC,
                        fk.name ASC,
                        IF(fn.sort <> 0, fn.sort, 999) ASC,
                        fn.anzeige ASC
                        SEPARATOR '-') url,
                        fn.title
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
                        fko.noIndex = 0
                    GROUP BY
                        fko.id
                `;

                const res = await db.query(sql, [this.kategorie.data.id]);

                for (const row of res) {
                    filterKombisIndex[row["url"]] = row["title"];
                }
            }

            let cHersteller;
            if (this.herstellerURL) {
                if (this.hersteller) cHersteller = this.hersteller;
                else cHersteller = Hersteller.getByURL(this.herstellerURL);
            }

            if (this.filter.length || this.herstellerURL || this.sonderFilter) {
                let where = "";
                let values = [];

                if (this.herstellerURL) {
                    where += ` AND p.herstellerID = ? `;
                    values.push(cHersteller.data.id);
                }
                if (this.sonderFilter == "testsieger") {
                    where += " AND p.isTestsieger = 1 ";
                }

                const sql = `
                    SELECT
                        IFNULL(fn.filterURL, fn.url) url,
                        f2p.produktID,
                        p.herstellerID
                    FROM
                        filterid2pid f2p
                    LEFT JOIN
                        filter_namen fn ON(f2p.fid = fn.id)
                    LEFT JOIN
                        filter_kategorien fk ON(fk.id = fn.fkid)
                    LEFT JOIN
                        pname2pid_show p ON(p.produktID = f2p.produktID)
                    WHERE
                        fk.kategorieID = ? AND
                        p.herstellerID IS NOT NULL
                        ${where}
                `;

                const res = await db.query(sql, [this.kategorie.data.id, ...values]);

                let pidList = {};
                let fArray = {};

                for (const row of res) {
                    fArray[row["url"]] = {
                        [row["produktID"]]: row["herstellerID"],
                    };
                    if (!pidList[row["produktID"]]) {
                        let tmpfilter = {};
                        for (const item of this.filter) {
                            tmpfilter[item] = true;
                        }
                        pidList[row["produktID"]] = tmpfilter;
                    }
                    if (pidList[row["produktID"]][row["url"]]) delete pidList[row["produktID"]][row["url"]];
                }

                var pidGezaehlt = {};
                var pAnzahlMan = {};
                var pAnzahl = {};
                const fAnz = this.filter.length;

                for (const url in fArray) {
                    if (Object.hasOwnProperty.call(fArray, url)) {
                        const v = fArray[url];

                        pAnzahl[url] = 0;

                        for (const pid in v) {
                            if (Object.hasOwnProperty.call(v, pid)) {
                                const man = v[pid];

                                if (this.filter.includes(url)) {
                                    if (!pidGezaehlt[man]) pidGezaehlt[man] = { [pid]: 0 };
                                    else if (!pidGezaehlt[man][pid]) pidGezaehlt[man][pid] = 0;
                                    pidGezaehlt[man][pid]++;
                                }

                                let k = 0;

                                for (const f of this.filter) {
                                    if (url === f) {
                                        break;
                                    }
                                    if (fArray[f] && fArray[f][pid]) {
                                        k++;
                                    }
                                }

                                if (k === fAnz) {
                                    pAnzahl[url]++;
                                }
                            }
                        }
                    }
                }

                for (const k in pAnzahl) {
                    if (Object.hasOwnProperty.call(pAnzahl, k)) {
                        const anz = pAnzahl[k];
                        if (!pAnzahl[k]) delete pAnzahl[k];
                    }
                }

                for (const k in pidGezaehlt) {
                    if (Object.hasOwnProperty.call(pidGezaehlt, k)) {
                        const v = pidGezaehlt[k];

                        for (const k2 in v) {
                            if (Object.hasOwnProperty.call(v, k2)) {
                                const v2 = v[k2];
                                if (v2 < fAnz) delete pidGezaehlt[k][k2];
                            }
                        }
                        if (!pidGezaehlt[k]) delete pidGezaehlt[k];
                    }
                }

                for (const k in pidGezaehlt) {
                    if (Object.hasOwnProperty.call(pidGezaehlt, k)) {
                        const v = pidGezaehlt[k];

                        if (!k) continue;

                        if (v.length === this.getProductCount()) continue;

                        pAnzahlMan[k] = v.length;
                    }
                }

                let tmpPAnzahlMan = {};
                Object.keys(pAnzahlMan)
                    .sort()
                    .forEach((v) => {
                        tmpPAnzahlMan[v] = pAnzahlMan[v];
                    });

                pAnzahlMan = tmpPAnzahlMan;
            }

            let filterArray = {};
            let anzahlFilter;
            let sql;
            let res;

            if ((typeof pAnzahlMan === "undefined" || pAnzahlMan)) {
                if (!this.filter && this.sonderFilter) {
                    let where = "";

                    if (this.sonderFilter === "testsieger") {
                        where += " AND p.TESTSIEGER > 0 AND p.noindex = 0 ";
                    }

                    sql = `
                        SELECT
                            h.id, h.HERSTELLERNAME, h.URLSTRUKTUR,
                            p.herstellerID, COUNT(p.id) anzahl
                        FROM
                            pname2pid_mapping p
                        LEFT JOIN
                            hersteller h ON(h.id = p.herstellerID)
                        WHERE
                            p.kategorieID = ? AND
                            NOT h.URLSTRUKTUR = ''
                            ${where}
                        GROUP BY
                            h.HERSTELLERNAME, h.URLSTRUKTUR,
                            p.herstellerID
                        ORDER BY
                            anzahl DESC
                    `;
                } else {
                    sql = `
                        SELECT
                            h.id, h.HERSTELLERNAME, h.URLSTRUKTUR,
                            fh.herstellerID, fh.anzahl
                        FROM
                            filter_hersteller fh
                        LEFT JOIN
                            hersteller h ON(h.id = fh.herstellerID)
                        WHERE
                            fh.kategorieID = ? AND
                            NOT h.URLSTRUKTUR = ''
                        ORDER BY
                            fh.anzahl DESC
                    `;
                }

                res = await db.query(sql, [this.kategorie.data.id]);

                let z = 0;
                let anzPos6 = 0;
                let hFilter = {};

                for (const row of res) {
                    z++;
                    if (z == 6) {
                        anzPos6 = row["anzahl"];
                    }

                    if (this.filter && this.filter.length) {
                        if (!pAnzahlMan[row["herstellerID"]]) continue;

                        anzahlFilter = pAnzahlMan[row["herstellerID"]];
                    } else {
                        if (!row["anzahl"]) continue;
                        anzahlFilter = row["anzahl"];
                    }

                    let title = "";

                    if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"]) {
                        if (this.sonderFilter === "testsieger") title += "Testsieger: ";

                        title += `${row["HERSTELLERNAME"]} `;

                        if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"]) title += this.aktiveFilter[0]["title"];
                    } else {
                        title += `${row["HERSTELLERNAME"]} `;

                        if (!title.includes(this.kategorie.data.kategorieName)) title += `${this.kategorie.data.kategorieName} `;

                        if (this.sonderFilter === "testsieger") title += "Testsieger ";

                        if (this.aktiveFilter.length === 1) {
                            if (this.aktiveFilter[0]["fnAnzeigeKategorie"] || this.aktiveFilter[0]["fkAnzeigeKategorie"])
                                title += `${this.aktiveFilter[0]["name"]} `;

                            title += `${aktiveFilter[0]["anzeige"]} `;
                        }
                    }

                    title = title.trim();
                    const restLink = `${this.sonderFilter ? (this.filter.length ? "-" : "") : ""}${this.filter.length ? this.filter.join("-") : ""}`;

                    hFilter[row["herstellerID"]] = {
                        url: row["URLSTRUKTUR"],
                        apply: this.herstellerURL.includes(row["URLSTRUKTUR"]),
                        name: row["HERSTELLERNAME"],
                        anzahl: parseInt(anzahlFilter),
                        noIndex:
                            anzahlFilter < 15 ||
                            this.kategorie.data.noIndex ||
                            this.filter.length > FILTER_INDEX_MAX ||
                            this.filterNoIndex ||
                            (this.aktiveFilter.length && this.aktiveFilter[0]["title"] && !this.aktiveFilter[0]["title"]),
                    };
                }

                if (filterArray["hs"] === undefined && hFilter) {
                    filterArray["hs"] = {
                        name: "Hersteller",
                        oberFilter: 0,
                        filter: hFilter,
                    };
                }

                // if (this.filter !== undefined && this.filter.length) {
                //     anzPos6 = 0;
                //     let z = 0;
                //     let tmp = [];

                //     for (const k in pAnzahlMan) {
                //         if (Object.hasOwnProperty.call(pAnzahlMan, k)) {
                //             const v = pAnzahlMan[k];

                //             if (filterArray["hs"] === undefined || (filterArray["hs"] && filterArray["hs"]["filter"][k] === undefined)) continue;

                //             tmp[k] = filterArray["hs"]["filter"][k];
                //             z++;
                //             if (z === 6) anzPos6 = filterArray["hs"]["filter"][k]["anzahl"];
                //         }
                //     }
                //     filterArray["hs"] = {
                //         filter: tmp,
                //     };
                // }

                // if (anzPos6 && filterArray["hs"]) {
                //     filterArray["hs"]["filter"].sort((a, b) => {
                //         if (typeof ANZ_POS_6 === "undefined")
                //             if ((a["anzahl"] < anzPos6 && b["anzahl"] < anzPos6) || a["anzahl"] == b["anzahl"])
                //                 return a["name"].toUpperCase() === b["name"].toUpperCase();
                //             else if ((a["anzahl"] < ANZ_POS_6 && b["anzahl"] < ANZ_POS_6) || a["anzahl"] == b["anzahl"])
                //                 return a["name"].toUpperCase() === b["name"].toUpperCase();

                //         if (a["anzahl"] < b["anzahl"]) return 1;

                //         return -1;
                //     });
                // }
            }

            sql = `
                SELECT
                    fk.id fkid, fk.name, fk.oberFilter, fk.sort sortFK, fk.noIndex noIndexFK, fk.anzeigeKategorie fkAnzeigeKategorie,
                    fn.id fnid, fn.url, fn.filterURL, fn.anzeige, fn.title, fn.anzahl, fn.sort sortFN, fn.noIndex noIndexFN, fn.anzeigeKategorie fnAnzeigeKategorie
                FROM
                    filter_kategorien fk
                LEFT JOIN
                    filter_namen fn ON(fn.fkid = fk.id)
                WHERE
                    fk.kategorieID = ? AND
                    fn.anzeigen = 1 AND
                    fk.anzeigen = 1
                ORDER BY
                    IF(sortFK <> 0, sortFK, 999) ASC,
                    fk.name ASC,
                    IF(sortFN <> 0, sortFN, 999) ASC,
                    fn.anzeige ASC
            `;

            res = await db.query(sql, [this.kategorie.data.id]);

            let filterVor = "";
            let filterNach = this.filter.length ? this.filter.join("-") : "";
            let filterKatGesetzt = [];

            for (const row of res) {
                let applyFlag = false;

                if ((typeof this.filter !== "undefined" && this.filter.length) || this.herstellerURL || this.sonderFilter) {
                    if (this.filter.includes(row["url"]) || this.filter.includes(row["filterURL"])) {
                        applyFlag = true;

                        filterVor = "";
                        filterNach = "";
                        let tmp = "";

                        for (const v of this.filter) {
                            tmp += `${v}-`;
                            if (v === row["url"]) {
                                filterVor = tmp;
                                tmp = "";
                                continue;
                            }
                        }

                        if (tmp) filterNach = `-${tmp.substring(0, tmp.length - 1)}`;

                        filterKatGesetzt.push(row["fkid"]);
                    }

                    // if (typeof pAnzahl[row["url"]] === "undefined") continue;

                    anzahlFilter = pAnzahl[row["url"]];
                } else {
                    if (!row["anzahl"]) continue;

                    anzahlFilter = row["anzahl"];
                }
                anzahlFilter = row["anzahl"];

                if (anzahlFilter === this.getProductCount()) continue;

                if (typeof filterArray[row["fkid"]] === "undefined") {
                    filterArray[row["fkid"]] = {
                        name: row["name"],
                        oberFilter: parseInt(row["oberFilter"]),
                        filter: {},
                    };
                }

                if (row["fnid"]) {
                    let fURL = "";
                    // if (filterVor) fURL += filterVor;

                    if (row["filterURL"]) fURL += row["filterURL"];
                    else fURL += row["url"];

                    // if (filterNach) fURL += filterNach;

                    let noI = false;
                    if (anzahlFilter < 15) noI = true;
                    else if (this.kategorie.data.noIndex) noI = true;
                    else if (this.sonderFilter) noI = true;
                    else if (this.filter.length >= FILTER_INDEX_MAX)
                        if (typeof filterKombisIndex[fURL] === "undefined") noI = true;
                        else if (row["noIndexFK"] || row["noIndexFN"]) noI = true;
                        else if (this.herstellerURL && !row["title"]) noI = true;

                    if (this.herstellerURL && !cHersteller) cHersteller = Hersteller.getByURL(this.herstellerURL);

                    let title = "";
                    if (typeof filterKombisIndex[fURL] !== "undefined") title += filterKombisIndex[fURL];
                    else {
                        if (!this.filter.length && row["title"]) {
                            if (this.sonderFilter === "testsieger") title += "Testsieger: ";

                            if (this.herstellerURL) title += `${cHersteller.herstellerName} `;

                            if (!this.filter.length && row["title"]) title += row["title"];
                        } else {
                            if (this.herstellerURL) title += `${cHersteller.herstellerName}`;

                            if (!title.includes(this.kategorie.data.kategorieName)) title += this.kategorie.data.kategorieName;

                            if (this.sonderFilter === "testsieger") title += "Testsieger ";

                            if (!this.filter.length) {
                                if (row["fnAnzeigeKategorie"] || row["fkAnzeigeKategorie"]) title += `${row["name"]} `;
                                title += `${row["anzeige"]} `;
                            }
                        }
                        title = title.trim();
                    }

                    filterArray[row["fkid"]]["filter"][row["fnid"]] = {
                        url: fURL,
                        apply: applyFlag,
                        name: row["anzeige"],
                        anzahl: parseInt(anzahlFilter),
                        noIndex: noI,
                    };
                }
            }

            filterKatGesetzt = filterKatGesetzt.filter((value, index, self) => {
                return self.indexOf(value) === index;
            });

            if (this.sonderFilter !== "testsieger") {
                let where = "";
                let values = [];
                let having = "";
                let join = "";
                let groupBy = "";

                if (typeof this.filter !== "undefined" && this.filter.length) {
                    where += ` 
                        AND (
                            fn.url IN(?) OR
                            fn.filterURL IN(?)
                        ) AND
                        fk.kategorieID = ? 
                    `;

                    values.push(this.filter.join(", "));
                    values.push(this.filter.join(", "));
                    values.push(this.kategorie.data.id);

                    having += ` HAVING COUNT(f2p.fid) = ? `;

                    values.push(this.filter.length);

                    join += `
                            LEFT JOIN
                                filterid2pid f2p ON(f2p.produktID = p.id)
                            LEFT JOIN
                                filter_namen fn ON(fn.id = f2p.fid)
                            LEFT JOIN
                                filter_kategorien fk ON(fn.fkid = fk.id)
                            `;

                    groupBy += " GROUP BY f2p.produktID ";
                } else {
                    where += ` AND p.kategorieID = ? AND p.noindex = 0 `;
                    values.push(this.kategorie.data.id);
                }

                if (this.herstellerURL) {
                    where += ` AND p.herstellerID = ? `;
                    values.push(cHersteller.data.id);
                }

                if (groupBy || having || join) {
                    sql = `
                        SELECT
                            COUNT(id) anz
                        FROM
                            (
                            SELECT
                                p.id
                            FROM
                                pname2pid_mapping p
                            ${join}
                            WHERE
                                p.TESTSIEGER > 0
                                ${where}
                            ${groupBy}
                            ${having}
                            ) tb
                    `;
                } else {
                    sql = `
                        SELECT
                            COUNT(id) anz
                        FROM
                            pname2pid_mapping p
                        WHERE
                            TESTSIEGER > 0
                            ${where}
                    `;
                }

                res = await db.query(sql, values);

                if (res.length) {
                    const row = res[0];

                    if (row["anz"]) {
                        let title = "";

                        if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"]) {
                            title += "Testsieger: ";
                            if (this.herstellerURL) title += `${cHersteller.herstellerName} `;

                            if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"]) title += this.aktiveFilter[0]["title"];
                        } else {
                            if (this.herstellerURL) title += `${cHersteller.herstellerName} `;

                            if (!title.includes(this.kategorie.data.kategorieName)) title += `${this.kategorie.data.kategorieName} `;

                            title += "Testsieger ";

                            if (this.aktiveFilter.length === 1) {
                                if (this.aktiveFilter[0]["fnAnzeigeKategorie"] || this.aktiveFilter[0]["fkAnzeigeKategorie"]) {
                                    title += `${this.aktiveFilter[0]["name"]} `;
                                }
                                title += `${this.aktiveFilter[0]["anzeige"]} `;
                            }
                        }

                        title = title.trim();

                        let tmp = Object.keys(filterArray)
                            .slice(0, ANZAHL_FILTER_AUFGEKLAPPT)
                            .reduce((result, key) => {
                                result[key] = filterArray[key];

                                return result;
                            }, {});

                        tmp["ts"] = {
                            name: "Testsieger",
                            oberFilter: 0,
                            filter: {
                                ts: {
                                    url: "testsieger",
                                    name: "nur Testsieger anzeigen",
                                    anzahl: parseInt(row["anz"]),
                                    noIndex: true, // $row['anz'] < 15 || $kategorie->noIndex // 20.02.2018 Testsieger immer Noindex
                                },
                            },
                        };

                        let restTmp = Object.keys(filterArray)
                            .slice(ANZAHL_FILTER_AUFGEKLAPPT)
                            .reduce((result, key) => {
                                result[key] = filterArray[key];

                                return result;
                            }, {});

                        for (const k in restTmp) {
                            if (Object.hasOwnProperty.call(restTmp, k)) tmp[k] = restTmp[k];
                        }

                        filterArray = tmp;
                    }
                }
            }

            this.filterListe = {
                filter: filterArray,
                gesetzt: filterKatGesetzt,
            };
        }

        return this.filterListe;
    };

    getProductCount = (format = false, onlyIndex = false) => {
        let anz = Array.isArray(this.data["produktList"]) ? this.data["produktList"].length : 0;

        if (onlyIndex && anz) anz -= this.noIndexCount;

        if (format) return numberFormat(anz, 0);

        return anz;
    };

    getItems = (start, length) => {
        const itemsList = this.getItemList(start, length);

        if (!itemsList.length) return [];

        if (this.kategorieURL) {
            return this.getItemsKategorie(itemsList);
        }

        if (this.herstellerURL) {
            return this.getItemsHersteller(itemsList);
        }

        return [];
    };

    getAnzahlTotalTests = async () => {
        let total = 0;

        if (this.kategorieURL) {
            const items = await this.getItemsKategorie(this.data["produktList"]);

            items.forEach((element) => {
                total += element.tests;
            });
        }

        if (this.herstellerURL) {
            const items = await this.getItemsHersteller(this.data["produktList"]);

            items.forEach((element) => {
                total += element.tests;
            });
        }

        return total;
    };

    getItemList = (start, length) => {
        if (length < 1) return [];

        if (this.getProductCount() <= start) return [];

        if (this.getProductCount() <= start + length) return this.data["produktList"].slice(start);

        return this.data["produktList"].slice(start, start + length);
    };

    getItemsKategorie = async (itemsList) => {
        let pL = [];
        itemsList.forEach((val) => {
            pL.push(val["produktID"]);
        });

        const sql = `
            SELECT
                p.id, p.PNAME, p.PURL, p.DATENBLATT, p.DATENBLATTDETAILS, p.IMG, p.MAN, p.EAN, p.CONTENT, p.TESTCONTENT, p.SCORE, p.TESTS, p.TESTPRO, p.TESTCONTRA, p.TESTSIEGER, p.PREISSIEGER,
                p.serienZusatz, p.energieEffizienzKlasse, p.noindex, p.noIndex2,
                pa.anzAngebote, pa.preis, pa.sortPos,
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
                hersteller h ON(h.id = p.herstellerID)
            LEFT JOIN
                tbmeinungen m ON (m.produktID = p.id AND m.meinungstatus = 0)
            LEFT JOIN
                meinungen_amazon_stars mas ON (mas.produktID = p.id)
            LEFT JOIN
                meinungen_otto_stars mos ON (mos.produktID = p.id)
            LEFT JOIN
                produktbilder pb ON(pb.produktID = p.id AND pb.pos = 1 AND pb.groesse = 'L')
            WHERE
                p.id IN(?) AND
                pa.sortPos > 0 AND
                p.gesperrt = 0 AND
                h.gesperrt = 0
            GROUP BY
                p.id
        `;

        const res = await db.query(sql, [pL]);

        let items = {};

        await Promise.all(
            res.map(async (row) => {
                const dbData = await Datenblatt.getByID(row["id"]);

                if (dbData.getIsLoad() && dbData.haveDatenblattKurz()) {
                    let dbDataKurz = dbData.getDatenblattKurzSort();

                    var datenblatt = [];
                    for (const [labelID, attributIDs] of Object.entries(dbDataKurz)) {
                        const label = dbData.getLabel(labelID);
                        let attribute = [];

                        for (const key in attributIDs["attribute"]) {
                            if (Object.hasOwnProperty.call(attributIDs["attribute"], key)) {
                                const aID = attributIDs["attribute"][key];
                                attribute.push(dbData.getAttribut(aID));
                            }
                        }

                        let dbLine = "";
                        if (attributIDs["data"]["showLabel"]) {
                            dbLine = `${label}: `;
                        }
                        dbLine += attribute.join(", ");
                        datenblatt.push(dbLine);
                    }
                } else {
                    if (row["DATENBLATTDETAILS"]) {
                        var datenblatt = stripHtmlTags(row["DATENBLATTDETAILS"]);
                    } else {
                        var datenblatt = stripHtmlTags(row["DATENBLATT"]);
                    }

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
                    var imgXXL = cImg.replace("L1_", "XXL1_");
                    var breite = row["breite"];
                    if (!row["breite"] || !row["hoehe"]) {
                        var hoehe = 200;
                    } else {
                        var hoehe = Math.round((breite / row["breite"]) * row["hoehe"]);
                    }
                } else {
                    var cImg = SITE_IMG_GOOGLE + "/no-image.svg";
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

                items[row["id"]] = {
                    id: row["id"],
                    pname: row["PNAME"],
                    serienZusatz: row["serienZusatz"],
                    hersteller: row["MAN"],
                    img: cImg,
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
                    preis2: parseFloat(row["preis"]),
                    breite: breite,
                    hoehe: hoehe,
                    energieEffizienzKlasse: row["energieEffizienzKlasse"],
                    noIndex: row["noindex"],
                    noIndex2: row["noIndex2"],
                };
            })
        );

        items = Object.entries(items)
            .sort(([, a], [, b]) => a - b)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        return items;
    };

    getItemsHersteller = async (itemsList) => {
        let pL = [];
        itemsList.forEach((val) => {
            pL.push(val["produktID"]);
        });

        const sql = `
            SELECT
                p.id, p.PNAME, p.PURL, p.DATENBLATT, p.DATENBLATTDETAILS, p.IMG, p.MAN, p.EAN, p.CONTENT, p.TESTCONTENT, p.SCORE, p.TESTS, p.TESTPRO, p.TESTCONTRA, p.TESTSIEGER,
                p.PREISSIEGER, p.serienZusatz, p.energieEffizienzKlasse, p.noindex noIndex, p.noIndex2,
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
                hersteller h ON(h.id = p.herstellerID)
            LEFT JOIN
                tbmeinungen m ON (m.produktID = p.id AND m.meinungstatus = 0)
            LEFT JOIN
                meinungen_amazon_stars mas ON (mas.produktID = p.id)
            LEFT JOIN
                meinungen_otto_stars mos ON (mos.produktID = p.id)
            LEFT JOIN
                produktbilder pb ON(pb.produktID = p.id AND pb.pos = 1 AND pb.groesse = 'L')
            WHERE
                p.id IN(?) AND
                p.gesperrt = 0 AND
                h.gesperrt = 0
            GROUP BY
                p.id
        `;

        const res = await db.query(sql, [pL]);

        let items = {};

        await Promise.all(
            res.map(async (row) => {
                const dbData = await Datenblatt.getByID(row["id"]);

                if (dbData.getIsLoad() && dbData.haveDatenblattKurz()) {
                    let dbDataKurz = dbData.getDatenblattKurzSort();

                    var datenblatt = [];
                    for (const [labelID, attributIDs] of Object.entries(dbDataKurz)) {
                        const label = dbData.getLabel(labelID);
                        let attribute = [];

                        for (const key in attributIDs["attribute"]) {
                            if (Object.hasOwnProperty.call(attributIDs["attribute"], key)) {
                                const aID = attributIDs["attribute"][key];
                                attribute.push(dbData.getAttribut(aID));
                            }
                        }

                        let dbLine = "";
                        if (attributIDs["data"]["showLabel"]) {
                            dbLine = `${label}: `;
                        }
                        dbLine += attribute.join(", ");
                        datenblatt.push(dbLine);
                    }
                } else {
                    if (row["DATENBLATTDETAILS"]) {
                        var datenblatt = stripHtmlTags(row["DATENBLATTDETAILS"]);
                    } else {
                        var datenblatt = stripHtmlTags(row["DATENBLATT"]);
                    }

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
                    var imgXXL = cImg.replace("L1_", "XXL1_");
                    var breite = row["breite"];
                    if (!row["breite"] || !row["hoehe"]) {
                        var hoehe = 200;
                    } else {
                        var hoehe = Math.round((breite / row["breite"]) * row["hoehe"]);
                    }
                } else {
                    var cImg = SITE_IMG_GOOGLE + "/no-image.svg";
                    var imgXXL = "";
                    var breite = 200;
                    var hoehe = 200;
                }

                for (const z in itemsList) {
                    if (Object.hasOwnProperty.call(itemsList, z)) {
                        const v = itemsList[z];
                        if (row["id"] === v["produktID"]) {
                            delete itemsList[z];
                            break;
                        }
                    }
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

                items[row["id"]] = {
                    id: row["id"],
                    pname: row["PNAME"],
                    serienZusatz: row["serienZusatz"],
                    hersteller: row["MAN"],
                    img: cImg,
                    imgXXL: imgXXL,
                    datenblatt: datenblatt,
                    tests: row["TESTS"],
                    noteID: row["id"],
                    testsieger: row["TESTSIEGER"],
                    preissieger: row["PREISSIEGER"],
                    score: row["SCORE"],
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
                    preis2: parseFloat(row["preis"]),
                    breite: breite,
                    hoehe: hoehe,
                    energieEffizienzKlasse: row["energieEffizienzKlasse"],
                    noIndex: row["noIndex"],
                    noIndex2: row["noIndex2"],
                    noIndexKategorie: row["noIndexKategorie"],
                };
            })
        );

        items = Object.entries(items)
            .sort(([, a], [, b]) => a - b)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        return items;
    };

    getFilterPIDs = async () => {
        let pidList = [];

        if (this.filter.length) {
            const values = [this.kategorie.data.id, this.filter, this.filter, this.filter.length];
            const sql = `
                SELECT
                    f2p.produktID
                FROM
                    filterid2pid f2p
                LEFT JOIN
                    filter_namen fn ON(fn.id = f2p.fid)
                LEFT JOIN
                    filter_kategorien fk ON(fn.fkid = fk.id)
                WHERE
                    fk.kategorieID = ? AND
                    (
                    fn.url IN(?) OR
                    fn.filterURL IN(?)
                    )
                GROUP BY
                    f2p.produktID
                HAVING
                    COUNT(f2p.fid) = ?
            `;

            const res = await db.query(sql, values);

            for (const item of res) {
                pidList.push(item["produktID"]);
            }
        }

        return pidList;
    };
}

module.exports = Produktliste;
