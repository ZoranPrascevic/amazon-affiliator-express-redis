const db = require("../db/db-connection");
const Produkt = require("./class.Share.Produkt");
const { AngeboteformatDate, numberFormat, stripHtmlTags } = require("../utils/functions.inc");
const { SITE_URL, SITE_IMG_GOOGLE, CDN_SHOPS } = require("../constants/globals");

class Angebote {
    produktID = "";
    type = "";
    promotedOffer = null;
    amazonOffer = null;
    ottoOffer = null;
    offerGuenstig = null;
    offerBestCPC = null;
    bestPrice = null;
    worstPrice = null;
    data = [];
    isLoad = false;

    constructor(produktID, type = "produkt") {
        this.produktID = parseInt(produktID);
        this.type = type.toString();
    }

    get getIsLoad() {
        return this.isLoad;
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

            if (row["pidList"]) return false;

            where = " produktID IN(?) ";
            values = [row["pidList"].split(",")];
        } else {
            where = " produktID = ? ";
            values = [this.produktID];
        }

        sql = `
            SELECT
                id, angebotsID, produktID, shopID, titel, size, color, bild, offerID, herkunft, preis, versandkosten, total, preisProEinheit, kreditkartenGebuehr, paypalGebuehr, nachnahmeGebuehr, verfuegbarkeit,
                verfuegbarkeitFlag, datum, cpc
            FROM
                shops_offers
            WHERE
                ${where}
        `;

        res = await db.query(sql, values);

        if (!res.length) return false;

        let offers = [];
        let i = 0;
        let amazonOffer = null;
        let ottoOffer = null;
        let guenstigstesAngebot = null;
        let besterCPC = null;
        let pOffer = [];

