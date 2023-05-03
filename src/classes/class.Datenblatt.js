const Serie = require("../classes/class.Serie");
const Produkt = require("./class.Share.Produkt");

const db = require("../db/db-connection");

class Datenblatt {
    produktID = "";
    type = "";

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = async () => {
        let produktID;

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

            var kategorieID = serie.data.produkte.kategorieID;

            var where = ` produktID IN(?) `;
            produktID = row["pidList"].split(",");
        } else {
            const prd = await Produkt.getByID(this.produktID);

            var kategorieID = prd.data.kategorieID;

            var where = ` produktID = ? `;
            produktID = this.produktID;
        }

        let sql = `
            SELECT
                COUNT(id) anz
            FROM
                datenblatt_struktur
            WHERE
                kategorieID = ?
        `;

        let res = await db.query(sql, [kategorieID]);

        let isShowDB = false;
        if (res.length) isShowDB = res[0]["anz"] > 0;

        sql = `
            SELECT
                sektionID, labelID, sort, showLabel
            FROM
                datenblatt_struktur_kurz
            WHERE
                kategorieID = ?
            ORDER BY
                sort ASC
        `;

        res = await db.query(sql, [kategorieID]);

        let dbSort = {};

        for (const row of res) {
            dbSort[row["sort"]] = row;
        }

        let isShowKurzDB = dbSort.length > 0;

        sql = `
            SELECT
                dbs.id sektionID, dbs.name sektion,
                dbl.id labelID, dbl.name label,
                dba.id attributID, dba.inhalt attribut,
                IF(ds.id > 0, 1, 0) showDB,
                IF(dsk.id > 0, 1, 0) showKurzDB
            FROM
                produkt2datenblatt p2d
            LEFT JOIN
                datenblatt_sektion dbs ON(dbs.id = p2d.sektionID)
            LEFT JOIN
                datenblatt_label dbl ON(dbl.id = p2d.labelID)
            LEFT JOIN
                datenblatt_attribut dba ON(dba.id = p2d.attributID)
            LEFT JOIN
                datenblatt_struktur ds ON(ds.kategorieID = ? AND dbs.id = ds.sektionID AND dbl.id = ds.labelID)
            LEFT JOIN
                datenblatt_struktur_kurz dsk ON(dsk.kategorieID = ? AND dbs.id = dsk.sektionID AND dbl.id = dsk.labelID)
            WHERE
                ${where} AND
                p2d.gesperrt = 0
            ORDER BY
                ds.sort ASC,
                sektion ASC,
                label ASC,
                attribut ASC
        `;

        res = await db.query(sql, [kategorieID, kategorieID, produktID]);

        if (!res.length) return false;

        let data = {};
        let dataSort = {};
        let dataKurz = {};
        let sektion = {};
        let label = {};
        let attribut = {};
        let sektionList = {};
        let labelList = {};
        let labelListSort = {};
        let attributList = {};
        let dk = 0;

        for (const row of res) {
            if (!isShowDB || row["showDB"]) {
                if (!dataSort.hasOwnProperty(row["sektionID"])) dataSort[row["sektionID"]] = {};

                if (typeof dataSort[row["sektionID"]][row["labelID"]] === "undefined") dataSort[row["sektionID"]][row["labelID"]] = [];
                dataSort[row["sektionID"]][row["labelID"]].push(row["attributID"]);

                if (typeof sektionList[row["sektion"]] === "undefined") sektionList[row["sektion"]] = row["sektionID"];

                if (!labelListSort.hasOwnProperty(row["sektion"])) labelListSort[row["sektion"]] = {};
                if (typeof labelListSort[row["sektion"]][row["label"]] === "undefined") labelListSort[row["sektion"]][row["label"]] = row["labelID"];
            }

            if ((!isShowKurzDB && dk < 10) || row["showKurzDB"]) {
                if (!dataKurz.hasOwnProperty(row["sektionID"])) dataKurz[row["sektionID"]] = {};

                if (typeof dataKurz[row["sektionID"]][row["labelID"]] === "undefined") {
                    dk++;
                    dataKurz[row["sektionID"]][row["labelID"]] = [];
                }
                dataKurz[row["sektionID"]][row["labelID"]].push(row["attributID"]);
            }

            if (typeof labelList[row["sektionID"]] === "undefined") {
                labelList[row["sektionID"]] = {};
            }

            if (!labelList.hasOwnProperty(row["sektionID"])) labelList[row["sektionID"]] = {};

            labelList[row["sektionID"]][row["labelID"]] = row["label"];
            if (typeof attributList[row["labelID"]] === "undefined") {
                attributList[row["labelID"]] = [];
            }
            attributList[row["labelID"]].push(row["attribut"]);

            if (typeof sektion[row["sektionID"]] === "undefined") {
                sektion[row["sektionID"]] = row["sektion"];
            }
            if (typeof label[row["labelID"]] === "undefined") {
                label[row["labelID"]] = row["label"];
            }
            if (typeof attribut[row["attributID"]] === "undefined") {
                attribut[row["attributID"]] = row["attribut"];
            }
        }

