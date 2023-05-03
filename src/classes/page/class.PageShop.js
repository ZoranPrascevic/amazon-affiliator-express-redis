const HttpException = require("../../utils/HttpException.utils");
const Shop = require("../class.Shop");

const { validURL, validateEmail, ProduktDMYFormatDate } = require("../../utils/functions.inc");
const { GOOGLE_CAPTCHA_SECRET, PORTAL_NAME_TBCOM, CDN_SHOPS, ANZAHL_SHOP_BEWERTUNGEN } = require("../../constants/globals");

const requestService = require("../../service/request");

class PageShop {
    action = "";
    code = "";

    shop = null;
    shopBewertung = 0;
    shopBewertungen = null;

    shopName = "";
    shopURL = "";
    firma = "";
    ansprechpartner = "";
    strasse = "";
    plz = "";
    ort = "";
    telefon = "";
    email = "";
    reCaptchaResponse = "";
    saveData = false;

    ipAddress = "";
    identifier = "";

    constructor() {}

    load = async (req) => {
        this.identifier = req.params.shopName;

        if (req.params.page) this.page = parseInt(req.params.page);
        else this.page = 1;

        if (this.action != "register") {
            this.shop = await Shop.getByURL(this.identifier);

            if (!this.shop.isLoad) {
                throw new HttpException(502, "Shop " + this.identifier + " konnte nicht geladen werden");
            }
        }

        if (this.action) {
            switch (this.action) {
                case "register":
                    this.register();
                    break;
                default:
                    break;
            }
        } else {
            this.shopBewertungen = await this.shop.getShopbewertungen();

            const contentTopBox = this.makeTopBox();
            const contentBewertungen = this.makeBewertungenBox();

            const totalPageCount = Math.ceil(this.shopBewertungen.countBewertungen() / ANZAHL_SHOP_BEWERTUNGEN);

            const vars = {
                contentTopBox,
                contentBewertungen,
                pageNumber: this.page,
                totalPageCount: totalPageCount
            };

            return vars;
        }
    };

