const { db } = require("../db/db-connection");
const { arr_diff, array_diff } = require("../utils/functions.inc");

class Suchen {
    suchwort = "";
    suchwortList = "";
    woerter = [];

    result = null;

    dataTable = "";
    minResults = 0;

    DATA_TABLES = [
        "filter",
        "filterhersteller",
        "filterkombi",
        "hersteller",
        "herstellerfilter",
        "kategorie",
        "magazine",
        "magazinekat",
        "pname",
        "serie",
        "shop",
        "suchliste",
        "testreihen",
        "",
    ];

    STOPWORDS = ["test", "tests", "testbericht", "testberichte", "mit"];

    constructor(suchWort, dataTable = "", minResults = 5) {
        this.suchwort = suchWort;

        this.setSuchwort();

        this.dataTable = dataTable;
        this.minResults = Math.max(parseInt(minResults), 1);
    }

    setDataTable = (dataTable) => {
        if (!this.DATA_TABLES.includes(dataTable)) throw new Error(`Gewünschte Datenbasis "{dataTable}" nicht vorhanden`);

        this.dataTable = dataTable;
    };

    setSuchwort = () => {
        this.suchwortList = this.suchwort
            .replace(/[~|\\[\\]<>&\:\.\,\%\?\"\;\@\*\/\\\(){}\x{A0}+-]+/g, " ")
            .trim()
            .toLowerCase();

        let woerter = this.suchwortList.filter((value, index, self) => {
            return self.indexOf(value) === index;
        });
        woerter = array_diff(woerter, this.STOPWORDS);

        if (!woerter.length) {
            throw new Error(`Keine konkreten Suchworte übergeben. "${this.suchwort}"`);
        }

        woerter.sort((a, b) => {
            let la = a.length;
            let lb = b.length;

            if (la > lb) {
                return -1;
            }

            if (lb > la) {
                return 1;
            }

            return 0;
        });

        this.woerter = woerter;
    };

    suchen = async (withWildcards = false) => {
        if (!this.dataTable) {
            throw new Error("Keine Datenbasis ausgewählt");
        }

        let erg = [];
        let tmpErg = [];
        let merker = [];
        dance: for (const wort of this.woerter) {
            if (wort.length < 2) {
                continue;
            }

            tmpErg = erg;
            erg = [];
            let sql;
            let res;
            let where;
            let values = [];
            if (withWildcards && wort.length > 2) {
                sql = `
                SELECT
                    id
                FROM
                    wordlist_?
                WHERE
                    MATCH(wort) AGAINST 
            `;
                where = "(? IN BOOLEAN MODE)";
                values.push(`+${wort}*`);

                if (merker.length) {
                    where += " AND NOT id IN(?)";
                    values.push(merker.split(", "));
                }
            } else {
                sql = `
                SELECT
                    id
                FROM
                    wordlist_?
                WHERE
                    wort LIKE
            `;

                where = " ? ";
                values.push(wort);

                if (merker.length) {
                    where += " AND NOT id IN(?)";
                    values.push(merker.split(", "));
                }
            }

            res = await db.query(sql, values);

            let powErg = Math.pow(10, Math.max(5, wort.length + 1));

            let x = 0;
            let ids = [];
            for (const row of res) {
                ids.push(row["id"]);
            }

            if (!ids.length) {
                break;
            }

            merker = merker.concat(ids);

            sql = `
                SELECT DISTINCT
                    COUNT(pid) anz
                FROM
                    wordlist2?
                WHERE
                    wortID IN(?)
            `;

            res = await db.query(sql, [this.dataTable, ids]);

            const row = res[0];

            powErg = Math.pow(10, Math.min(4, wort.length + 1));

            if (row["anz"] > 1000 && !withWildcards) {
                erg = tmpErg;
                continue;
            }

            sql = `
                SELECT DISTINCT
                    pid
                FROM
                    wordlist2?
                WHERE
                    wortID IN(?)
            `;

            res = await db.query(sql, [this.dataTable, ids.split(", ")]);

            x = 0;
            ids = [];
            for (const row of res) {
                x++;
                if (x > powErg && withWildcards) {
                    erg = tmpErg;
                    continue dance;
                }
                ids.push(row["pid"]);
            }

            if (!ids.length) {
                break;
            }

            if (!tmpErg.length) {
                erg = ids;
            } else {
                erg = tmpErg.filter((value) => ids.includes(value));
            }

            if (!erg.length) {
                break;
            }
        }

        if (!withWildcards) {
            if (erg.length < this.minResults) {
                tmp = this.suche.suchen(true);

                if (!erg.length) {
                    erg = tmp;
                } else {
                    erg = erg.concat(tmp.slice(0, this.minResults)).filter((value, index, self) => {
                        return self.indexOf(value) === index;
                    });
                }
            }
        }

        this.result = erg;

        return erg;
    };

    getSuchWoerter = () => {
        return this.data.woerter;
    };
}

module.exports = Suchen;