        await Promise.all(
            res.map(async (row) => {
                const produkt = await Produkt.getByID(row["produktID"]);

                const d = new Date(row["datum"]).toLocaleString("en-US", { timeZone: "Europe/Berlin" });
                row["datum"] = AngeboteformatDate(d);

                sql = `
                    SELECT
                        s.shopName, s.bild sBild, s.logoFormat, s.shopURL, s.amazon, s.promotedOffer,
                        sbe.bewertungGesamt, sbe.bewertungenGesamt,
                        sd.id detailShopID, sd.addressStreet, sd.addressZIP, sd.addressCity, sd.addressState, sd.addressCountry, sd.shopURL shopAddressURL,
                        sd.paymentVisa, sd.paymentAmericanExpress, sd.paymentMastercard, sd.paymentPayPal, sd.paymentDiners, sd.paymentJCB, sd.paymentDelta, sd.paymentSwitch,
                        sd.paymentSolo, sd.paymentCOD, sd.paymentInAdvance, sd.paymentInvoice, sd.paymentVCheck, sd.paymentDebit, sd.paymentFinance, sd.paymentPaybox,
                        sd.paymentPaySafeCard, sd.paymentCashAtPickup, sd.paymentSofortUeberweisung, sd.paymentBarzahlen, sd.paymentPayMorow, sd.paymentAmazon, sd.paymentGiropay
                    FROM
                        shops s
                    LEFT JOIN
                        shop_bewertungen_erg sbe ON(sbe.shopID =  s.id)
                    LEFT JOIN
                        shops_details sd ON(sd.shopID = s.id)
                    WHERE
                        s.id = ?
                `;

                let res2 = await db.query(sql, [parseInt(row["shopID"])]);

                if (res2.length) {
                    row = { ...row, ...res2[0] };
                    row["preis"] = parseFloat(row["preis"]);

                    if (row["herkunft"] == "Z" && [36, 52, 1072, 1336].includes(row["shopID"])) {
                        row["offerID"] =
                            "http://go.testberichte.org/go-tbde.php?data=" +
                            Buffer.from(JSON.stringify({ shopName: row["shopName"], url: row["offerID"] })).toString("base64");
                    }

                    const shoplink = "/angid/" + row["angebotsID"] + "-" + produkt.data.produktURL + ".html";
                    const shoplinkRein = "/angid/" + row["angebotsID"] + "-" + produkt.data.produktURL + ".html";
                    row["versandkosten"] = parseFloat(row["versandkosten"]);

                    row["versandkostenFormat"] = numberFormat(row["versandkosten"], 2);

                    if (row["versandkostenFormat"] == "0,00") {
                        row["versandkostenFormat"] = "kostenfrei";
                    } else {
                        row["versandkostenFormat"] = row["versandkostenFormat"] + " €";
                    }

                    if (row["bild"]) {
                        sql = `
                        SELECT
                            id
                        FROM
                            angebotsbilder
                        WHERE
                            angebotsID = ?
                    `;

                        res2 = await db.query(sql, [row["angebotsID"]]);

                        if (res2.length) {
                            row["bild"] = SITE_IMG_GOOGLE + "/offerimages/" + row["angebotsID"] + ".jpg";
                        } else {
                            const imgURL = row["bild"].split("/");

                            if (imgURL.length > 2 && imgURL[2] === "images.testbericht.de") row["bild"] = row["bild"].replace("D_", "/D/").replace("E_", "/E/");
                            else row["bild"] = SITE_IMG_GOOGLE + "/offerimage/" + row["angebotsID"] + ".jpg";
                        }
                    } else {
                        row["bild"] = produkt.data.bilder[0]["D"]["url"];
                    }

                    let starsFull = Math.floor(row["bewertungGesamt"]);
                    starsFull += row["bewertungGesamt"] - starsFull > 0.74 ? 1 : 0;
                    const starsHalf = row["bewertungGesamt"] - starsFull > 0.24 ? 1 : 0;
                    const starsEmpty = 5 - starsFull - starsHalf;

                    let stars = Array(starsFull).fill("full");
                    stars = stars.concat(Array(starsHalf).fill("half"));
                    stars = stars.concat(Array(starsEmpty).fill("empty"));

                    const offerTitel = row["titel"].substring(0, 85);

                    offers.push({
                        topProduct: false,
                        offer_id: row["id"],
                        offer_angebotsID: row["angebotsID"],
                        angebotsID: row["angebotsID"],
                        produktID: row["produktID"],
                        offer_label: row["titel"] ? offerTitel : produkt.PNAME,
                        titel: row["titel"] ? offerTitel : produkt.PNAME,
                        offer_image: row["bild"],
                        offer_merchantid: parseInt(row["shopID"]),
                        shopID: parseInt(row["shopID"]),
                        detailShopID: parseInt(row["detailShopID"]),
                        shopLogo: CDN_SHOPS + "/" + row["shopID"] + ".png",
                        shopLogoSVG: CDN_SHOPS + "/" + row["shopID"] + "." + row["logoFormat"],
                        offer_offer_merchantname: row["shopName"],
                        shopName: row["shopName"],
                        preis: row["preis"],
                        preisFormat: numberFormat(row["preis"], 2),
                        offer_period: stripHtmlTags(row["verfuegbarkeit"]),
                        verfuegbarkeit: stripHtmlTags(row["verfuegbarkeit"]),
                        offer_periodflag: parseInt(row["verfuegbarkeitFlag"]),
                        verfuegbarkeitFlag: parseInt(row["verfuegbarkeitFlag"]),
                        deeplink: shoplink,
                        deeplinkComplete: SITE_URL + shoplink,
                        offer_oid: shoplink,
                        offer_link: shoplinkRein,
                        versandkosten: row["versandkosten"],
                        versandkostenFormat: row["versandkostenFormat"],
                        total: parseFloat(row["total"]),
                        totalFormat: numberFormat(row["total"], 2),
                        offer_preiseinheit: row["preisProEinheit"].replace("?", "€"),
                        kreditkartenGebuehr: parseFloat(row["kreditkartenGebuehr"]),
                        paypalGebuehr: parseFloat(row["paypalGebuehr"]),
                        nachnahmeGebuehr: parseFloat(row["nachnahmeGebuehr"]),
                        offer_datum: row["datum"],
                        herkunft: row["herkunft"],
                        sBild: row["sBild"] == "1",
                        bewertungPunkte: parseFloat(row["bewertungGesamt"]),
                        bewertungGesamt: row["bewertungGesamt"] ? row["bewertungGesamt"].replace(".00", "").replace(".0", "").replace(".", "-") : 0,
                        bewertungAnzahl: parseInt(row["bewertungenGesamt"]),
                        shopURL: row["shopURL"],
                        cpc: parseFloat(row["cpc"]),
                        payment_paypal: row["paymentPayPal"] == "1",
                        payment_amex: row["paymentAmericanExpress"] == "1",
                        payment_visa: row["paymentVisa"] == "1",
                        payment_master: row["paymentMastercard"] == "1",
                        payment_diners: row["paymentDiners"] == "1",
                        payment_amazon: row["paymentAmazon"] == "1",
                        isPaypal: row["paymentPayPal"] == "1",
                        isAmex: row["paymentAmericanExpress"] == "1",
                        isVisa: row["paymentVisa"] == "1",
                        isMaster: row["paymentMastercard"] == "1",
                        isDiners: row["paymentDiners"] == "1",
                        isAmazon: row["paymentAmazon"] == "1",
                        isNachnahme: row["paymentCOD"] == "1",
                        promotedOffer: row["promotedOffer"],
                        size: row["size"],
                        color: row["color"],
                        stars: row["bewertungGesamt"], //stars variable
                        shop: {
                            adresse: {
                                strasse: row["addressStreet"],
                                plz: row["addressZIP"],
                                ort: row["addressCity"],
                                staat: row["addressState"],
                                land: row["addressCountry"],
                            },
                            link: row["shopAddressURL"],
                            shopLogo: CDN_SHOPS + "/" + row["shopID"] + "." + row["logoFormat"],
                        },
                    });

                    if (row["promotedOffer"] && row["sBild"] && ["A", "E", "F", "W"].includes(row["herkunft"])) {
                        pOffer.push({
                            offer: i,
                            rang: row["promotedOffer"],
                        });
                    }

                    if (row["amazon"] && (amazonOffer === null || row["cpc"] > offers[amazonOffer]["cpc"])) {
                        amazonOffer = i;
                    }

                    if (row["shopID"] == 4) {
                        ottoOffer = i;
                    }

                    if (this.bestPrice == null) {
                        this.bestPrice = row["preis"];
                        this.worstPrice = row["preis"];
                    } else {
                        this.bestPrice = Math.min(this.bestPrice, row["preis"]);
                        this.worstPrice = Math.max(this.worstPrice, row["preis"]);
                    }

                    i++;
                }
            })
        );