    makeTopBox = () => {
        const notenListe = this.shopBewertungen.getNotenliste().reverse();

        const last = [
            this.shopBewertungen.getLastRating(0),
            this.shopBewertungen.getLastRating(1),
            this.shopBewertungen.getLastRating(2),
            this.shopBewertungen.getLastRating(3),
            this.shopBewertungen.getLastRating(4),
        ];

        let positiv = {};
        let kritisch = {};

        for (const [star, bwn] of last.entries()) {
            if (star < 3 && bwn && (!kritisch || kritisch["datum"] < bwn["datum"])) {
                kritisch = bwn;
            } else if (star > 2 && bwn && (!positiv || positiv["datum"] < bwn["datum"])) {
                positiv = bwn;
            }
        }

        let contentSterneListe = [];
        for (const stern in notenListe) {
            if (Object.hasOwnProperty.call(notenListe, stern)) {
                const anz = notenListe[stern];
                contentSterneListe.push({
                    sterne: stern,
                    anzahl: anz,
                });
            }
        }

        let bewertungenDetail = {};
        bewertungenDetail["Seitengestaltung"] = this.shop.data.bewertungSeite;
        bewertungenDetail["Suche"] = this.shop.data.bewertungSuche;
        bewertungenDetail["Produktumfang"] = this.shop.data.bewertungProdukt;
        bewertungenDetail["Produktbeschreibungen"] = this.shop.data.bewertungBeschreibung;
        bewertungenDetail["Preise"] = this.shop.data.bewertungPreise;
        bewertungenDetail["Bestellvorgang"] = this.shop.data.bewertungBestellung;
        bewertungenDetail["Zahlungsmöglichkeiten"] = this.shop.data.bewertungZahlung;
        bewertungenDetail["Versandkosten"] = this.shop.data.bewertungVersand;
        bewertungenDetail["Lieferzeit"] = this.shop.data.bewertungLieferzeit;
        bewertungenDetail["Verpackung"] = this.shop.data.bewertungVerpackung;
        bewertungenDetail["Kundenservice"] = this.shop.data.bewertungService;

        let bewertungDetails = [];
        for (const text in bewertungenDetail) {
            if (Object.hasOwnProperty.call(bewertungenDetail, text)) {
                const stars = bewertungenDetail[text];
                bewertungDetails.push({
                    showHalf: true,
                    showGreyStars: !stars,
                    bewertungText: text,
                    bewertungStars: stars,
                });
            }
        }

        let lieferdienste = {
            logo: {},
            text: {},
        };

        if (this.shop.data.deliveryPost) {
            lieferdienste["logo"]["post"] = "Post";
        }
        if (this.shop.data.deliveryUPS) {
            lieferdienste["logo"]["ups"] = "UPS";
        }
        if (this.shop.data.deliveryUPS) {
            lieferdienste["logo"]["dhl"] = "DHL";
        }
        if (this.shop.data.deliveryGP) {
            lieferdienste["test"]["gp"] = "GP";
        }
        if (this.shop.data.deliveryDPD) {
            lieferdienste["logo"]["dpd"] = "DPD";
        }
        if (this.shop.data.deliveryGLS) {
            lieferdienste["logo"]["gls"] = "GLS";
        }
        if (this.shop.data.deliveryHermes) {
            lieferdienste["logo"]["hermes"] = "Hermes";
        }
        if (this.shop.data.deliveryTNT) {
            lieferdienste["logo"]["tnt"] = "TNT";
        }
        if (this.shop.data.deliveryTransOFlex) {
            lieferdienste["logo"]["transoflex"] = "Trans o Flex";
        }
        if (this.shop.data.deliverySpedition) {
            lieferdienste["text"]["spedition"] = "Spedition";
        }
        if (this.shop.data.deliveryOther) {
            lieferdienste["text"]["andere"] = "Andere";
        }

        let zahlarten = {
            logo: {},
            text: {},
        };
        if (this.shop.data.paymentVisa) {
            zahlarten["logo"]["visa"] = "Visa";
        }
        if (this.shop.data.paymentAmericanExpress) {
            zahlarten["logo"]["amex"] = "Amex";
        }
        if (this.shop.data.paymentMastercard) {
            zahlarten["logo"]["master"] = "Mastercard";
        }
        if (this.shop.data.paymentJCB) {
            zahlarten["logo"]["jcb"] = "JCB";
        }
        if (this.shop.data.paymentDelta) {
            zahlarten["logo"]["delta"] = "Delta";
        }
        if (this.shop.data.paymentSwitch) {
            zahlarten["logo"]["switch"] = "Switch";
        }
        if (this.shop.data.paymentSolo) {
            zahlarten["logo"]["solo"] = "Solo";
        }
        if (this.shop.data.paymentCOD) {
            zahlarten["text"]["nachnahme"] = "Nachnahme";
        }
        if (this.shop.data.paymentInAdvance) {
            zahlarten["text"]["vorkasse"] = "Vorkasse";
        }
        if (this.shop.data.paymentInvoice) {
            zahlarten["text"]["rechnung"] = "Rechnung";
        }
        if (this.shop.data.paymentVCheck) {
            zahlarten["text"]["vcheck"] = "VCheck";
        }
        if (this.shop.data.paymentDebit) {
            zahlarten["text"]["ec"] = "EC-Karte";
        }
        if (this.shop.data.paymentFinance) {
            zahlarten["text"]["finanzierung"] = "Finanzierung";
        }
        if (this.shop.data.paymentPaybox) {
            zahlarten["logo"]["paybox"] = "PayBox";
        }
        if (this.shop.data.paymentPaySafeCard) {
            zahlarten["logo"]["paysafecard"] = "PaysafeCard";
        }
        if (this.shop.data.paymentCashAtPickup) {
            zahlarten["text"]["bar"] = "Barzahlung bei Abholung";
        }
        if (this.shop.data.paymentPayPal) {
            zahlarten["logo"]["paypal"] = "PayPal";
        }
        if (this.shop.data.paymentSofortUeberweisung) {
            zahlarten["logo"]["sofort"] = "Sofortüberweisung";
        }
        if (this.shop.data.paymentBarzahlen) {
            zahlarten["text"]["barzahlen"] = "Barzahlen";
        }
        if (this.shop.data.paymentPayMorow) {
            zahlarten["text"]["paymorrow"] = "Paymorrow";
        }
        if (this.shop.data.paymentAmazon) {
            zahlarten["logo"]["amazon"] = "Amazon";
        }
        if (this.shop.data.paymentGiropay) {
            zahlarten["logo"]["giropay"] = "Giropay";
        }
        if (this.shop.data.paymentOther) {
            zahlarten["text"]["andere"] = "Andere";
        }

        const contentTopBox = {
            shopLogoURL: CDN_SHOPS + "/" + this.shop.data.shopLogo,
            shopLink: this.shop.data.shopURLReal,
            bewertungStars: this.shopBewertungen.getBewertungenStars(),
            contentSterneListe: contentSterneListe,
            firmaName: this.shop.data.shopNameReal,
            shopStrasse: this.shop.data.addressStreet,
            shopPLZ: this.shop.data.addressZIP,
            shopOrt: this.shop.data.addressCity,
            shopStaat: this.shop.data.addressState,
            shopLand: this.shop.data.addressCountry,
            shopAdressZusatz: this.shop.data.adressAditional,
            contentBewertungDetails: bewertungDetails,
            showBewertungPositiv: Object.keys(positiv).length > 0,
            positivBewertungText: Object.keys(positiv).length ? positiv["bewertungText"] : "",
            positivAnzeigeName: Object.keys(positiv).length ? positiv["anzeigeName"] : "",
            positivBewertungDatum: Object.keys(positiv).length ? ProduktDMYFormatDate(positiv["datum"]) : "",
            positivBewertungSterne: Object.keys(positiv).length ? positiv["bewertungGesamt"] : "",
            showBewertungKritisch: Object.keys(kritisch).length > 0,
            kritischBewertungText: Object.keys(kritisch).length ? kritisch["bewertungText"] : "",
            kritischAnzeigeName: Object.keys(kritisch).length ? kritisch["anzeigeName"] : "",
            kritischBewertungDatum: Object.keys(kritisch).length ? ProduktDMYFormatDate(kritisch["datum"]) : "",
            kritischBewertungSterne: Object.keys(kritisch).length ? kritisch["bewertungGesamt"] : "",
            showZahlarten: Object.keys(zahlarten["text"]).length + Object.keys(zahlarten["logo"]).length > 0,
            showVersandarten: Object.keys(lieferdienste["text"]).length + Object.keys(lieferdienste["logo"]).length > 0,
            lieferdienste: Object.entries(lieferdienste["text"]).join(", "),
            zahlarten: Object.entries(zahlarten["text"]).join(", "),
            payment: zahlarten["logo"],
            delivery: lieferdienste["logo"],
        };

        return contentTopBox;
    };

