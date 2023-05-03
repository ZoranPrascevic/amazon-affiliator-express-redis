const Hersteller = require("../class.Hersteller");
const Kategorie = require("../class.Kategorie");
const Produktliste = require("../class.Produktliste");
const db = require("./../../db/db-connection");

const { getNote, formatDate, getStaticDateTime, numberFormat, isNumeric } = require("../../utils/functions.inc");

const {
    SITE_URL,
    ANZAHL_FILTER_KOMBI_KATEGORIE,
    ANZAHL_PRODUKTE_KATEGORIE,
    ANZAHL_PRODUKTE_NISCHENKATEGORIE,
    ANZAHL_KATEGORIE_PRODUKT_DATENBLATT,
    MODUL_LINKS_HIDE,
    ANZAHL_PAGES_KATEGORIEN,
} = require("../../constants/globals");

const Strings = require("../class.Strings");

class PageKategorie {
    kategorie = null;

    hersteller = "";
    filterURL = "";
    sonderFilter = "";
    sortierung = "";

    filterKombi = null;
    aktiveFilter = null;
    produktListe = null;
    filterParams = [];

    identifier = "";
    page = 1;

    SNIPPETS = false;

    cHersteller = null;

    min = 0;
    max = Number.MAX_SAFE_INTEGER;
    minMaxFlag = false;

    constructor() {}

    load = async (req) => {
        this.identifier = req.params.categoryName;
        if (req.params.hasOwnProperty("page") && req.params.page !== undefined) this.page = req.params.page;
        else this.page = 1;

        if (isNumeric(req.params.baseID)) {
            this.page = parseInt(req.params.baseID);
            req.params.baseID = undefined;
            req.params.secondaryID = undefined;
        } else if (isNumeric(req.params.secondaryID)) {
            this.page = parseInt(req.params.secondaryID);
            req.params.secondaryID = undefined;
        }

        if (req.params.baseID && req.params.secondaryID) {
            this.hersteller = req.params.baseID;
            this.filterURL = req.params.secondaryID;
        } else if (req.params.baseID && !req.params.secondaryID) {
            let checkResult = false;
            const queryArray = req.params.baseID.split("_");

            for (let i = 0; i < queryArray.length; i++) {
                let tmpResult = await Hersteller.checkHersteller(queryArray[i]);

                if (tmpResult) {
                    checkResult = true;
                    break;
                }
            }

            if (checkResult) {
                this.hersteller = req.params.baseID;
                this.filterURL = "";
            } else {
                this.filterURL = req.params.baseID;
                this.hersteller = "";
            }
        } else {
            this.hersteller = "";
            this.filterURL = "";
        }

        if (req.query.min) this.min = parseFloat(req.query.min);
        else this.min = 0;

        if (req.query.max) this.max = parseFloat(req.query.max);
        else this.max = Number.MAX_SAFE_INTEGER;

        if (req.query.max || req.query.min) this.minMaxFlag = true;
        else this.minMaxFlag = false;

        this.kategorie = await Kategorie.getByURL(this.identifier);

        if (!this.kategorie.getIsLoad) {
            throw new Error(`Kategorie "${this.identifier}" nicht gefunden`);
        }

        let data = {};

        if (this.kategorie.getIsLeaf) {
            data = await this.loadKategorie();
        } else {
            data = await this.loadHauptkategorie();
        }

        return data;
    };

    loadKategorie = async () => {
        const filterArray = this.filterURL.trim() ? this.filterURL.split("-") : [];

        this.produktListe = new Produktliste(
            this.kategorie,
            this.hersteller,
            filterArray,
            this.minMaxFlag,
            this.min,
            this.max,
            this.sonderFilter,
            this.sortierung
        );

        await this.produktListe.load();
        this.aktiveFilter = await this.produktListe.checkFilter();
        this.filterKombi = this.produktListe.getFilterKombi();
        this.filter = await this.produktListe.getFilter();

        // const makeKategorieHeadline = await this.makeKategorieHeadline();
        const makeKategorieHauptbox = await this.makeKategorieHauptbox();
        // const makeKategorieInfobox = await this.makeKategorieInfobox();

        const contentText = await this.makeKategorieText();
        // const contentFilterKombis = await this.makeKategorieFilterkombinationen();

        // const vars = {
        //     "kategorieName": this.kategorie.data.kategorieName,
        //     "showBoxBottom" : contentText || contentFilterKombis
        // }

        return { ...makeKategorieHauptbox, contentText };
    };

