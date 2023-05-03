const db = require("../db/db-connection");

class Presse {
    identifier = "";
    typ = "";
    data = [];
    isLoad = false;

    static artikelListe = [];
    static sitemap = [];

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ.toString();
    }

    load = async () => {
        let where;
        let values;
        let sql;
        let res;

        switch (this.typ) {
            case "url":
                where = " url = ? ";
                values = [[this.identifier]];
                break;

            case "id":
                where = " id = ? ";
                values = [parseInt([this.identifier])];
                break;

            default:
                break;
        }

        if (!where) return false;

        sql = `
            SELECT
                id, url, ueberschrift, bildURL, teaser, sidebar, autor, datum, aktiv
            FROM
                presse
            WHERE
                ${where}
        `;

        res = await db.query(sql, values);

        if (!res.length) {
            return false;
        }

        let row = res[0];

        sql = `
            SELECT
                id, ueberschrift, inhalt, glossar, offen
            FROM
                presse_eintraege
            WHERE
                presseID = ? AND
                aktiv = 1
            ORDER BY
                sort ASC
        `;

        res = await db.query(sql, [row["id"]]);

        if (!res.length) {
            return false;
        }

        let artikel = [];
        let glossar = [];
        for (const row2 of res) {
            if (row2["glossar"]) {
                glossar.push(row2);
            } else {
                artikel.push(row2);
            }
        }
        
        row["artikel"] = artikel;
        row["glossar"] = glossar;

        sql = `
            SELECT
                bildURL
            FROM
                presse
            WHERE
                id = ? AND
                aktiv = 1
        `;

        res = await db.query(sql, [row["id"]]);

        if (res.length) row["bildURL"] = res[0]["bildURL"];
        else row["bildURL"] = "";

        this.data = row;

        this.isLoad = true;
    };

    static getArtikelListe = async () => {
        const sql = `
            SELECT
                id, url, ueberschrift, bildURL, teaser, autor, datum, aktiv
            FROM
                presse
            ORDER BY
                datum DESC
        `;

        const res = await db.query(sql);

        let artikel = [];
        for (const row of res) {
            artikel.push(row);
        }

        return artikel;
    };

    static getByURL = async (url) => {
        const obj = new Presse(url, "url");

        await obj.load();

        return obj;
    };
}

module.exports = Presse;