    makeBewertungenBox = () => {
        let start;
        let end;

        if (this.page !== undefined) {
            start = ANZAHL_SHOP_BEWERTUNGEN * (this.page - 1);
            end = ANZAHL_SHOP_BEWERTUNGEN * this.page;
        } else {
            start = 0;
            end = ANZAHL_SHOP_BEWERTUNGEN;
        }

        const bewertungen = this.shopBewertungen.getBewertungen(start, end);

        let contentBewertungenList = [];
        for (const bwn of bewertungen) {
            let bewertungenDetail = {};
            bewertungenDetail["Seitengestaltung"] = bwn["bewertungSeite"];
            bewertungenDetail["Suche"] = bwn["bewertungSuche"];
            bewertungenDetail["Produktumfang"] = bwn["bewertungProdukt"];
            bewertungenDetail["Produktbeschreibungen"] = bwn["bewertungBeschreibung"];
            bewertungenDetail["Preise"] = bwn["bewertungPreise"];
            bewertungenDetail["Bestellvorgang"] = bwn["bewertungBestellung"];
            bewertungenDetail["Zahlungsmöglichkeiten"] = bwn["bewertungZahlung"];
            bewertungenDetail["Versandkosten"] = bwn["bewertungVersand"];
            bewertungenDetail["Lieferzeit"] = bwn["bewertungLieferzeit"];
            bewertungenDetail["Verpackung"] = bwn["bewertungVerpackung"];
            bewertungenDetail["Kundenservice"] = bwn["bewertungService"];

            let bewertungDetails = [];
            for (const text in bewertungenDetail) {
                if (Object.hasOwnProperty.call(bewertungenDetail, text)) {
                    const stars = bewertungenDetail[text];
                    bewertungDetails.push({
                        showHalf: false,
                        showGreyStars: !stars,
                        bewertungText: text,
                        bewertungStars: stars,
                    });
                }
            }

            contentBewertungenList.push({
                bewertungID: bwn["id"],
                bewertungSterne: bwn["bewertungGesamt"],
                bewertungTitel: bwn["titel"],
                anzeigeName: bwn["anzeigeName"],
                bewertungDatum: ProduktDMYFormatDate(bwn["datum"]),
                empfehlen: bwn["empfehlen"] == 1,
                einkaufen: bwn["einkaufen"] == 1,
                showComplete: bwn["bewertungTextKomplett"].length < 1000,
                bewertungTextKomplett: bwn["bewertungTextKomplett"],
                contentDetails: bewertungDetails,
            });
        }

        const contentBewertungen = {
            anzahlBewertungen: this.shopBewertungen.countBewertungen(),
            anzahlBewertungenPager: this.shopBewertungen.countBewertungen(),
            showHint: !this.shopBewertungen.countBewertungen(),
            showPager: this.shopBewertungen.countBewertungen() > ANZAHL_SHOP_BEWERTUNGEN,
            firstOpinion: 1,
            lastOpinion: Math.min(this.shopBewertungen.countBewertungen(), ANZAHL_SHOP_BEWERTUNGEN),
            contentBewertungenList: contentBewertungenList,
        };

        return contentBewertungen;
    };