    loadHauptkategorie = async () => {
        const makeHauptkategorieChildbox = await this.makeHauptkategorieChildbox();

        return makeHauptkategorieChildbox;
    };

    makeKategorieHeadline = async () => {
        let titleOut = "";

        if (this.hersteller && !this.cHersteller) {
            this.cHersteller = await Hersteller.getByURL(this.hersteller);
        }

        if (this.filterKombi["title"]) {
            titleOut += this.filterKombi["title"];
        } else {
            if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"]) {
                if (this.sonderFilter === "testsieger") titleOut += "Testsieger: ";

                if (this.hersteller) titleOut += `${this.cHersteller.herstellerName} `;

                if (this.aktiveFilter.length === 1 && this.aktiveFilter[0]["title"])
                    titleOut += this.aktiveFilter[0]["title"];
            } else {
                if (this.hersteller) titleOut += `${this.cHersteller.herstellerName} `;

                if (!titleOut.includes(this.kategorie.data.kategorieName))
                    titleOut += `${this.kategorie.data.kategorieName} `;

                if (this.sonderFilter === "testsieger") titleOut += "Testsieger ";
            }

            if (this.aktiveFilter.length === 1) {
                if (this.aktiveFilter[0]["fnAnzeigeKategorie"] || this.aktiveFilter[0]["fkAnzeigeKategorie"])
                    titleOut += `${this.aktiveFilter[0]["name"]} `;
                titleOut += `${this.aktiveFilter[0]["anzeige"]} `;
            }

            titleOut = titleOut.trim();
        }

        let titleOut2 = "";

        if (this.kategorie.data.nischenkategorie)
            titleOut2 = `1-${Math.min(
                ANZAHL_PRODUKTE_KATEGORIE - (ANZAHL_PRODUKTE_KATEGORIE - ANZAHL_PRODUKTE_NISCHENKATEGORIE),
                this.produktListe.getProductCount()
            )} von ${numberFormat(this.produktListe.getProductCount(), 0)}`;
        else
            titleOut2 = `1-${Math.min(
                ANZAHL_PRODUKTE_KATEGORIE,
                this.produktListe.getProductCount()
            )} von ${numberFormat(this.produktListe.getProductCount(), 0)}`;

        const vars = {
            titleH1: titleOut,
            title2: titleOut2,
            showTitle2: titleOut2 != "",
            showSortBox: titleOut2 && !this.kategorie.data.amazonIDs,
            selectBeliebt: `${!this.sortierung ? ' selected="selected"' : ""}`,
            selectPreisA: `${this.sortierung === "preisA" ? ' selected="selected"' : ""}`,
            selectPreisD: `${this.sortierung === "preisD" ? ' selected="selected"' : ""}`,
            selectAngD: `${this.sortierung === "angD" ? ' selected="selected"' : ""}`,
            selectTests: `${this.sortierung === "neueTests" ? ' selected="selected"' : ""}`,
        };