        pOffer.sort((a, b) => {
            return a["rang"] - b["rang"];
        });

        for (const v of pOffer) {
            if (v["offer"] == amazonOffer) {
                continue;
            }
            if (v["offer"] == ottoOffer) {
                continue;
            }

            this.promotedOffer = v["offer"];
            break;
        }

        if (this.promotedOffer == null && offers.length > 2) {
            do {
                this.promotedOffer = offers[Math.floor(Math.random() * offers.length)];
            } while (this.promotedOffer == ottoOffer || this.promotedOffer == amazonOffer);
        }

        for (let i = 0; i < offers.length; i++) {
            const row = offers[i];

            if (this.promotedOffer == i) continue;

            if (row["shopID"] != 10650) {
                if (besterCPC === null) {
                    besterCPC = i;
                } else if (offers[besterCPC]["cpc"] < row["cpc"]) {
                    besterCPC = i;
                } else if (offers[besterCPC]["cpc"] == row["cpc"] && offers[besterCPC]["preis"] > row["preis"]) {
                    besterCPC = i;
                }
            }
        }

        for (let i = 0; i < offers.length; i++) {
            const row = offers[i];

            if (this.promotedOffer == i) continue;

            if (besterCPC == i) continue;

            if (row["shopID"] == 10650) {
                if (guenstigstesAngebot === null) {
                    guenstigstesAngebot = i;
                } else if (offers[guenstigstesAngebot]["preis"] > row["preis"]) {
                    guenstigstesAngebot = i;
                } else if (offers[guenstigstesAngebot]["preis"] == row["preis"] && offers[guenstigstesAngebot]["cpc"] < row["cpc"]) {
                    guenstigstesAngebot = i;
                }
            }
        }

        if (guenstigstesAngebot !== null) offers[guenstigstesAngebot].topProduct = true;
        if (besterCPC !== null) offers[besterCPC].topProduct = true;

        this.offerGuenstig = guenstigstesAngebot;
        this.offerBestCPC = besterCPC;
        this.amazonOffer = amazonOffer;
        this.ottoOffer = ottoOffer;

        this.data = offers;

