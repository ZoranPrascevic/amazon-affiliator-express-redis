const db = require("../db/db-connection");
const Strings = require("./class.Strings");
const { ProduktDMYFormatDate, numberFormat, roundDecimail } = require("../utils/functions.inc");
const { round5 } = require("../classes/class.Math");
const { MONATE } = require("../constants/globals");

class Meinungen {
    produktID = "";
    type = "";
    data = [];
    notenListe = [];
    meinungenTBDE = [];
    meinungenAmazon = [];
    meinungenOtto = [];
    meinungenStars = [];
    gesamtNote = 0;
    anzahlMeinungenTBDE = 0;
    anzahlMeinungenText = 0;
    anzahlMeinungenAmazon = 0;
    anzahlMeinungenOtto = 0;
    anzahlMeinungen = 0;
    anzahlStarsAmazon = 0;
    anzahlStarsOtto = 0;
    meinungenStand = null;
    isLoad = false;

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    load = async () => {
        let sql;
        let res;
        let where;
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

            if (!row["pidList"]) return false;

            where = ` AND produktID IN(?) `;
            values = [row["pidList"].split(",")];
        } else {
            where = ` AND produktID = ? `;
            values = [this.produktID];
        }

        sql = `
            SELECT
                id, meinungstern, anzeigeName, meinungtext, mtitel, mempfehlen, mpro, mcontra, meinungDatum
            FROM
                tbmeinungen
            WHERE
                meinungstatus = 0
                ${where}
            ORDER BY
                id DESC
        `;

        res = await db.query(sql, values);

        let notenListe = Array(5).fill(0);

        let i = 0;
        let sterne = 0;
        let meinungen = [];
        let tbdeMeinungen = 0;
        let tbdeMeinungenText = 0;
        let updateDate = null;

        for (const row of res) {
            let meinungText = Strings.descReplace(row["meinungtext"]);
            let matches = meinungText.match(/|<p>([^<]*)<\/p>|/g);

            let absatz1 = matches.length && matches[0].length && matches[0][0] !== undefined ? matches[0][0].length : 0;
            let absatz2 = 0;
            if (matches.length && matches[0].length > 0) {
                absatz2 = strlen(matches[0][1]);
            }

            let showAbsaetze = 2;
            if (absatz1 + absatz2 > 2000 && absatz1 > 650) {
                showAbsaetze = 1;
            }

            if (matches && matches[0].length > showAbsaetze) {
                var meinungTextOut = matches[0].slice(0, showAbsaetze);
                var meinungTextOut2 = matches[0].slice(showAbsaetze).join("");
                row["meinungKomplett"] = false;
            } else {
                var meinungTextOut = meinungText;
                var meinungTextOut2 = "";
                row["meinungKomplett"] = true;
            }

            row["meinungTextOriginal"] = row["meinungtext"];
            row["meinungtext"] = meinungTextOut;
            row["meinungtext2"] = meinungTextOut2;
            row["meinungtextKomplett"] = meinungText;

            row["meinungDatum"] = new Date(row["meinungDatum"]);
            row["meinungDatumText"] = MONATE[row["meinungDatum"].getMonth()] + " " + row["meinungDatum"].getFullYear();

            row["meinungstern"] = parseInt(row["meinungstern"]);
            row["isAmazon"] = false;
            row["isOtto"] = false;

            if (!updateDate || updateDate < row["meinungDatum"]) {
                updateDate = row["meinungDatum"];
            }

            meinungen[i] = row;

            notenListe[row["meinungstern"]]++;

            sterne += row["meinungstern"];

            this.meinungenTBDE.push(i);

            if (row["meinungtext"].trim() || row["mtitel"].trim()) {
                tbdeMeinungenText++;
            }

            tbdeMeinungen++;
            i++;
        }

        sql = `
            SELECT
                id, anzeigeName, datum meinungDatum, sterne meinungstern, titel mtitel, rezensionText meinungtext, '' mpro, '' mcontra, '' mempfehlen
            FROM
                meinungen_amazon
            WHERE
                1
                ${where}
            ORDER BY
                datum DESC
        `;

        res = await db.query(sql, values);

        let amzMeinungen = 0;
        for (const row of res) {
            row["meinungDatum"] = new Date(row["meinungDatum"]);
            row["meinungDatumText"] = MONATE[row["meinungDatum"].getMonth()] + " " + row["meinungDatum"].getFullYear();

            row["meinungtextKomplett"] = Strings.wortKuerzen(row["meinungtext"], 260);
            const tmp = row["meinungtextKomplett"];
            row["meinungtextKomplett"] = row["meinungtext"];
            row["meinungtext"] = tmp;
            row["isAmazon"] = true;
            row["isOtto"] = false;

            meinungen[i] = row;

            this.meinungenAmazon.push(i);

            amzMeinungen++;
            i++;
        }

