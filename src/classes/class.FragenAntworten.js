const db = require("../db/db-connection");

class FragenAntworten {
    produktID = 0;
    type = "";
    data = [];
    isLoad = false;

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = async () => {
        let join = "";
        let sql;
        let res;
        let where;
        let productID;

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

            where = ` AND pf.produktID IN(?) `;
            productID = row["pidList"].split(",");
        } else if (this.type == "kategorie") {
            join = " LEFT JOIN pname2pid_show ps ON(ps.produktID = pf.produktID) ";
            where = ` AND ps.kategorieID = ? `;
            productID = this.produktID;
        } else {
            where = ` AND pf.produktID = ? `;
            productID = this.produktID;
        }

        sql = `
            SELECT
                pf.id, pf.userID, pf.produktID, pf.anzeigeName, pf.frage, pf.bwnUp, pf.bwnDown, pf.insertDatum
            FROM
                produkte_fragen pf
            ${join}
            WHERE
                pf.status = 0
                ${where}
            ORDER BY
                pf.id DESC
        `;

        res = await db.query(sql, [productID]);

        let fragen = [];
        await Promise.all(
            res.map(async (row) => {
                row["insertDatum"] = new Date(row["insertDatum"]).toUTCString();

                sql = `
                SELECT
                    id, userID, tbdeMitarbeiter, anzeigeName, antwort, bwnUp, bwnDown, insertDatum
                FROM
                    produkte_antworten
                WHERE
                    frageID = ? AND
                    status = 0
            `;

                const res2 = await db.query(sql, [row["id"]]);

                let antworten = [];
                res2.forEach((row2) => {
                    row2["insertDatum"] = new Date(row["insertDatum"]).toUTCString();
                    antworten.push({
                        [row2["id"]]: row2,
                    });
                });

                row["antworten"] = antworten;

                fragen.push({
                    [row["id"]]: row,
                });
            })
        );

        this.data = fragen;

        this.isLoad = true;
    };

    countFragen = () => {
        return this.data.length;
    };

    getFragen = (start = null, length = null) => {
        if (start === null) {
            return this.data;
        }

        if (length !== null && length < 1) {
            return [];
        }

        if (length && start + length <= this.countFragen()) {
            return this.data.slice(start, start + length);
        }

        return this.data.slice(start);
    };

    static getByID = async (id) => {
        const obj = new FragenAntworten(id);

        await obj.load();

        return obj;
    };

    static getByKategorieID = async (id) => {
        const obj = new FragenAntworten(id, "kategorie");

        await obj.load();

        return obj;
    };
}

module.exports = FragenAntworten;