    register = () => {
        let success = false;
        let error = false;
        let errorShopName = false;
        let errorShopURL = false;
        let errorFirma = false;
        let errorAnsprechpartner = false;
        let errorStrasse = false;
        let errorPLZ = false;
        let errorOrt = false;
        let errorTelefon = false;
        let errorMail = false;
        let errorCaptcha = false;

        if (this.saveData) {
            if (this.shopName.length < 2) {
                errorShopName = true;
                error = true;
            }

            if (!validURL(this.shopURL)) {
                errorShopURL = true;
                error = true;
            }

            if (this.firma.length < 2) {
                errorFirma = true;
                error = true;
            }

            if (this.ansprechpartner.length < 2) {
                errorAnsprechpartner = true;
                error = true;
            }

            if (this.strasse.length < 5) {
                errorStrasse = true;
                error = true;
            }

            if (this.plz.length < 5) {
                errorPLZ = true;
                error = true;
            }

            if (this.ort.length < 2) {
                errorOrt = true;
                error = true;
            }

            if (this.telefon.length < 8) {
                errorTelefon = true;
                error = true;
            }

            if (!validateEmail(this.email)) {
                errorMail = true;
                error = true;
            }

            if (!this.reCaptchaResponse) {
                errorCaptcha = true;
                error = true;
            } else {
                const url = "https://www.google.com/recaptcha/api/siteverify";
                const data = {
                    secret: GOOGLE_CAPTCHA_SECRET,
                    response: this.reCaptchaResponse,
                    remoteip: this.ipAddress,
                };

                requestService(url, data, (err, response) => {
                    if (err || !response) {
                        errorCaptcha = true;
                        error = true;
                    } else {
                        googleRes = JSON.parse(res);

                        if (googleRes["success"] !== true) {
                            errorCaptcha = true;
                            error = true;
                        }
                    }
                });
            }

            if (!error) {
                let mailText = "";
                mailText += "Shopname: " + this.shopName + "\r\n";
                mailText += "Shopurl: " + this.shopURL + "\r\n";
                mailText += "Firma: " + this.firma + "\r\n";
                mailText += "Ansprechpartner: " + this.ansprechpartner + "\r\n";
                mailText += "Strasse: " + this.strasse + "\r\n";
                mailText += "PLZ / Ort: " + this.plz + " " + this.ort + "\r\n";
                mailText += "Telefon: " + this.telefon + "\r\n";
                mailText += "eMail: " + this.email + "\r\n\r\n";
                mailText += "--\r\n";
                mailText += "Mit freundlichen Grüßen\r\n\r\n";
                mailText += "Ihr " + PORTAL_NAME_TBCOM + "-Team\r\n\r\n";
                mailText += "----------------------------------------------------------\r\n";
                mailText += PORTAL_NAME_TBCOM + "\r\n";
                mailText += "Adelheidstraße 13\r\n";
                mailText += "65185 Wiesbaden\r\n";
                mailText += "Tel.   +49 (0) 611 - 182 267 20\r\n";
                mailText += "Mail:  info@testbericht.de\r\n";
                mailText += "Web:   https://www.testbericht.de\r\n";
                mailText += "----------------------------------------------------------";
            }
        }

        vars = {
            shopName: this.data.shopName,
            shopURL: this.data.shopURL,
            firma: this.data.firma,
            ansprechpartner: this.data.ansprechpartner,
            strasse: this.data.strasse,
            plz: this.data.plz,
            ort: this.data.ort,
            telefon: this.data.telefon,
            email: this.data.email,
            isErrorShopName: errorShopName,
            isErrorShopURL: errorShopURL,
            isErrorFirma: errorFirma,
            isErrorAnsprechpartner: errorAnsprechpartner,
            isErrorStrasse: errorStrasse,
            isErrorPLZ: errorPLZ,
            isErrorOrt: errorOrt,
            isErrorTelefon: errorTelefon,
            isErrorMail: errorMail,
            isErrorCaptcha: errorCaptcha,
            isError: error,
            isSuccess: success,
        };

        return vars;
    };
}

module.exports = new PageShop();
