const db = require("../db/db-connection");
const Strings = require("../classes/class.Strings");

class Ausgabe {
    identifier = 0;

    data = [];

    breadcrumb = null;
    isLoad = false;

    constructor(identifier) {
        this.identifier = parseInt(identifier);
    }

    load = async () => {
        const sql = `
            SELECT
                ta.id, ta.testerID, ta.ausgabe, ta.kaufURL, ta.preis, ta.insertUser, ta.insertDate,
                t.testerURL
            FROM
                tester_ausgaben ta
            LEFT JOIN
                tester t ON(t.id = ta.testerID)
            WHERE
                ta.id = ?
        `;

        const res = await db.query(sql, [this.identifier]);

        if (!res.length) {
            return false;
        }

        let data = res[0];

        data["ausgabeURL"] = Strings.manURLEncode(data["ausgabe"]) + "-" + data["id"];
        data["url"] = "/de/magazine/" + data["testerURL"] + "-A" + data["ausgabeURL"] + ".html";

        this.data = data;

        this.isLoad = true;
    };

    static getByID = async (id) => {
        const obj = new Ausgabe(id);

        await obj.load();

        return obj;
    };
}


module.exports = Ausgabe;
