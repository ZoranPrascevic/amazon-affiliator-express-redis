const Shopbewertungen = require("../classes/class.Shopbewertungen");
const { LAENDERLISTE } = require("../constants/globals");
const db = require("../db/db-connection");

class Shop {
    identifier = "";
    typ = "";
    data = [];
    isLoad = false;

    constructor(identifier, type = "id") {
        this.identifier = identifier;
        this.typ = type.toString();
    }

    load = async () => {
        let where;
        let values;

        switch (this.typ) {
            case "url":
                where = " s.shopURL = ? ";
                values = [this.identifier];
                break;

            case "id":
                where = " s.id = ? ";
                values = [this.identifier];
                break;

            default:
                break;
        }

        if (!where) return false;

        const sql = `
            SELECT
                s.id, s.shopName, s.shopURL, s.bild, s.logoFormat, s.partner, s.csvURL, s.bevorzugterPartner, s.promotedOffer, s.amazon, s.gesperrt,
                sd.shopName shopNameReal, sd.shopURL shopURLReal, sd.description, sd.industrySector, sd.partnerMapping, sd.addressCountry, sd.addressState, sd.addressZIP,
                sd.addressCity, sd.addressStreet, sd.addressAditional, sd.serviceConfidential, sd.serviceDeliveryTrackingSupport, sd.serviceSecureOrderingSSLSupport,
                sd.serviceCustomerDiscountPossible, sd.serviceWebmilesSupport, sd.serviceNewsletterService, sd.serviceSealEHIGermany, sd.serviceSealEHIAustria,
                sd.serviceSealEHIEurope, sd.serviceGiftService, sd.serviceShoppingCartSupport, sd.serviceSearchServiceAvailable, sd.serviceRegistrationAvailable,
                sd.serviceRegistrationRequired, sd.serviceSealTrustedShop, sd.serviceSealTUV, sd.serviceSealVeriSign, sd.serviceSchoberIQMaster, sd.serviceSealBonicert,
                sd.serviceSealAfgis, sd.serviceSealInternet, sd.serviceSealSaferShopping, sd.serviceSealInternetPrivacyStandards, sd.serviceSetSupport,
                sd.servicePersonalCustomerSupport, sd.service24Support, sd.serviceGiftCertificate, sd.serviceDiscountReseller, sd.serviceDiscountEducational,
                sd.serviceWarrantyExtended, sd.serviceWarrantyExchange, sd.serviceWarrantyOnSite, sd.serviceSaleOrReturn, sd.serviceSaleOrReturnCostByCustomer,
                sd.serviceSaleOrReturnCostByMerchant, sd.serviceUserPhone, sd.serviceUserFax, sd.serviceUserEmail, sd.serviceOrderPhone, sd.serviceOrderFax, sd.serviceOrderEmail,
                sd.serviceOtherServiceInfo, sd.serviceOtherDiscountInfo, sd.serviceOtherReturnInfo, sd.serviceURLTermOfConditions, sd.serviceWarrantyPeriodMonth, sd.paymentVisa,
                sd.paymentAmericanExpress, sd.paymentMastercard, sd.paymentDiners, sd.paymentJCB, sd.paymentDelta, sd.paymentSwitch, sd.paymentSolo, sd.paymentCOD,
                sd.paymentInAdvance, sd.paymentInvoice, sd.paymentVCheck, sd.paymentDebit, sd.paymentFinance, sd.paymentPaybox, sd.paymentPaySafeCard, sd.paymentCashAtPickup,
                sd.paymentPayPal, sd.paymentSofortUeberweisung, sd.paymentBarzahlen, sd.paymentPayMorow, sd.paymentAmazon, sd.paymentGiropay, sd.paymentOther,
                sd.paymentAnnotation, sd.deliveryInternational, sd.deliveryImmediate, sd.deliveryPost, sd.deliveryDHL, sd.deliveryUPS, sd.deliveryGP, sd.deliveryDPD, sd.deliveryGLS,
                sd.deliveryHermes, sd.deliveryTNT, sd.deliveryTransOFlex, sd.deliverySpedition, sd.deliveryOther, sd.deliveryMinOrderValue, sd.deliveryForFreeOrderValue,
                sd.deliveryAnnotation,
                sbe.empfehlen, sbe.einkaufen, sbe.bewertungGesamt, sbe.bewertungSeite, sbe.bewertungSuche, sbe.bewertungProdukt, sbe.bewertungBeschreibung, sbe.bewertungPreise,
                sbe.bewertungBestellung, sbe.bewertungZahlung, sbe.bewertungVersand, sbe.bewertungLieferzeit, sbe.bewertungVerpackung, sbe.bewertungService, sbe.bewertungenGesamt
            FROM
                shops s
            LEFT JOIN
                shops_details sd ON(s.id = sd.shopID)
            LEFT JOIN
                shop_bewertungen_erg sbe ON(sbe.shopID = s.id)
            WHERE
                ${where}
            `;

        const res = await db.query(sql, values);

        if (!res.length) {
            return false;
        }

        let row = res[0];

        row["addressCountry"] = LAENDERLISTE[row["addressCountry"]] ? LAENDERLISTE[row["addressCountry"]] : "";
        row["shopLogo"] = row["id"] + "." + row["logoFormat"];

        this.data = row;

        this.isLoad = true;
    };

    getShopbewertungen = async () => {
        const bewertungen = await Shopbewertungen.getByShopID(this.data.id);

        return bewertungen;
    };

    static getByURL = async (shopURL) => {
        const obj = new Shop(shopURL, "url");

        await obj.load();

        return obj;
    };

    static getByID = async (id) => {
        const obj = new Shop(id);

        await obj.load();

        return obj;
    };
}

module.exports = Shop;