        sektionList = Object.entries(sektionList)
            .sort(([, a], [, b]) => a - b)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

        for (const sektionName in sektionList) {
            if (Object.hasOwnProperty.call(sektionList, sektionName)) {
                const sektionID = sektionList[sektionName];

                labelListSort[sektionName] = Object.entries(labelListSort[sektionName])
                    .sort(([, a], [, b]) => a - b)
                    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

                if (!data.hasOwnProperty(sektionID)) data[sektionID] = {};

                for (const key in labelListSort[sektionName]) {
                    const labelID = labelListSort[sektionName][key];
                    data[sektionID][labelID] = dataSort[sektionID][labelID];
                }
            }
        }

        let dataKurzSort = {};
        if (isShowKurzDB) {
            for (const dk in dbSort) {
                const d = dbSort[dk];

                if (!dataKurz.hasOwnProperty("sektionID")) continue;

                if (typeof dataKurz[d["sektionID"]][d["labelID"]] === "undefined") continue;

                if (typeof dataKurzSort[d["labelID"]] === "undefined") {
                    dataKurzSort[d["labelID"]] = {
                        attribute: {},
                        data: {
                            showLabel: d["showLabel"],
                        },
                    };
                }

                dataKurzSort[d["labelID"]]["attribute"] = { ...dataKurzSort[d["labelID"]]["attribute"], ...dataKurz[d["sektionID"]][d["labelID"]] };
            }
        } else {
            for (const key in dataKurz) {
                if (Object.hasOwnProperty.call(dataKurz, key)) {
                    const lData = dataKurz[key];

                    for (const lID in lData) {
                        if (Object.hasOwnProperty.call(lData, lID)) {
                            const aList = lData[lID];

                            if (typeof dataKurzSort[lID] === "undefined")
                                dataKurzSort[lID] = {
                                    attribute: {},
                                    data: {
                                        showLabel: true,
                                    },
                                };

                            dataKurzSort[lID]["attribute"] = { ...dataKurzSort[lID]["attribute"], ...aList };
                        }
                    }
                }
            }
        }

        this.data = data;
        this.dataSort = dataSort;
        this.dataKurz = dataKurz;
        this.dataKurzSort = dataKurzSort;
        this.sektion = sektion;
        this.label = label;
        this.attribut = attribut;
        this.labelList = labelList;
        this.attributList = attributList;

        this.isLoad = true;
    };

    getIsLoad = () => {
        return this.isLoad;
    };

    haveDatenblattKurz = () => {
        return this.dataKurz !== undefined;
    };

    getDatenblattKurzSort = () => {
        return this.dataKurzSort;
    };

    getAttribut = (attributID) => {
        if (typeof this.attribut[attributID] === "undefined") return null;

        return this.attribut[attributID];
    };

    getLabel = (labelID) => {
        if (typeof this.label[labelID] === "undefined") return null;

        return this.label[labelID];
    };

    getAttributByLabel = (labelID) => {
        return this.attributList[labelID];
    };

    getDatenblattSort = () => {
        return this.dataSort;
    };

    getDatenblatt = () => {
        return this.data;
    };

    getSektion(sektionID) {
        if (!this.sektion[sektionID]) {
            return null;
        }

        return this.sektion[sektionID];
    }

    haveDatenblatt = () => {
        return this.dataSort !== undefined;
    };

    static getByID = async (id) => {
        const obj = new Datenblatt(id);

        await obj.load();

        return obj;
    };
}

module.exports = Datenblatt;