        sql = `
            SELECT
                id, anzeigeName, datum meinungDatum, sterne meinungstern, titel mtitel, rezensionText meinungtext, '' mpro, '' mcontra, '' mempfehlen
            FROM
                meinungen_otto
            WHERE
                1
                ${where}
            ORDER BY
                datum DESC
        `;

        res = await db.query(sql, values);

        let ottoMeinungen = 0;
        for (const row of res) {
            row["meinungDatum"] = new Date(row["meinungDatum"]);
            row["meinungDatumText"] = MONATE[row["meinungDatum"].getMonth()] + " " + row["meinungDatum"].getFullYear();

            row["meinungtextKomplett"] = Strings.wortKuerzen(row["meinungtext"], 260);
            const tmp = row["meinungtextKomplett"];
            row["meinungtextKomplett"] = row["meinungtext"];
            row["meinungtext"] = tmp;
            row["isAmazon"] = false;
            row["isOtto"] = true;

            meinungen[i] = row;

            this.meinungenOtto.push(i);

            ottoMeinungen++;
            i++;
        }

        sql = `
            SELECT
                star, anzahl, updateDate
            FROM
                meinungen_amazon_stars
            WHERE
                1
                ${where}
        `;

        res = await db.query(sql, values);

        let amzStars = 0;
        for (const row of res) {
            sterne += row["star"] * row["anzahl"];
            notenListe[row["star"] - 1] += row["anzahl"];

            row["updateDate"] = new Date(row["updateDate"]);

            if (!updateDate || updateDate < row["updateDate"]) {
                updateDate = row["updateDate"];
            }

            amzStars += row["anzahl"];
        }

        sql = `
            SELECT
                star, anzahl, updateDate
            FROM
                meinungen_otto_stars
            WHERE
                1
                ${where}
        `;

        res = await db.query(sql, values);

        let ottoStars = 0;
        for (const row of res) {
            sterne += row["star"] * row["anzahl"];
            notenListe[row["star"]] += row["anzahl"];

            row["updateDate"] = new Date(row["updateDate"]);

            if (!updateDate || updateDate < row["updateDate"]) {
                updateDate = row["updateDate"];
            }

            ottoStars += row["anzahl"];
        }

        const aMeinungen = tbdeMeinungen + amzStars + ottoStars;
        const gesamtNote = aMeinungen ? roundDecimail(sterne / aMeinungen, 1) : 0;

        if (!updateDate) {
            updateDate = new Date();
        }
        this.data = meinungen;
        this.notenListe = notenListe;
        this.gesamtNote = gesamtNote;
        this.anzahlMeinungenAmazon = amzMeinungen;
        this.anzahlMeinungenOtto = ottoMeinungen;
        this.anzahlStarsAmazon = amzStars;
        this.anzahlStarsOtto = ottoStars;
        this.anzahlMeinungenTBDE = tbdeMeinungen;
        this.anzahlMeinungenText = tbdeMeinungenText + amzMeinungen + ottoMeinungen;
        this.meinungenStand = updateDate;

        this.isLoad = true;
    };

    countMeinungenStars = () => {
        return this.anzahlMeinungenTBDE + this.anzahlStarsAmazon + this.anzahlStarsOtto;
    };

    countMeinungenAmazonStars = () => {
        return this.anzahlStarsAmazon;
    };

    countMeinungenOttoStars = () => {
        return this.anzahlStarsOtto;
    };

    countMeinungenText = () => {
        return this.anzahlMeinungenText;
    };

    getMeinungenProzent = () => {
        let prozent = this.gesamtNote * 20;

        return Math.round(prozent);
    };

    getNotenliste = () => {
        return this.notenListe;
    };

    getMeinungenStand = () => {
        if (!this.meinungenStand) {
            return ProduktDMYFormatDate(new Date());
        }
        return ProduktDMYFormatDate(this.meinungenStand);
    };

    countMeinungen = () => {
        return this.anzahlMeinungenTBDE + this.anzahlMeinungenAmazon + this.anzahlMeinungenOtto;
    };

    orderBySterneDESC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            return b["meinungstern"] - a["meinungstern"];
        });
    };

    orderByNeueDESC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            return (a["meinungDatum"].getTime() - b["meinungDatum"].getTime()) / (1000 * 3600 * 24);
        });
    };

    getMeinungenPunkte = (format = false, dec = 1) => {
        if (format) {
            return numberFormat(this.gesamtNote, dec);
        }

        return this.gesamtNote;
    };

    getGesamtnote = (format = false) => {
        const note = round5(this.gesamtNote);
        if (format) {
            return numberFormat(note, 1);
        }

        return note;
    };

    getMeinungenStars = () => {
        return this.meinungenStars;
    };

    getMeinungen = (start = null, length = null) => {
        if (start === null) {
            return this.data;
        }

        if (length !== null && length < 1) {
            return [];
        }

        if (length && start + length <= this.countMeinungen()) {
            return this.data.slice(start, start + length);
        }

        return this.data.slice(start);
    };

    static getByID = async (id) => {
        const obj = new Meinungen(id);

        await obj.load();

        return obj;
    };
}

module.exports = Meinungen;