        return vars;
    };

    makeKategorieHauptbox = async () => {
        const testreihen = await this.kategorie.getTestreihen();
        const produktCount = this.produktListe.getProductCount();

        if (this.kategorie.data.nischenkategorie) {
            var anzahl = ANZAHL_PRODUKTE_NISCHENKATEGORIE;
            var maxSeite = 1;
            if (produktCount > ANZAHL_PRODUKTE_NISCHENKATEGORIE && !this.filterURL) {
                produktCount = ANZAHL_PRODUKTE_NISCHENKATEGORIE;
            }

            var start = 0;
        } else {
            var anzahl = ANZAHL_PRODUKTE_KATEGORIE;
            var maxSeite = Math.ceil(produktCount / ANZAHL_PRODUKTE_KATEGORIE);
            this.page = Math.min(this.page, maxSeite);

            if (this.page === 0) this.page = 1;
            var start = anzahl * (this.page - 1);
        }

        this.produkte = await this.produktListe.getItems(start, anzahl);

        let i = 0;
        let contentProdukte = [];

        Object.keys(this.produkte).forEach((key) => {
            const produkt = this.produkte[key];

            const preis = parseFloat(produkt["preis"] ? produkt["preis"].replace(",", "") : "");

            i++;

            const datenblatt = produkt["datenblatt"].slice(0, ANZAHL_KATEGORIE_PRODUKT_DATENBLATT);

            contentProdukte.push({
                produktID: produkt["id"],
                produktName: Strings.makeHtmlentities(produkt["pname"]),
                // produktNameKurz: Strings.makeHtmlentities(
                //     produkt["pname"].substring(0, 45) + produkt["pname"].length > 45 ? "..." : ""
                // ),
                produktURL: produkt["produktURL"],
                // produktLink: produkt["produktLink"],
                produktBildURL: produkt["img"],
                produktBildBreite: produkt["breite"],
                herstellerName: produkt["hersteller"],
                datenblatt: datenblatt,
                showBottomBox: produkt["tests"] || produkt["angebote"] || produkt["meinungen"],
                showMeinungen: produkt["meinungen"],
                // showAngebote: produkt["angebote"] > 0,
                // showTestnote: produkt["tests"] > 0,
                score: produkt["score"],
                anzahlTests: produkt["tests"],
                // isTestsMehrzahl: produkt["tests"] > 1,
                anzahlSterne: produkt["meinungenStars"],
                anzahlMeinungen: produkt["meinungen"],
                // isAngeboteMehrzahl: produkt["angebote"] > 1,
                produktPreis: produkt["preis"],
                anzahlAngebote: produkt["angebote"],
                testNoteText: getNote(produkt["score"], produkt["tests"]),
                // isLinkMaskiert: MODUL_LINKS_HIDE && (produkt["noIndex2"] || this.kategorie.data.noIndex == 1),
                // isLinkNofollow: !MODUL_LINKS_HIDE && (produkt["noIndex2"] || this.kategorie.data.noIndex == 1),
                ean: produkt["ean"],
                eek: produkt["energieEffizienzKlasse"],
                // eekC: produkt["energieEffizienzKlasse"].toLowerCase().replace("+", "p"),
                // showEEK: produkt["energieEffizienzKlasse"] != "",
            });
        });

        const contentFilter = {
            filter: this.filter["filter"],
            gesetzteFilter: this.filter["gesetzt"],
        };

        const pages = Math.ceil(this.produktListe.getProductCount() / anzahl);
        const pagingLast = Math.min(ANZAHL_PAGES_KATEGORIEN, pages);

        let pageList = [];
        for (let i = 0; i < pagingLast; i++) {
            pageList.push({
                seite: i,
            });
        }

        const sql = `
            SELECT anzahlTotalTests FROM kategorien WHERE id=?
        `;
        const anzahlTotalTests = await db.query(sql, [this.kategorie.data.id]);

        const kategorieInfobox = this.makeKategorieInfobox();

        const contentKategorieHauptbox = {
            kategorieName: this.kategorie.data.kategorieName,
            anzahlTotalTests: anzahlTotalTests[0]["anzahlTotalTests"],
            testreihen: testreihen,
            contentFilter: contentFilter,
            contentProdukte: contentProdukte,
            kategorieInfobox: kategorieInfobox,
            totalProductCount: this.max >= this.min ? produktCount : 0,
            currentPage: this.max >= this.min ? this.page : 0,
            maxPage: this.max >= this.min ? maxSeite : 0,
            minVal: this.produktListe.sliderMin,
            maxVal: this.produktListe.sliderMax,
        };

        return contentKategorieHauptbox;
    };

    makeKategorieInfobox = async () => {
        let contentInfoBox = {};

        if (
            !this.sortierung &&
            !this.hersteller &&
            ((!this.kategorie.data.kategorieText.length && !this.kategorie.data.glossar.length) || this.filterURL)
        ) {
            let descTitle = "";
            let catDescAnzeige = "";

            if (this.hersteller && !this.cHersteller) {
                var cHersteller = await Hersteller.getByURL(this.hersteller);
            }

            let videoCode = "";
            let bildCode = "";

            if (this.aktiveFilter.length === 1 && !this.sonderFilter && this.aktiveFilter[0]["description"]) {
                catDescAnzeige = Strings.replacePseudoCode(this.aktiveFilter[0]["description"]);
                videoCode = Strings.replacePseudoCode(this.aktiveFilter[0]["video"]);
                bildCode = Strings.replacePseudoCode(this.aktiveFilter[0]["bild"]);
            } else if (this.filterKombi && this.filterKombi["beschreibungText"]) {
                catDescAnzeige = this.filterKombi["beschreibungText"];
            } else if (this.kategorie.data.CATDESCTOP && !this.sonderFilter && !this.aktiveFilter.length) {
                catDescAnzeige = this.kategorie.data.CATDESCTOP;
            } else if (this.kategorie.data.CATDESCBOTTOM && !this.sonderFilter && !this.aktiveFilter.length) {
                catDescAnzeige = this.kategorie.data.CATDESCBOTTOM;
            } else if (
                this.kategorie.data.nischenkategorie &&
                this.produktListe.getProductCount() > 2 &&
                !this.kategorie.data.kategorieText.length
            ) {
                if (this.filterKombi && this.filterKombi["title"]) {
                    descTitle += this.filterKombi["title"];
                } else if (this.aktiveFilter.length == 1 && this.aktiveFilter[0]["title"]) {
                    descTitle += this.aktiveFilter[0]["title"];
                } else if (this.aktiveFilter.length) {
                    this.aktiveFilter.forEach((v) => {
                        if (v["fnAnzeigeKategorie"] || v["fkAnzeigeKategorie"]) {
                            descTitle += v["name"] + " ";
                        }
                        descTitle += v["anzeige"] + " ";
                    });

                    if (descTitle.includes(this.kategorie.data.kategorieName) === false) {
                        descTitle += " " + this.kategorie.data.kategorieName;
                    }
                } else {
                    descTitle = this.kategorie.data.kategorieName;
                }

                let kategorieNameText = "";
                if (this.filterKombi && this.filterKombi["title"]) {
                    kategorieNameText += this.filterKombi["title"];
                } else {
                    if (this.aktiveFilter.length == 1 && this.aktiveFilter[0]["title"]) {
                        if (this.sonderFilter == "testsieger") {
                            kategorieNameText += "Testsieger: ";
                        }
                        if (this.hersteller) {
                            kategorieNameText += cHersteller.herstellerName + " ";
                        }
                        if (this.aktiveFilter.length == 1 && this.aktiveFilter[0]["title"]) {
                            kategorieNameText += this.aktiveFilter[0]["title"];
                        }
                    } else {
                        if (this.hersteller) {
                            kategorieNameText += cHersteller.herstellerName + " ";
                        }
                        if (kategorieNameText.includes(this.kategorie.data.kategorieName) === false) {
                            kategorieNameText += this.kategorie.data.kategorieName + " ";
                        }
                        if (this.sonderFilter == "testsieger") {
                            kategorieNameText += "Testsieger ";
                        }

                        if (this.aktiveFilter.length == 1) {
                            if (
                                this.aktiveFilter[0]["fnAnzeigeKategorie"] ||
                                this.aktiveFilter[0]["fkAnzeigeKategorie"]
                            ) {
                                kategorieNameText += this.aktiveFilter[0]["name"] + " ";
                            }
                            kategorieNameText += this.aktiveFilter[0]["anzeige"] + " ";
                        }
                    }

                    kategorieNameText = kategorieNameText.trim();
                }

                catDescAnzeige = {
                    boxTitle: kategorieNameText,
                    produkteAnzahl: this.produktListe.getProductCount(),
                    produkte: this.produkte,
                    kategorieName: this.kategorie.data.kategorieName,
                };
            }

            let titleOut = "";

            if (descTitle) {
                titleOut = descTitle;
            } else if (this.filterKombi && this.filterKombi["title"]) {
                titleOut += this.filterKombi["title"];
            } else {
                if (this.sonderFilter == "testsieger") {
                    titleOut += "Testsieger: ";
                }
                if (this.hersteller) {
                    titleOut += cHersteller.herstellerName + " ";
                }
                if (this.aktiveFilter.length == 1 && this.aktiveFilter[0]["title"]) {
                    titleOut += this.aktiveFilter[0]["title"];
                } else {
                    if (this.aktiveFilter.length) {
                        this.aktiveFilter.forEach((v) => {
                            if (v["fnAnzeigeKategorie"] || v["fkAnzeigeKategorie"]) {
                                titleOut += v["name"] + " ";
                            }
                            titleOut += v["anzeige"] + " ";
                        });
                    }

                    if (titleOut.includes(this.kategorie.data.kategorieName) === false) {
                        titleOut += " " + this.kategorie.data.kategorieName;
                    }
                }
            }

            if (catDescAnzeige) {
                contentInfoBox = {
                    title: titleOut,
                    video: videoCode,
                    bild: bildCode,
                    text: Strings.descReplace(catDescAnzeige),
                };
            }
        }

        return contentInfoBox;
    };

    makeKategorieText = async () => {
        let contentKategorieText = {};

        if (
            (this.kategorie.data.kategorieText.length > 1 || this.kategorie.data.glossar.length) &&
            !this.sortierung &&
            !this.sonderFilter &&
            !this.hersteller &&
            !this.filterURL
        ) {
            let pub = formatDate(this.kategorie.data.kategorieTextPublished);
            let mod = getStaticDateTime();

            let iK = 1;
            let naviBox = [];
            let kategorieText = this.kategorie.data.kategorieText;

            for (const k in Object.keys(this.kategorie.data.kategorieText)) {
                const v = this.kategorie.data.kategorieText[k];

                naviBox.push({
                    id: Strings.manURLEncode(v["ueberschrift"]),
                    active: !k ? " active" : "",
                    ueberschrift: iK + ". " + v["ueberschrift"],
                });

                kategorieText[k]["kategorieText"] = Strings.replacePseudoCode(v["kategorieText"]);
                kategorieText[k]["pos"] = iK;
                iK++;

                if (this.kategorie.data.glossar.length) {
                    naviBox.push({
                        id: "glossar",
                        active: !k ? " active" : "",
                        ueberschrift: iK + ". Glossar",
                    });
                }
            }

            contentKategorieText = {
                kategorieLink: SITE_URL + "/" + this.kategorie.data.kategorieURL,
                dateTimePub: pub,
                dateTimeMod: mod,
                kategorieText: kategorieText,
                glossar: this.kategorie.data.glossar,
                glossarPos: iK,
                textBottom: this.kategorie.data.CATDESCBOTTOM,
            };
        }

        return contentKategorieText;
    };

    makeKategorieFilterkombinationen = async () => {
        let contentFilterKombinationen = {};
        let filterKombinationen = await this.kategorie.getFilterKombinationen();

        if (
            !this.kategorie.data.nischenkategorie &&
            !this.sonderFilter &&
            !this.filterURL &&
            filterKombinationen.length
        ) {
            let ret = [];

            if (filterKombinationen.length > ANZAHL_FILTER_KOMBI_KATEGORIE)
                filterKombinationen = filterKombinationen.slice(0, ANZAHL_FILTER_KOMBI_KATEGORIE);

            filterKombinationen.forEach((fk) => {
                ret.push(fk);
            });

            contentFilterKombinationen = {
                contentFilterKombinationen: {
                    filterKombinationen: ret,
                },
            };
        }
        return contentFilterKombinationen;
    };

    makeHauptkategorieChildbox = async () => {
        const childs = await this.kategorie.getChilds();

        let kategorieBoxen = [];

        childs.forEach((child) => {
            child = Object.values(child)[0];

            let kategorieChildBox = [];
            if (child.hasOwnProperty("childs")) {
                child["childs"].forEach((ch) => {
                    kategorieChildBox.push({
                        kategorieBildLink: ch["kategorieBild"],
                        kategorieName: ch["kategorieName"],
                        kategorieLink: ch["link"],
                    });
                });
            }

            kategorieBoxen.push({
                kategorieBildLink: child["kategorieBildE"],
                kategorieName: child["kategorieName"],
                kategorieLink: child["link"],
                kategorieChildBox: kategorieChildBox,
            });
        });

        const contentChilds = {
            kategorieBoxen: kategorieBoxen,
        };

        return contentChilds;
    };
}

module.exports = new PageKategorie();
