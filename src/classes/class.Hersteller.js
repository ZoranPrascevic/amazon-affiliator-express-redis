const db = require("./../db/db-connection");

class Hersteller {
    identifier = "";
    typ = "";
    data = [];
    isLoad = false;

    constructor(identifier, typ = "id") {
        this.identifier = identifier;
        this.typ = typ;
    }

    get getIsLoad() {
        return this.isLoad;
    }

    load = async () => {
        let where = "";
        let values;

        switch (this.typ) {
            case "url":
                where = ` URLSTRUKTUR = ? `;
                values = this.identifier;
                break;

            case "id":
                where = ` id = ? `;
                values = parseInt(this.identifier);
                break;

            default:
                return false;
        }

        const sql = `
            SELECT
                id, HERSTELLERNAME herstellerName, URLSTRUKTUR herstellerURL, HERSTELLERURL website, anzahl
            FROM
                hersteller
            WHERE
                ${where} AND
                gesperrt = 0
        `;

        const res = await db.query(sql, values);

        if (!res.length) return false;

        let row = res[0];

        row["id"] = parseInt(row["id"]);
        row["anzahl"] = parseInt(row["anzahl"]);

        this.data = row;

        this.isLoad = true;
    };

    static checkHersteller = async (hersteller) => {
        const sql = `
            SELECT
                id
            FROM
                hersteller
            WHERE
                URLSTRUKTUR = ? AND
                gesperrt = 0
        `;

        const res = await db.query(sql, [hersteller]);

        if (!res.length) return false;

        return true;
    };

    static getByURL = async (herstellerURL) => {
        const obj = new Hersteller(herstellerURL, "url");

        await obj.load();

        return obj;
    };

    static getByID = async (id) => {
        const obj = new Hersteller(id);

        await obj.load();

        return obj;
    };
}

module.exports = Hersteller;
