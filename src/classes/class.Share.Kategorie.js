const db = require("../db/db-connection");

class Kategorie {
    topProducts = null;

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ;
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
                where = ` k.id = ? `;
                values = [parseInt(this.identifier)];
                break;

            default:
                break;
        }

        if (!where) {
            return false;
        }

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

        if (res.length) {
            row = res[0];
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

        this.isLeaf = this.data["lft"] + 1 == this.data["rgt"];

        this.isLoad = true;
    };

    static getByID = async (id) => {
        const obj = new Kategorie(id);

        await obj.load();

        return obj;
    };

    static getByURL = async (cname) => {
        const obj = new Kategorie(cname, "url");

        await obj.load();

        return obj;
    };
}

module.exports = Kategorie;