        this.isLoad = true;
    };

    getGuenstigstesAngebot = (withAmazon = true) => {
        if (this.offerGuenstig === null) {
            return null;
        }

        let offerOut = this.offerGuenstig;
        if (withAmazon && this.amazonOffer !== null) {
            if (this.data[this.offerGuenstig]["preis"] > this.data[this.amazonOffer]["preis"]) {
                offerOut = this.amazonOffer;
            } else if (
                this.data[this.offerGuenstig]["preis"] == this.data[this.amazonOffer]["preis"] &&
                this.data[this.offerGuenstig]["cpc"] >= this.data[this.amazonOffer]["cpc"]
            ) {
                offerOut = this.amazonOffer;
            }
        }

        return this.data[offerOut];
    };

    getAngebotBesterCPC = (withAmazon = true) => {
        if (this.offerBestCPC === null) {
            return null;
        }

        let offerOut = this.offerBestCPC;
        if (withAmazon && this.amazonOffer !== null) {
            if (this.data[this.offerBestCPC]["preis"] > this.data[this.amazonOffer]["preis"]) {
                offerOut = this.amazonOffer;
            } else if (
                this.data[this.offerBestCPC]["preis"] == this.data[this.amazonOffer]["preis"] &&
                this.data[this.offerBestCPC]["cpc"] >= this.data[this.amazonOffer]["cpc"]
            ) {
                offerOut = this.amazonOffer;
            }
        }

        return this.data[offerOut];
    };

    orderByPreisASC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            if (a["preis"] > b["preis"]) {
                return 1;
            }

            if (a["preis"] < b["preis"]) {
                return -1;
            }

            if (a["cpc"] > b["cpc"]) {
                return -1;
            }

            if (a["cpc"] < b["cpc"]) {
                return 1;
            }

            return 0;
        });
    };

    orderByCPC = () => {
        if (!this.isLoad) {
            return null;
        }

        this.data = this.data.sort((a, b) => {
            if (a["herkunft"] == "A" && b["herkunft"] != "A") {
                return -1;
            }

            if (b["herkunft"] == "A" && a["herkunft"] != "A") {
                return 1;
            }

            if (a["herkunft"] == "E" && b["herkunft"] != "E") {
                return -1;
            }

            if (b["herkunft"] == "E" && a["herkunft"] != "E") {
                return 1;
            }

            if (a["cpc"] > b["cpc"]) {
                return -1;
            }

            if (a["cpc"] < b["cpc"]) {
                return 1;
            }

            return 0;
        });
    };

    getAngebote = (start = null, length = null) => {
        if (start === null) {
            return this.data;
        }

        if (length !== null && length < 1) {
            return [];
        }

        if (length && start + length <= this.countOffers()) {
            return this.data.slice(start, start + length);
        }

        return this.data.slice(start);
    };

    sortByPreis = (offers) => {
        offers = offers.sort((a, b) => {
            if (!a || !b) return 0;

            if (a["preis"] > b["preis"]) {
                return 1;
            }

            if (a["preis"] < b["preis"]) {
                return -1;
            }

            return 0;
        });

        return offers;
    };

    getPromotedOffer = () => {
        if (this.promotedOffer === null) {
            return null;
        }

        return this.data[this.promotedOffer];
    };

    getAmazonOffer = () => {
        if (this.amazonOffer === null) {
            return null;
        }

        return this.data[this.amazonOffer];
    };

    getOttoOffer = () => {
        if (this.ottoOffer === null) {
            return null;
        }

        return this.data[this.ottoOffer];
    };

    sortByPreis = (offers) => {
        offers = offers.sort((a, b) => {
            if (!a || !b) return 0;

            return a["preis"] > b["preis"];
        });

        return offers;
    };

    countOffers = () => {
        return Array.isArray(this.data) ? this.data.length : 0;
    };

    getBestPrice = (formatted = true) => {
        return formatted ? numberFormat(this.bestPrice, 2) : Math.round(this.bestPrice * 100) / 100;
    };

    getWorstPrice = (formatted = true) => {
        return formatted ? numberFormat(this.worstPrice, 2) : Math.round(this.worstPrice * 100) / 100;
    };

    static getByID = async (id) => {
        const obj = new Angebote(id);

        await obj.load();

        return obj;
    };
}

module.exports = Angebote;
