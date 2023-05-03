const Serie = require("./class.Serie");

const db = require("../db/db-connection");
const { CACHE_DAUER_DATENBLATT, CACHE_DIR } = require("../constants/globals");

class Datenblatt {
    produktID = "";
    type = "";

    data = [];
    dataSort = [];
    dataKurz = [];
    dataKurzSort = [];
    sektion = [];
    label = [];
    attribut = [];
    labelList = [];
    attributList = [];
    isLoad = false;

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = () => {
        this.loadData();
        this.isLoad = true;
    };

    loadData = async () => {
        if (this.type === "serie") {
            const sql = `
                SELECT
                    GROUP_CONCAT(pid SEPARATOR ',') pidList
                FROM
                    produkte2serien
                WHERE
                    serienID = ?
            `;

            const res = await db.query(sql, [this.produktID]);

            if (!res.length) return false;

            const row = res[0];

            if (!row["pidList"]) return false;

            let serie = await Serie.getByID(this.produktID);
        }
    };

    getIsLoad = () => {
        return this.isLoad;
    };

    haveDatenblattKurz = () => {
        return this.dataKurz.length > 0;
    };

    getDatenblattKurzSort = () => {
        return this.dataKurzSort;
    };

    getLabel = (labelID) => {
        if (typeof this.label[labelID] === "undefined") return null;

        return this.label[labelID];
    };

    getAttribut = (attributID) => {
        if (typeof this.attribut[attributID] === "undefined") return null;

        return this.attribut[attributID];
    };

    static getByID = async (id) => {
        const obj = new Datenblatt(id);

        await obj.load();

        return obj;
    };
}

module.exports = Datenblatt;
