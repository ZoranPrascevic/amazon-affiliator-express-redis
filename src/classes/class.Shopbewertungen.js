const db = require("../db/db-connection");
const Strings = require("../classes/class.Strings");

class Shopbewertungen {
    shopID = "";
    type = "";
    data = [];
    notenListe = [];
    bewertungen = [];
    bewertungenStars = [];
    gesamtNote = 0;
    anzahlBewertungen = 0;
    lastBewertungen = [];
    isLoad = false;

    constructor(shopID) {
        this.shopID = parseInt(shopID);
    }

    load = async () => {
        const sql = `
            SELECT
                id, shopID, anzeigeName, eMail, titel, bewertungText, empfehlen, einkaufen, bewertungGesamt, bewertungSeite, bewertungSuche, bewertungProdukt, bewertungBeschreibung, bewertungPreise,
                bewertungBestellung, bewertungZahlung, bewertungVersand, bewertungLieferzeit, bewertungVerpackung, bewertungService, auftragsNummer, datum
            FROM
                shop_bewertungen
            WHERE
                shopID = ? AND
                status = 2
            ORDER BY
                id DESC
            `;

        const res = await db.query(sql, [this.shopID]);

        let notenListe = Array(5).fill(0);
        this.lastBewertungen = Array(5).fill(null);

        let i = 0;
        let sterne = 0;
        let bewertungen = [];

        for (const row of res) {
            let bewertungText = Strings.descReplace(row["bewertungText"]);
            const matches = bewertungText.match(/<p>([^<]*)<\/p>/g);

            let absatz1 = matches[0] ? matches[0].length : 0;
            let absatz2 = 0;
            if (matches[1]) {
                absatz2 = matches[1].length;
            }

            let showAbsaetze = 2;
            if (absatz1 + absatz2 > 2000 && absatz1 > 650) {
                showAbsaetze = 1;
            }

            if (matches.length > showAbsaetze) {
                var bewertungTextOut = matches.slice(0, showAbsaetze).join("");
                var bewertungTextOut2 = matches.slice(showAbsaetze).join("");
                row["bewertungKomplett"] = false;
            } else {
                var bewertungTextOut = bewertungText;
                var bewertungTextOut2 = "";
                row["bewertungKomplett"] = true;
            }

            row["bewertungText"] = bewertungTextOut;
            row["bewertungText2"] = bewertungTextOut2;
            row["bewertungTextKomplett"] = bewertungText;

            row["datum"] = new Date(row["datum"]);

            if (!this.lastBewertungen[row["bewertungGesamt"] - 1]) {
                this.lastBewertungen[row["bewertungGesamt"] - 1] = i;
            }

            bewertungen[i] = row;

            notenListe[row["bewertungGesamt"] - 1]++;

            sterne += row["bewertungGesamt"];

            this.bewertungen.push(i);

            i++;
        }

        const gesamtNote = i ? Math.round(sterne / i) : 0;

        this.data = bewertungen;
        this.notenListe = notenListe;
        this.bewertungenStars = gesamtNote;
        this.gesamtNote = gesamtNote;
        this.anzahlBewertungen = i;

        this.isLoad = true;
    };

    getBewertungen(start = null, length = null) {
        if (start === null) {
            return this.data;
        }

        if (length !== null && length < 1) {
            return [];
        }

        if (length && start + length <= this.countBewertungen()) {
            return this.data.slice(start, start + length);
        }

        return this.data.slice(start);
    }

    countBewertungen = () => {
        return this.anzahlBewertungen;
    };

    getNotenliste = () => {
        return this.notenListe;
    };

    getLastRating = (star) => {
        return this.lastBewertungen[star] !== null ? this.data[this.lastBewertungen[star]] : null;
    };

    getBewertungenStars = () => {
        return this.bewertungenStars;
    };

    static getByShopID = async (shopID) => {
        const obj = new Shopbewertungen(shopID);

        await obj.load();

        return obj;
    };
}

module.exports = Shopbewertungen;
