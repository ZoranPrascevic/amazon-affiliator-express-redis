const db = require("../db/db-connection");
const { numberFormat, PreishistorieformatDate } = require("../utils/functions.inc");

class Preishistorie {
    produktID = "";
    type = "";
    data = [];
    isLoad = false;

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = async () => {
        let where;
        let sql;
        let res;
        let values;

        if (this.type == "serie") {
            sql = `
                SELECT
                    GROUP_CONCAT(pid SEPARATOR ',') pidList
                FROM
                    produkte2serien
                WHERE
                    serienID = ?
            `;

            res = await db.query(sql, [this.produktID]);

            if (!res.length) return false;

            const row = res[0];

            if (!row["pidList"]) {
                return false;
            }

            where = ` produktID IN(?) `;
            values = [row["pidList"].split(",")];
        } else {
            where = ` produktID = ? `;
            values = [this.produktID];
        }

        sql = `
            SELECT
                preis, datum
            FROM
                preishistorie
            WHERE
                ${where}
        `;

        res = await db.query(sql, values);

        let data = {};
        for (let row of res) {
            const datumF = PreishistorieformatDate(row["datum"]);
            row["preis"] = parseFloat(row["preis"]);

            if (!(datumF in data)) data[datumF] = {};

            if (!("preis" in data[datumF]) || row["preis"] < data[datumF]["preis"]) {
                if (!row["preis"]) continue;

                data[datumF] = {
                    preis: row["preis"],
                    datum: datumF,
                };
            }
        }

        this.data = Object.keys(data)
            .sort()
            .reduce((obj, key) => {
                obj.push(data[key]);
                return obj;
            }, []);

        this.isLoad = true;
    };

    hasPreishistorie = () => {
        return this.data.length > 0;
    };

    getPreishistorie = () => {
        return this.data;
    };

    static getByID = async (id) => {
        const obj = new Preishistorie(id);

        await obj.load();

        return obj;
    };
}

module.exports = Preishistorie;
