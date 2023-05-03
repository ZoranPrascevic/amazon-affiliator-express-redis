const Produkt = require("../class.Produkt");
const FragenAntworten = require("../class.FragenAntworten");
const Strings = require("../class.Strings");
const { round5 } = require("../class.Math");

const {
    MODUL_LINKS_HIDE,
    MODUL_SOCIAL,
    MODUL_PRODUKT_TESTS_PAGER,
    ANZAHL_PRODUKT_TESTS,
    MODUL_TESTS_MORE_OFFEN,
    MODUL_PROMOTED_OFFER,
    ANZAHL_PRODUKT_ANGEBOTE,
    ANZAHL_PRODUKT_MEINUNGEN,
    ANZAHL_PRODUKT_FRAGEN,
    ANZAHL_PRODUKT_FRAGEN_KATEGORIE,
    ANZAHL_PRODUKT_FRAGEN_KATEGORIE_KEINE,
    SITE_IMG_GOOGLE,
    MODUL_PRODUKT_TOP_PRODUKTE,
    MODUL_PRODUKT_WEITERE_PRODUKTE,
    MODUL_PRODUKT_AEHNLICHE_PRODUKTE,
} = require("./../../constants/globals");

const {
    stripHtmlTags,
    numberFormat,
    getNote,
    ProduktFormatDate,
    ProduktDMYFormatDate,
    nl2br,
    formatDate,
    shuffle,
    addcslashes,
    PreishistorieformatDate,
    htmlEntities,
} = require("../../utils/functions.inc");

class PageProdukt {
    produkt = null;
    kategorie = null;
    testberichte = null;
    hersteller = null;
    angebote = null;
    preishistorie = null;
    meinungen = null;
    fragen = null;
    datenblatt = null;
    showSnippeteFragen = true;

    PRODUKTE_AEHNLICHE = 1;
    PRODUKTE_TOP = 2;
    PRODUKTE_WEITERE = 3;
    ANGEBOTE_SORT_BELIEBT = 1;
    ANGEBOTE_SORT_PREIS_ASC = 2;
    ANGEBOTE_SORT_PREIS_DESC = 3;
    TESTS_SORT_NEU_ASC = 1;
    TESTS_SORT_NEU_DESC = 2;
    TESTS_SORT_NOTE_ASC = 3;
    TESTS_SORT_NOTE_DESC = 4;
    MEINUNGEN_SORT_NEU_ASC = 1;
    MEINUNGEN_SORT_NEU_DESC = 2;
    MEINUNGEN_SORT_NOTE_ASC = 3;
    MEINUNGEN_SORT_NOTE_DESC = 4;
    SNIPPETS = true;
    SNIPPETS_JSON = true;

    MeinungenPage = 1;

    load = async (productName) => {
        this.identifier = productName;

        this.produkt = await Produkt.getByPurl(this.identifier);

        if (!this.produkt.getIsLoad) {
            throw new Error('Produkt "' + this.identifier + '" nicht gefunden');
        }
    };

    queryBoxSummary = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        [
            this.kategorie,
            this.testberichte,
            this.angebote,
            this.preishistorie,
            this.meinungen,
            this.fragen,
            this.datenblatt,
            this.hersteller,
        ] = await Promise.all([
            this.produkt.getKategorie(),
            this.produkt.getTestberichte(),
            this.produkt.getAngebote(),
            this.produkt.getPreishistorie(),
            this.produkt.getMeinungen(),
            this.produkt.getFragen(),
            this.produkt.getDatenblatt(),
            this.produkt.getHersteller(),
        ]);

        // this.kategorie = await this.produkt.getKategorie();
        // this.testberichte = await this.produkt.getTestberichte();
        // this.angebote = await this.produkt.getAngebote();
        // this.preishistorie = await this.produkt.getPreishistorie();
        // this.meinungen = await this.produkt.getMeinungen();
        // this.fragen = await this.produkt.getFragen();
        // this.datenblatt = await this.produkt.getDatenblatt();
        // this.hersteller = await this.produkt.getHersteller();

        const boxSummary = await this.makeBoxSummary();

        return boxSummary;
    };

    queryTestsBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.testberichte = await this.produkt.getTestberichte();

        const testsBox = await this.makeTestsBox();

        return testsBox;
    };

    queryAngeboteBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.angebote = await this.produkt.getAngebote();

        const angeboteBox = await this.makeAngeboteBox();

        return angeboteBox;
    };

    queryPreishistorieBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        [this.angebote, this.preishistorie] = await Promise.all([
            this.produkt.getAngebote(),
            this.produkt.getPreishistorie(),
        ]);

        const preishistorieBox = await this.makePreishistorieBox();

        return preishistorieBox;
    };

    queryMeinungenBox = async (req) => {
        const productName = req.params.productName;
        if (req.params.hasOwnProperty("page") && req.params.page !== undefined) this.MeinungenPage = req.params.page;
        else this.MeinungenPage = 1;

        await this.load(productName);

        [this.angebote, this.meinungen] = await Promise.all([this.produkt.getAngebote(), this.produkt.getMeinungen()]);

        const meinungenBox = await this.makeMeinungenBox();

        return meinungenBox;
    };

    queryFragenBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        [this.kategorie, this.fragen] = await Promise.all([this.produkt.getKategorie(), this.produkt.getFragen()]);

        const fragenBox = await this.makeFragenBox();

        return fragenBox;
    };

    queryInformationenBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.datenblatt = await this.produkt.getDatenblatt();

        const informationenBox = await this.makeInformationenBox();

        return informationenBox;
    };

    queryTopProdukteBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        [this.kategorie, this.testberichte, this.meinungen, this.datenblatt] = await Promise.all([
            this.produkt.getKategorie(),
            this.produkt.getTestberichte(),
            this.produkt.getMeinungen(),
            this.produkt.getDatenblatt(),
        ]);

        const topProdukteBox = await this.makeTopProdukteBox();

        return topProdukteBox;
    };

    queryWeitereProdukteBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.kategorie = await this.produkt.getKategorie();

        const weitereProdukteBox = await this.makeWeitereProdukteBox();

        return weitereProdukteBox;
    };

    querySimilarProdukteBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.kategorie = await this.produkt.getKategorie();

        const similarProdukteBox = await this.makeSimilarProdukteBox();

        return similarProdukteBox;
    };

    queryFilterkombiBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.kategorie = await this.produkt.getKategorie();

        const filterkombiBox = await this.makeFilterkombiBox();

        return filterkombiBox;
    };

    queryPreisalarmBox = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        this.angebote = await this.produkt.getAngebote();

        const preisalarmBox = await this.makePreisalarmBox();

        return preisalarmBox;
    };

    querySnipptes = async (req) => {
        const productName = req.params.productName;

        await this.load(productName);

        [this.testberichte, this.angebote, this.meinungen] = await Promise.all([
            this.produkt.getTestberichte(),
            this.produkt.getAngebote(),
            this.produkt.getMeinungen(),
        ]);

        const snipptes = await this.makeSnipptes();

        return snipptes;
    };

    makeBoxSummary = async () => {
        let bestOffers = [];
        bestOffers.push(this.angebote.getGuenstigstesAngebot(false));
        bestOffers.push(this.angebote.getAngebotBesterCPC(false));
        bestOffers.push(this.angebote.getPromotedOffer());
        bestOffers.push(this.angebote.getAmazonOffer());
        bestOffers.push(this.angebote.getOttoOffer());

        bestOffers = this.angebote.sortByPreis(bestOffers);

        let contentBesteAngebote = [];
        let pos = 0;
        for (const offer of bestOffers) {
            if (!offer) continue;

            const vars = {
                offerDeeplink: offer["offer_oid"] + "?pos=" + pos + "&amp;st=tbdeOOF",
                preisFormat: offer["preisFormat"],
                versandkostenFormat: offer["versandkostenFormat"],
                shopLogoURL: offer["shop"]["shopLogo"],
                shopName: offer["offer_offer_merchantname"].replace('"', ""),
                shopLink: offer["shop"]["link"],
                shippingPeriod: offer["offer_period"],
            };

            contentBesteAngebote.push(vars);
            pos += 1;
        }

        if (contentBesteAngebote.length) {
            contentBesteAngebote = {
                contentBesteAngebote: contentBesteAngebote,
                showAmazon: false, //this.produkt.AMAZONASSIN != "" && amazonOffer === null,
                prdID: "1-" + this.produkt.id,
            };
        }

        let contentSocial = {};
        if (MODUL_SOCIAL) {
            contentSocial = {
                produktName: this.produkt.data.produktName,
                text: this.produkt.data.produktName + " Testberichte und Meinungen",
                bild: this.produkt.data.bilder[0]["XXL"]["url"],
            };
        }

        let title = this.produkt.data.produktName;
        if (this.testberichte.countTests()) {
            title += " Test";
        }

        let maxGroesseL = 0;
        let bilder = [];

        for (const bild of this.produkt.data.bilder) {
            if (!bild["S"] || !bild["L"] || !bild["XXL"]) continue;

            bilder.push({
                sizeS: bild["S"],
                srcGallery:
                    bild["S"]["hoehe"] < 50
                        ? bild["D"]["hoehe"] < 50
                            ? bild["E"]["hoehe"] < 50
                                ? bild["L"]["url"]
                                : bild["E"]["url"]
                            : bild["D"]["url"]
                        : bild["S"]["url"],
                srcD: bild["D"] ? bild["D"]["url"] : "",
                srcE: bild["E"] ? bild["E"]["url"] : "",
                srcL: bild["L"] ? bild["L"]["url"] : "",
                srcO: bild["O"] ? bild["O"]["url"] : "",
                srcS: bild["S"] ? bild["S"]["url"] : "",
                srcXL: bild["XL"] ? bild["XL"]["url"] : "",
                srcXXL: bild["XXL"] ? bild["XXL"]["url"] : "",
                sizesLJSON: {
                    width: bild["XL"]["breite"],
                    height: bild["XL"]["hoehe"],
                },
                sizesXXLJSON: {
                    width: bild["XXL"]["breite"],
                    height: bild["XXL"]["hoehe"],
                },
            });

            maxGroesseL = Math.max(maxGroesseL, bild["L"]["hoehe"] ? bild["L"]["hoehe"] : 0);
        }

        if (this.produkt.data.produktDesJahres) {
            for (const pdj of this.produkt.data.produktDesJahres) {
                bilder.push({
                    sizeS: {
                        breite: 27,
                        hoehe: 20,
                    },
                    srcGallery: "/best-product/" + pdj["jahr"] + "_D" + pdj["id"] + ".png", // SITE_CDN
                    srcS: "/best-product/" + pdj["jahr"] + "_D" + pdj["id"] + ".png", // SITE_CDN
                    srcD: "/best-product/" + pdj["jahr"] + "_D" + pdj["id"] + ".png", // SITE_CDN
                    srcL: "/best-product/" + pdj["jahr"] + "_E" + pdj["id"] + ".png", // SITE_CDN
                    srcXXL: "/best-product/" + pdj["jahr"] + "_F" + pdj["id"] + ".png", // SITE_CDN
                    sizesLJSON: {
                        width: 300,
                        height: 300,
                    },
                    sizesXXLJSON: {
                        width: 300,
                        height: 300,
                    },
                });
            }
        }

        if (this.datenblatt.haveDatenblattKurz()) {
            const dbData = this.datenblatt.getDatenblattKurzSort();

            var datenblatt = [];

            for (const labelID in dbData) {
                if (Object.hasOwnProperty.call(dbData, labelID)) {
                    const attributIDs = dbData[labelID];
                    const label = this.datenblatt.getLabel(labelID);

                    let attribute = [];
                    for (const key in attributIDs["attribute"]) {
                        const aID = attributIDs["attribute"][key];
                        attribute.push(this.datenblatt.getAttribut(aID));
                    }

                    const vars = {
                        label: label,
                        attribut: attribute.join(", "),
                    };

                    datenblatt.push(vars);
                }
            }
        } else {
            var datenblatt;
            if (this.produkt.data.DATENBLATTDETAILS) {
                datenblatt = this.produkt.data.DATENBLATTDETAILS;
            } else {
                datenblatt = this.produkt.data.DATENBLATT;
            }

            datenblatt = datenblatt.replace(" // ", " / ");

            if (datenblatt) {
                datenblatt = stripHtmlTags(datenblatt).split(" / ");
            } else {
                datenblatt = [];
            }

            const dbErg = datenblatt.slice(0, 8);

            for (const dbZeile of dbErg) {
                const e = dbZeile.split(": ");

                const vars = {
                    label: e.length > 1 ? e[0].trim() : "",
                    attribut: e.length > 1 ? e[1].trim() : e[0].trim(),
                };

                datenblatt.push(vars);
            }
        }

        const serien = await this.produkt.getSerien();

        let anzVarianten = 0;
        let contentVarianten = [];

        for (const serie of serien) {
            if (!serie.data.produkte) continue;
            for (const prd of serie.data.produkte) {
                if (prd.id == this.produkt.data.id || !prd) continue;

                anzVarianten++;

                const vars = {
                    produktName: prd["pname"],
                    produktLink: prd["produktLink"],
                    bildLink: prd["imgS"],
                    serienzusatz:
                        serie.data.zusatz[prd["id"]] && serie.data.zusatz[prd["id"]]
                            ? serie.data.zusatz[prd["id"]]
                            : prd["pname"],
                    showPreis: prd["angebote"] > 0,
                    produktPreis: prd["preis"],
                    noIndex: prd["noIndex"] || prd["noIndex2"],
                };

                contentVarianten.push(vars);
            }
        }

        let circleColor;
        if (this.produkt.data.SCORE) {
            circleColor = "grey";
        } else if (this.produkt.data.SCORE < 40) {
            circleColor = "red";
        } else if (this.produkt.data.SCORE < 60) {
            circleColor = "yellow";
        } else if (this.produkt.data.SCORE < 75) {
            circleColor = "limegreen";
        } else {
            circleColor = "green";
        }

        const merkenJSON = {
            id: "1-" + this.produkt.data.id,
            pname: this.produkt.data.produktName.replace("'", "&x27;"),
            url: this.produkt.data.produktURL,
            score: this.produkt.data.SCORE,
        };

        const produktText = await this.produkt.getProduktText();

        const lenNew = Math.floor(produktText.length / 4);

        let pt = [];
        let i = 0;
        for (const t of produktText.split("\n")) {
            if (!pt[i]) pt[i] = "";

            pt[i] += t + "\n";
            if (pt[i].length > lenNew) i++;
        }
        const contentDatenblatt = {
            datenblatt: datenblatt,
            showMan: this.produkt.data.MAN && !this.kategorie.data.nischenkategorie,
            hersteller: this.produkt.data.MAN,
            manPageURL: "hersteller/" + this.hersteller.data.herstellerURL,
            manDetailURL: this.produkt.data.manProduktDetail,
            serieURL: this.produkt.data.serieURL,
            serieTitel: this.produkt.data.serieName,
            gtin: this.produkt.data.EAN,
            produktName: this.produkt.data.produktName,
            score: this.testberichte.getScore(),
            anzahlTestberichte: this.testberichte.countTests(),
            meinungenProzent: this.meinungen.getMeinungenProzent(),
            anzahlMeinungen: this.meinungen.countMeinungenStars(),
            besterPreis: this.angebote.getBestPrice(true),
            hoechsterPreis: this.angebote.getWorstPrice(true),
            besterPreisEN: numberFormat(this.angebote.getBestPrice(false), 2),
            hoechsterPreisEN: numberFormat(this.angebote.getWorstPrice(false), 2),
            anzahlAngebote: this.angebote.countOffers(),
        };

        let starList = {};
        if (this.meinungen.countMeinungenStars()) {
            const nl = this.meinungen.getNotenliste();

            starList = {
                star5p: Math.round((100 / this.meinungen.countMeinungenStars()) * nl[5]),
                star4p: Math.round((100 / this.meinungen.countMeinungenStars()) * nl[4]),
                star3p: Math.round((100 / this.meinungen.countMeinungenStars()) * nl[3]),
                star2p: Math.round((100 / this.meinungen.countMeinungenStars()) * nl[2]),
                star1p: Math.round((100 / this.meinungen.countMeinungenStars()) * nl[1]),
                showIconMeinungen: this.meinungen.countMeinungenStars(),
            };
        }

        const contentSummary = {
            // bestesAngebot: contentBesteAngebote,
            socialButtons: contentSocial,
            snippetTestScore: Math.round((this.produkt.data.SCORE / 20) * 10) / 10,
            snippetTestCount: this.testberichte.countTests(),
            snippetOfferCount: this.angebote.countOffers(),
            snippetMeinungenCount: this.meinungen.countMeinungen(),
            snippetMeinungenScore: this.meinungen.getMeinungenPunkte(),
            snippetBesterPreis: this.angebote.getBestPrice(false),
            snippetHoherPreis: this.angebote.getWorstPrice(false),
            anzTests: this.testberichte.countTests(),
            anzAngebote: this.angebote.countOffers(),
            anzMeinungen: this.meinungen.countMeinungenStars(),
            testnote: this.produkt.data.SCORE,
            testNoteText: getNote(this.produkt.data.SCORE, this.testberichte.countTests()),
            besterPreis: this.angebote.getBestPrice(),
            hoherPreis: this.angebote.getWorstPrice(),
            showPreisHoch: this.angebote.getWorstPrice(false) > this.angebote.getBestPrice(false),
            meinungenPunkte: this.meinungen.getMeinungenPunkte(true),
            meinungProzent: Math.round((this.meinungen.getMeinungenPunkte() * 20) / 10) * 10,
            meinungenStars: this.meinungen.getMeinungenStars(),
            starList: starList,
            circleColor: circleColor,
            title: title,
            produktID: this.produkt.data.ID,
            produktName: this.produkt.data.produktName,
            imageD: this.produkt.data.bilder[0]["D"]["url"],
            imageL: this.produkt.data.bilder[0]["XL"]["url"],
            imageLBreite: this.produkt.data.bilder[0]["XL"]["breite"],
            imageLHoehe: this.produkt.data.bilder[0]["XL"]["hoehe"],
            imageXXL: this.produkt.data.bilder[0]["XXL"]["url"] ? this.produkt.data.bilder[0]["XXL"]["url"] : "",
            showXXL: this.produkt.data.bilder[0]["XXL"]["url"],
            showGallery: this.produkt.data.showGallery || this.produkt.data.videoID,
            bilder: bilder,
            videoID: this.produkt.data.videoID,
            videosTests: this.testberichte.getVideos(),
            showIconTests: this.testberichte.countTests() > 0,
            showIconPreise: this.angebote.countOffers() > 0,
            showIconPreisHistorie: this.preishistorie.hasPreishistorie(),
            showIconFragen: this.fragen.countFragen(),
            showIconMeinungen: this.meinungen.countMeinungenStars(),
            showIconDatenblatt: this.datenblatt.haveDatenblatt(),
            showTextTop:
                (pt[0] && pt[0].trim()) ||
                (pt[1] && pt[1].trim()) ||
                (pt[2] && pt[2].trim()) ||
                (pt[3] && pt[3].trim()),
            produktText1: pt[0],
            produktText2: pt[1],
            produktText3: pt[2],
            produktText4: pt[3],
            datenblatt: contentDatenblatt,
            manFilterTitle: this.produkt.data.MAN + " " + this.kategorie.data.kategorieName,
            manFilterURL: "/" + this.kategorie.data.kategorieURL + "/" + this.hersteller.data.herstellerURL + "/",
            showManFilter: this.kategorie.data.showKategorie == 1 && this.produkt.data.herstellerFilterAnzahl > 14,
            contentVarianten: contentVarianten,
            anzVarianten: anzVarianten,
            color: this.produkt.data.produktName.replace(this.produkt.serieName, "").trim(),
            eek: this.produkt.data.energieEffizienzKlasse,
            eekC: this.produkt.data.energieEffizienzKlasse.toLowerCase().replace("+", "p"),
        };

        return contentSummary;
    };

    makeTestsBox = async () => {
        let testsInSerie = [];

        if (!this.testberichte.countTests()) {
            testsInSerie = this.produkt.getTestsInVarianten();
        }

        this.testberichte.orderByNoteDESC();
        // this.testberichte.orderByNeueDESC();

        let i = 0;
        let contentTests = [];
        let contentTestsOben;
        let showMore;
        if (MODUL_PRODUKT_TESTS_PAGER) {
            var tests = this.testberichte.getTests(0, ANZAHL_PRODUKT_TESTS);
        } else {
            var tests = this.testberichte.getTests();
        }

        tests.forEach((test) => {
            i++;

            const readMore = !MODUL_TESTS_MORE_OFFEN && (test["PRO"] || test["CONTRA"] || test["DETAILS"]);

            let fazitMore = {};
            if (readMore) {
                fazitMore = {
                    testID: test["TESTID"],
                };
            }

            let readMoreProCon = test["vorteile"].length > 4 || test["nachteile"].length > 4;
            if (!test["vorteile"].length && !test["nachteile"].length && test["details"].length > 8) {
                readMoreProCon = true;
            }

            contentTests.push({
                test: test,
                readMore: readMore,
                showMore: readMore || MODUL_TESTS_MORE_OFFEN,
                readMoreProCon: readMoreProCon,
                fazitMore: fazitMore,
            });

            if (!MODUL_PRODUKT_TESTS_PAGER && ANZAHL_PRODUKT_TESTS == i) {
                contentTestsOben = contentTests;
                contentTests = [];
                showMore = true;
            }
        });

        if (!contentTestsOben) {
            showMore = false;
        } else {
            const contentTestsUnten = [
                {
                    testberichte: contentTests,
                },
            ];

            contentTests = [...contentTestsOben, ...contentTestsUnten];
        }

        let testsAnzahl = this.testberichte.countTests();
        let notenListe = this.testberichte.getNotenliste();

        let noten = [];
        if (testsAnzahl) {
            noten = {
                "sehr gut": {
                    p: round5((100 / testsAnzahl) * notenListe[1]),
                    a: notenListe[1],
                    c: "green",
                },
                gut: {
                    p: round5((100 / testsAnzahl) * notenListe[2]),
                    a: notenListe[2],
                    c: "limegreen",
                },
                befriedigend: {
                    p: round5((100 / testsAnzahl) * notenListe[3]),
                    a: notenListe[3],
                    c: "yellow",
                },
                ausreichend: {
                    p: round5((100 / testsAnzahl) * notenListe[4]),
                    a: notenListe[4],
                    c: "orange",
                },
                mangelhaft: {
                    p: round5((100 / testsAnzahl) * notenListe[5]),
                    a: notenListe[5],
                    c: "red",
                },
                "keine Note": {
                    p: round5((100 / testsAnzahl) * notenListe[0]),
                    a: notenListe[0],
                    c: "green",
                },
            };
        }

        const showProContra = testsAnzahl && (this.produkt.data.TESTPRO || this.produkt.data.TESTCONTRA);

        let contentProContra = {};
        if (showProContra) {
            contentProContra = this.makeProContraBox();
        }

        const contentTestberichte = {
            produktName: this.produkt.data.produktName,
            anzahlTests: testsAnzahl,
            noten: noten,
            proContraHTML: contentProContra,
            lastTest: Math.min(testsAnzahl, ANZAHL_PRODUKT_TESTS),
            showMore: showMore && testsAnzahl > ANZAHL_PRODUKT_TESTS,
            contentTests: contentTests,
            testsInSerie: testsInSerie,
        };

        return contentTestberichte;
    };

    makeProContraBox = () => {
        if (!this.produkt.data.TESTPRO && !this.produkt.data.TESTCONTRA) {
            return {
                contentProContra: {},
            };
        }

        let pros = this.produkt.data.TESTPRO.split(" // ");
        let contras = this.produkt.data.TESTCONTRA.split(" // ");

        for (let i = 0; i < pros.length; i++) {
            if (!pros[i].trim()) delete pros[i];
        }

        for (let i = 0; i < contras.length; i++) {
            if (!contras[i].trim()) delete contras[i];
        }

        let contentProContra = {
            pros: pros,
            contras: contras,
        };

        return {
            contentProContra: contentProContra,
        };
    };

    makeAngeboteBox = async () => {
        const angeboteAnzahl = this.angebote.countOffers();
        if (!angeboteAnzahl) {
            return {
                contentAngebote: {},
            };
        }

        let promotedOffer = this.angebote.getPromotedOffer();
        let amazonOffer = this.angebote.getAmazonOffer();

        let promotedOfferContent = {};
        let lkwColor;
        if (MODUL_PROMOTED_OFFER && angeboteAnzahl > 8 && promotedOffer && !amazonOffer) {
            switch (promotedOffer["offer_periodflag"]) {
                case 3:
                    lkwColor = "col-green";
                    break;

                case 2:
                    lkwColor = "col-green";
                    break;

                case 1:
                    lkwColor = "col-yellow";
                    break;

                case 0:
                default:
                    lkwColor = "col-l-grey";
                    break;
            }

            let contentStars = [];
            promotedOffer["stars"].forEach((star) => {
                contentStars.push({
                    color: star == "full" ? "black" : "l-grey",
                });
            });

            const offerLink = promotedOffer["offer_oid"] + "?pos=0&amp;st=amzTop";
            const preisExp = promotedOffer["preisFormat"].split(",");

            promotedOfferContent = {
                offerLink: offerLink,
                angebotsID: promotedOffer["offer_angebotsID"],
                angebotTitel: promotedOffer["offer_label"],
                angebotTitelKurz: Strings.wortKuerzen(promotedOffer["offer_label"], 80),
                imgURL: promotedOffer["offer_image"],
                shopName: promotedOffer["shopName"],
                shopURL: promotedOffer["shopURL"],
                showShopLogo: promotedOffer["sBild"],
                shopLogoURL: promotedOffer["shop"]["shopLogo"],
                preisProEinheit: promotedOffer["offer_preiseinheit"],
                preisFormat: promotedOffer["preisFormat"],
                preisVK: preisExp[0],
                preisNK: preisExp[1],
                versandkostenFormat: promotedOffer["versandkostenFormat"],
                totalFormat: promotedOffer["totalFormat"],
                showVerfuegbarkeit: promotedOffer["verfuegbarkeit"] != "",
                verfuegbarkeit: Strings.wortKuerzen(stripHtmlTags(promotedOffer["verfuegbarkeit"])),
                anzahlBewertungen: promotedOffer["bewertungAnzahl"],
                contentStars: contentStars,
                lkwColor: lkwColor,
            };

            promotedOfferContent = {
                offer: promotedOffer,
                promotedOfferContent: promotedOfferContent,
            };
        }

        this.angebote.orderByPreisASC();
        // this.angebote.orderByCPC();

        let offers = this.angebote.getAngebote(0, ANZAHL_PRODUKT_ANGEBOTE);

        offers = this.angebote.sortByPreis(offers);

        let contentOffers = [];
        let i = 0;
        offers.forEach((offer) => {
            i++;

            switch (offer["offer_periodflag"]) {
                case 3:
                    lkwColor = "col-green";
                    break;

                case 2:
                    lkwColor = "col-green";
                    break;

                case 1:
                    lkwColor = "col-yellow";
                    break;

                case 0:
                default:
                    lkwColor = "col-l-grey";
                    break;
            }

            let offerLink = offer["offer_oid"] + "?pos=" + i + "&amp;st={SUB_TAG}";
            let preisExp = offer["preisFormat"].split(",");

            contentOffers.push({
                offerLink: offerLink,
                angebotsID: offer["offer_angebotsID"],
                angebotTitel: offer["offer_label"],
                angebotTitelKurz: Strings.wortKuerzen(offer["offer_label"], 80),
                imgURL: offer["offer_image"],
                shopName: offer["shopName"],
                shopURL: offer["shopURL"],
                showShopLogo: offer["sBild"],
                shopLogoURL: offer["shop"]["shopLogo"],
                preisProEinheit: offer["offer_preiseinheit"],
                preisFormat: offer["preisFormat"],
                preisVK: preisExp[0],
                preisNK: preisExp[1],
                versandkostenFormat: offer["versandkostenFormat"],
                totalFormat: offer["totalFormat"],
                showVerfuegbarkeit: offer["verfuegbarkeit"] != "",
                verfuegbarkeit: Strings.wortKuerzen(stripHtmlTags(offer["verfuegbarkeit"]), 40),
                anzahlBewertungen: offer["bewertungAnzahl"],
                contentStars: promotedOffer ? promotedOffer["stars"] : "",
                lkwColor: lkwColor,
            });
        });

        const contentAngebote = {
            promotedOfferContent: promotedOfferContent,
            offers: offers,
            anzahlAngebote: angeboteAnzahl,
            produktName: this.produkt.data.produktName,
            showPager: angeboteAnzahl > ANZAHL_PRODUKT_ANGEBOTE,
            lastOffer: Math.min(angeboteAnzahl, ANZAHL_PRODUKT_ANGEBOTE),
            contentOffers: contentOffers,
            uhrzeit: ProduktFormatDate(new Date()),
        };

        return contentAngebote;
    };

    makePreishistorieBox = async () => {
        if (!this.preishistorie.hasPreishistorie()) {
            return {
                contentPreishistorie: {},
            };
        }

        let contentOffer = {};
        let offer = this.angebote.getGuenstigstesAngebot();
        let lkwColor;
        if (offer) {
            switch (offer["offer_periodflag"]) {
                case 3:
                    lkwColor = "col-green";
                    break;

                case 2:
                    lkwColor = "col-green";
                    break;

                case 1:
                    lkwColor = "col-yellow";
                    break;

                case 0:
                default:
                    lkwColor = "col-l-grey";
                    break;
            }

            let contentStars = [];
            offer["stars"].forEach((star) => {
                contentStars.push({
                    color: star == "full" ? "black" : "l-grey",
                });
            });

            let offerLink = offer["offer_oid"] + "?pos=1&amp;st=tbdePH";
            let preisExp = offer["preisFormat"].split(",");

            contentOffer = {
                offerLink: offerLink,
                angebotsID: offer["offer_angebotsID"],
                angebotTitel: offer["offer_label"],
                angebotTitelKurz: Strings.wortKuerzen(offer["offer_label"], 80),
                imgURL: offer["offer_image"],
                shopName: offer["shopName"],
                shopURL: offer["shopURL"],
                showShopLogo: offer["sBild"],
                shopLogoURL: offer["shop"]["shopLogo"],
                preisProEinheit: offer["offer_preiseinheit"],
                preisFormat: offer["preisFormat"],
                preisVK: preisExp[0],
                preisNK: preisExp[1],
                versandkostenFormat: offer["versandkostenFormat"],
                totalFormat: offer["totalFormat"],
                showVerfuegbarkeit: offer["verfuegbarkeit"] != "",
                verfuegbarkeit: Strings.wortKuerzen(stripHtmlTags(offer["verfuegbarkeit"]), 40),
                anzahlBewertungen: offer["bewertungAnzahl"],
                contentStars: contentStars,
                lkwColor: lkwColor,
            };
        }

        const historie = this.preishistorie.getPreishistorie();

        const preise = [["Datum", "Preis"]];
        let besterPreis1m = null;
        let besterPreis3m = null;
        let besterPreis1y = null;
        let maxPreis1m = 0;
        let maxPreis3m = 0;
        let maxPreis1y = 0;
        let preise1m = preise;
        let preise3m = preise;
        let preise1y = preise;
        let hasPreis1y = false;
        let hasPreis3m = false;
        let hasPreis1m = false;
        let jahr1 = new Date();
        jahr1.setYear(jahr1.getFullYear() - 1);
        jahr1.setHours(0, 0, 0, 0);
        let monat3 = new Date();
        monat3.setMonth(monat3.getMonth() - 3);
        monat3.setHours(0, 0, 0, 0);
        let monat1 = new Date();
        monat1.setMonth(monat1.getMonth() - 1);
        monat1.setHours(0, 0, 0, 0);
        let jetzt = new Date();
        jetzt.setHours(0, 0, 0, 0);
        let tmp = new Date(jahr1.getTime());
        let p = null;
        for (const v of historie) {
            let pLast = p;
            p = v["preis"];
            let datum = new Date(v["datum"]);
            if (datum < tmp) {
                continue;
            }
            while (tmp < datum) {
                let preiseTmp = [ProduktDMYFormatDate(tmp), !parseFloat(pLast) ? null : parseFloat(pLast)];

                if (tmp > jahr1) {
                    if (preiseTmp[1] !== null) {
                        hasPreis1y = true;
                    }
                    maxPreis1y = Math.max(maxPreis1y, preiseTmp[1]);
                    if (preiseTmp[1] !== null && (besterPreis1y === null || preiseTmp[1] < besterPreis1y[1])) {
                        besterPreis1y = preiseTmp;
                    }
                    preise1y.push(preiseTmp);
                }
                if (tmp > monat3) {
                    if (preiseTmp[1] !== null) {
                        hasPreis3m = true;
                    }
                    maxPreis3m = Math.max(maxPreis3m, preiseTmp[1]);
                    if (preiseTmp[1] !== null && (besterPreis3m === null || preiseTmp[1] < besterPreis3m[1])) {
                        besterPreis3m = preiseTmp;
                    }
                    preise3m.push(preiseTmp);
                }
                if (tmp > monat1) {
                    if (preiseTmp[1] !== null) {
                        hasPreis1m = true;
                    }
                    maxPreis1m = Math.max(maxPreis1m, preiseTmp[1]);
                    if (preiseTmp[1] !== null && (besterPreis1m === null || preiseTmp[1] < besterPreis1m[1])) {
                        besterPreis1m = preiseTmp;
                    }
                    preise1m.push(preiseTmp);
                }

                tmp.setDate(tmp.getDate() + 1);
            }
        }

        while (tmp <= jetzt) {
            let preiseTmp = [ProduktDMYFormatDate(tmp), !parseFloat(p) ? null : parseFloat(p)];

            if (tmp > jahr1) {
                if (preiseTmp[1] !== null) {
                    hasPreis1y = true;
                }
                maxPreis1m = Math.max(maxPreis1m, preiseTmp[1]);
                if (preiseTmp[1] !== null && (besterPreis1y === null || preiseTmp[1] < besterPreis1y[1])) {
                    besterPreis1y = preiseTmp;
                }
                preise1y.push(preiseTmp);
            }
            if (tmp > monat3) {
                if (preiseTmp[1] !== null) {
                    hasPreis3m = true;
                }
                maxPreis3m = Math.max(maxPreis3m, preiseTmp[1]);
                if (preiseTmp[1] !== null && (besterPreis3m === null || preiseTmp[1] < besterPreis3m[1])) {
                    besterPreis3m = preiseTmp;
                }
                preise3m.push(preiseTmp);
            }
            if (tmp > monat1) {
                if (preiseTmp[1] !== null) {
                    hasPreis1m = true;
                }
                maxPreis1m = Math.max(maxPreis1m, preiseTmp[1]);
                if (preiseTmp[1] !== null && (besterPreis1m === null || preiseTmp[1] < besterPreis1m[1])) {
                    besterPreis1m = preiseTmp;
                }
                preise1m.push(preiseTmp);
            }

            tmp.setDate(tmp.getDate() + 1);
        }

        if (besterPreis1m && besterPreis1m.length > 1) besterPreis1m[1] = numberFormat(besterPreis1m[1], 2);
        if (besterPreis3m && besterPreis3m.length > 1) besterPreis3m[1] = numberFormat(besterPreis3m[1], 2);
        if (besterPreis1y && besterPreis1y.length > 1) besterPreis1y[1] = numberFormat(besterPreis1y[1], 2);

        const besteAngebote = {
            "1m": besterPreis1m,
            "3m": besterPreis3m,
            "1y": besterPreis1y,
        };

        maxPreis1m *= 1.5;
        maxPreis3m *= 1.5;
        maxPreis1y *= 1.5;

        const p1 = Math.pow(10, Math.ceil(maxPreis1m).toString().length - 2);
        const p2 = Math.pow(10, Math.ceil(maxPreis3m).toString().length - 2);
        const p3 = Math.pow(10, Math.ceil(maxPreis1y).toString().length - 2);

        maxPreis1m = Math.ceil(maxPreis1m / p1) * p1;
        maxPreis3m = Math.ceil(maxPreis3m / p2) * p2;
        maxPreis1y = Math.ceil(maxPreis1y / p3) * p3;

        const contentPreishistorie = {
            preishistorieJSON1m: preise1m,
            preishistorieJSON3m: preise3m,
            preishistorieJSON1y: preise1y,
            hasPreis1m: hasPreis1m,
            hasPreis3m: hasPreis3m,
            hasPreis1y: hasPreis1y,
            showBestesAngebot: besterPreis1m && besterPreis1m[0] && besterPreis1m[1],
            bestesAngebotDatum: besterPreis1m && besterPreis1m[0] ? besterPreis1m[0] : "",
            bestesAngebotBetrag: besterPreis1m && besterPreis1m[1] ? besterPreis1m[1] : "",
            showAktuellBestesAngebot: contentOffer != "",
            besteAngebote: besteAngebote,
            hAxisMaxValue1m: maxPreis1m,
            hAxisMaxValue3m: maxPreis3m,
            hAxisMaxValue1y: maxPreis1y,
            contentOffer: contentOffer,
        };

        return contentPreishistorie;
    };

    makeMeinungenBox = async () => {
        this.meinungen.orderBySterneDESC();
        this.meinungen.orderByNeueDESC();

        const meinungenNotenListe = this.meinungen.getNotenliste();

        const meinungenCount = this.meinungen.countMeinungen();

        const totalPageCount = Math.ceil(meinungenCount / ANZAHL_PRODUKT_MEINUNGEN);

        if (meinungenCount == 0) this.MeinungenPage = 0;
        else this.MeinungenPage = Math.min(this.MeinungenPage, totalPageCount);

        if (this.MeinungenPage === 0) this.MeinungenPage = 1;
        var start = ANZAHL_PRODUKT_MEINUNGEN * (this.MeinungenPage - 1);

        const paginationMeinungen = this.meinungen.getMeinungen(start, ANZAHL_PRODUKT_MEINUNGEN);

        let contentMeinungenList = [];
        paginationMeinungen.forEach((meinung) => {
            contentMeinungenList.push({
                meinung: meinung,
                showComplete:
                    meinung["isAmazon"] || meinung["isOtto"] ? true : meinung["meinungtextKomplett"].length < 1000,
                showAmazonLink: meinung["isAmazon"],
                showOttoLink: meinung["isOtto"],
                prdID: "1-" + this.produkt.data.id,
                isLinkMaskiert: MODUL_LINKS_HIDE,
            });
        });

        let noten = {};
        if (this.meinungen.countMeinungenStars()) {
            noten = {
                "5 Sterne": {
                    p: round5((100 / this.meinungen.countMeinungenStars()) * meinungenNotenListe[4]),
                    a: meinungenNotenListe[4],
                    c: "green",
                },
                "4 Sterne": {
                    p: round5((100 / this.meinungen.countMeinungenStars()) * meinungenNotenListe[3]),
                    a: meinungenNotenListe[3],
                    c: "limegreen",
                },
                "3 Sterne": {
                    p: round5((100 / this.meinungen.countMeinungenStars()) * meinungenNotenListe[2]),
                    a: meinungenNotenListe[2],
                    c: "yellow",
                },
                "2 Sterne": {
                    p: round5((100 / this.meinungen.countMeinungenStars()) * meinungenNotenListe[1]),
                    a: meinungenNotenListe[1],
                    c: "orange",
                },
                "1 Stern": {
                    p: round5((100 / this.meinungen.countMeinungenStars()) * meinungenNotenListe[0]),
                    a: meinungenNotenListe[0],
                    c: "red",
                },
            };
        }

        const meinungenStand = new Date(this.meinungen.getMeinungenStand());

        const tmpAmazonOffer = this.angebote.getAmazonOffer();
        const tmpOttoOffer = this.angebote.getOttoOffer();

        const contentMeinungen = {
            produktName: this.produkt.data.produktName,
            produktURL: this.produkt.data.produktURL,
            anzahlMeinungenAmazon: this.meinungen.countMeinungenAmazonStars(),
            anzahlMeinungenOtto: this.meinungen.countMeinungenOttoStars(),
            anzahlMeinungenStars: this.meinungen.countMeinungenStars(),
            anzahlMeinungen: this.meinungen.countMeinungenStars(),
            anzahlMeinungenPager: this.meinungen.countMeinungenText(),
            meinungenStand: ProduktDMYFormatDate(meinungenStand),
            showHeadBox: this.meinungen.countMeinungenStars() > 0,
            showHint: !this.meinungen.countMeinungen(),
            showRezensionHint: this.meinungen.countMeinungen() > 0,
            amazonOffer: tmpAmazonOffer ? tmpAmazonOffer.offer_link : "",
            ottoOffer: tmpOttoOffer ? tmpOttoOffer.offer_link : "",
            meinungenPunkte: this.meinungen.getMeinungenPunkte(),
            meinungenScore: this.meinungen.getGesamtnote(true),
            meinungenStars: this.meinungen.getMeinungenStars(),
            noten: noten,
            showPager: this.meinungen.countMeinungen() > ANZAHL_PRODUKT_MEINUNGEN,
            lastOpinion: Math.min(this.meinungen.countMeinungen(), ANZAHL_PRODUKT_MEINUNGEN),
            pageNumber: this.MeinungenPage,
            totalPageCount: totalPageCount,
            contentMeinungenList: contentMeinungenList,
        };

        return contentMeinungen;
    };

    makeFragenBox = async () => {
        // let fragen = this.fragen.getFragen(0, ANZAHL_PRODUKT_FRAGEN);
        let fragen = this.fragen.getFragen();

        let contentFragenList = [];
        fragen.forEach((frage) => {
            let contentAntworten = [];
            frage = Object.values(frage)[0];
            frage["antworten"].forEach((antwort) => {
                antwort = Object.values(antwort)[0];
                contentAntworten.push({
                    antwortID: antwort["id"],
                    antwortText: Strings.replacePseudoCode(stripHtmlTags(antwort["antwort"])),
                    antwortName: antwort["anzeigeName"],
                    isMitarbeiterTBde: antwort["tbdeMitarbeiter"] == 1,
                    bwnUp: parseInt(antwort["bwnUp"]),
                    bwnDown: parseInt(antwort["bwnDown"]),
                    dateCreated: formatDate(antwort["insertDatum"]),
                    showSnippets: this.showSnippeteFragen,
                });
            });
            contentFragenList.push({
                frageID: frage["id"],
                frageText: frage["frage"],
                frageName: frage["anzeigeName"],
                bwnUp: parseInt(frage["bwnUp"]),
                bwnDown: parseInt(frage["bwnDown"]),
                bwnGesamt: parseInt(frage["bwnUp"] - frage["bwnDown"]),
                contentAntworten: contentAntworten,
                anzahlAntworten: frage["antworten"].length,
                dateCreated: formatDate(frage["insertDatum"]),
                showSnippets: this.showSnippeteFragen,
            });
        });

        const fragenKategorie = await FragenAntworten.getByKategorieID(this.produkt.data.kategorieID);
        // if (fragen.length) {
        //     var anzahlFragenKategorie = ANZAHL_PRODUKT_FRAGEN_KATEGORIE;
        // } else {
        //     var anzahlFragenKategorie = ANZAHL_PRODUKT_FRAGEN_KATEGORIE_KEINE;
        // }

        // fragen = fragenKategorie.getFragen(0, anzahlFragenKategorie);
        fragen = fragenKategorie.getFragen();

        let contentFragenNeuList = [];
        await Promise.all(
            fragen.map(async (frage) => {
                const prd = await Produkt.getByID(frage[Object.keys(frage)[0]]["produktID"]);
                contentFragenNeuList.push({
                    frageText: htmlEntities(frage[Object.keys(frage)[0]]["frage"]),
                    frageName: htmlEntities(frage[Object.keys(frage)[0]]["anzeigeName"]),
                    produktURL: prd.data.produktURL,
                    produktName: htmlEntities(prd.data.produktName),
                });
            })
        );

        const contentFragen = {
            produktName: this.produkt.data.produktName,
            anzahlFragen: this.fragen.countFragen(),
            kategorieName: this.kategorie.data.kategorieName,
            anzahlFragenPager: this.fragen.countFragen(),
            lastOpinion: Math.min(this.fragen.countFragen(), ANZAHL_PRODUKT_FRAGEN),
            contentFragenList: contentFragenList,
            contentFragenNeuList: contentFragenNeuList,
            showSnippets: this.showSnippeteFragen,
        };

        return contentFragen;
    };

    makeInformationenBox = async () => {
        if (!this.datenblatt.haveDatenblatt() && !this.produkt.data.CONTENT) return {};

        const contentDatenblatt = this.makeDatenblattBox();

        let imgURL = "";
        let showImage = false;
        if (
            this.produkt.bilder &&
            this.produkt.data.bilder[2] &&
            typeof this.produkt.data.bilder[2]["L"] !== "undefined"
        ) {
            imgURL = SITE_IMG_GOOGLE + this.produkt.data.bilder[2]["L"]["pfad"];
            showImage = true;
        } else if (
            this.produkt.bilder &&
            this.produkt.bilder[0] &&
            typeof this.produkt.bilder[0]["L"] !== "undefined"
        ) {
            imgURL = this.produkt.data.IMG.replace(/D_/g, "L_");
            showImage = true;
        }

        const contentInfos = {
            produktName: this.produkt.data.produktName,
            produktNameKurz: this.produkt.data.produktName.replace(new RegExp(this.produkt.MAN, "g"), ""),
            produktContent: Strings.descReplace(this.produkt.data.CONTENT),
            imgURL: imgURL,
            showImage: showImage,
            contentDatenblatt: contentDatenblatt,
        };

        return contentInfos;
    };

    makeDatenblattBox = () => {
        var datenblatt = this.datenblatt.getDatenblatt();
        // var datenblatt = this.datenblatt.getDatenblattSort();

        if (!this.datenblatt.haveDatenblatt() || !(typeof datenblatt !== "undefined")) {
            return {};
        }

        let contentDatenblatt = [];
        for (const [sektionID, sectionData] of Object.entries(datenblatt)) {
            const sektionName = this.datenblatt.getSektion(sektionID);
            let contentEntries = [];
            let i = 0;
            for (const [labelID, attributIDs] of Object.entries(sectionData)) {
                i++;

                const label = this.datenblatt.getLabel(labelID);
                let attribute = [];
                attributIDs.forEach((aID) => {
                    attribute.push(this.datenblatt.getAttribut(aID));
                });

                contentEntries.push({
                    labelID: labelID,
                    label: label,
                    attribut: attribute.join(", "),
                });
            }

            contentDatenblatt.push({
                sectionName: sektionName,
                entries: contentEntries,
            });
        }

        return contentDatenblatt;
    };

    makeTopProdukteBox = async () => {
        if (
            !MODUL_PRODUKT_TOP_PRODUKTE ||
            !this.testberichte.countTests() ||
            (!this.meinungen.countMeinungen() && !this.datenblatt.haveDatenblatt())
        ) {
            return {};
        }

        const ret = await this.produkt.getTopProducts();

        if (!ret) return {};

        const contentTopProducts = await this.makeSliderProdukteBox(ret, this.PRODUKTE_TOP);

        return contentTopProducts;
    };

    makeSliderProdukteBox = async (produktListe, typ) => {
        produktListe = shuffle(produktListe);

        let produkte = [];
        await Promise.all(
            produktListe.map(async (val) => {
                const row = await Produkt.getByID(val);
                if (row && row.getIsLoad) {
                    if (row.data.DATENBLATTDETAILS) {
                        var datenblatt = row.data.DATENBLATTDETAILS;
                    } else {
                        var datenblatt = row.data.DATENBLATT;
                    }
                    datenblatt = await Strings.dataSnippet(datenblatt, 25);

                    const imgURL = row.data.bilder[0]["S"]["url"];
                    const imgL = row.data.bilder[0]["L"]["url"];
                    const imgXXL = row.data.bilder[0]["XXL"]["url"];

                    const prdLink = "/produkte/" + row.data.produktURL;

                    const offers = await row.getAngebote();
                    let besterPreis = 0;
                    if (offers.getIsLoad && offers.countOffers()) {
                        besterPreis = offers.getBestPrice(true);
                    }

                    produkte.push({
                        pid: row.data.id,
                        pname:
                            row.data.produktName.slice(0, 85) +
                            (row.data.produktName.slice(0, 85) !== row.data.produktName ? "..." : ""),
                        title: row.data.produktName,
                        hersteller: row.data.MAN,
                        purl: prdLink,
                        img: imgURL,
                        imgL: imgL,
                        imgXXL: imgXXL,
                        imgBreite: row.data.bilder[0]["L"]["breite"],
                        datenblatt: datenblatt,
                        tests: row.data.TESTS,
                        score: row.data.SCORE,
                        meinungen: row.data.anzMeinungen,
                        meinungenscore: row.data.MEINUNGENSCORE,
                        meinungenStars: row.data.meinungenStars,
                        angebote: offers.getIsLoad ? offers.countOffers() : 0,
                        preis: besterPreis,
                        isLinkMaskiert: row.data.noIndex2 == 1 || this.kategorie.data.noIndex == 1,
                    });
                }
            })
        );

        if (!produkte.length) {
            return {};
        }

        if (produkte.length % 4) {
            do {
                produkte.push(false);
            } while (produkte.length % 4);
        }

        switch (typ) {
            case this.PRODUKTE_AEHNLICHE:
                var containerID = "similarHead";
                var navID = "similarNav";
                var ueberschrift = "Ähnliche Produkte";
                break;

            case this.PRODUKTE_TOP:
                var containerID = "topHead";
                var navID = "topNav";
                var ueberschrift = "Verwandte Produkte";
                break;

            case this.PRODUKTE_WEITERE:
                var containerID = "moreHead";
                var navID = "moreNav";
                var ueberschrift = "Weitere Produkte";
                break;
        }

        const sliderProdukte = {
            produkte: produkte,
            typ: typ,
            containerID: containerID,
            navID: navID,
            ueberschrift: ueberschrift,
        };

        return sliderProdukte;
    };

    makeWeitereProdukteBox = async () => {
        if (!MODUL_PRODUKT_WEITERE_PRODUKTE) {
            return {};
        }

        const ret = await this.produkt.getMoreProducts();

        if (!ret) {
            return {};
        }

        const contentMoreProducts = await this.makeSliderProdukteBox(ret, this.PRODUKTE_WEITERE);

        return contentMoreProducts;
    };

    makeSimilarProdukteBox = async () => {
        if (!MODUL_PRODUKT_AEHNLICHE_PRODUKTE) {
            return {};
        }

        const ret = await this.produkt.getSimilarProducts();

        if (!ret) {
            return {};
        }

        const contentSimilarProducts = await this.makeSliderProdukteBox(ret, this.PRODUKTE_AEHNLICHE);

        return contentSimilarProducts;
    };

    makeFilterkombiBox = async () => {
        const filter = await this.produkt.getMatchedKombiFilter();

        if (!filter) {
            return {};
        }

        const contentFilterkombinationen = {
            filter: filter,
            kategorieURL: this.kategorie.data.kategorieURL,
        };

        return contentFilterkombinationen;
    };

    makePreisalarmBox = async () => {
        const contentPreisalarm = {
            produktName: this.produkt.data.produktName,
            besterPreis: this.angebote.getBestPrice(false),
        };

        return contentPreisalarm;
    };

    makeSnipptes = async () => {
        if (!this.SNIPPETS || !this.SNIPPETS_JSON) {
            return {};
        }

        if (!this.testberichte.getScore() && !this.meinungen.countMeinungen() && !this.angebote.countOffers()) {
            return {};
        }

        let produktText = this.produkt.getProduktText();

        let contentReviews = [];
        if (this.testberichte.getScore()) {
            let i = 0;
            let tests = this.testberichte.getTests();
            for (const test of tests) {
                if (!test["TBNOTE"]) {
                    continue;
                }

                let testDesc = "";
                if (test["FAZIT"]) {
                    testDesc = test["FAZIT"];
                } else if (test["teaser"]) {
                    testDesc = test["teaser"];
                }

                testDesc = stripHtmlTags(testDesc).trim();

                if (!testDesc) {
                    continue;
                }

                contentReviews.push({
                    ratingAutor: addcslashes(test["testerName"], '"\\'),
                    ratingDatum: PreishistorieformatDate(test["insertDate"]),
                    ratingDescription: addcslashes(testDesc, '"\\'),
                    ratingTitel: addcslashes(test["NOTE"], '"\\'),
                    ratingValue: test["TBNOTE"],
                });

                i++;

                if (i == 3) {
                    break;
                }
            }
        } else if (this.meinungen.countMeinungen()) {
            let i = 0;
            const meinungen = this.meinungen.getMeinungen();

            for (const meinung of meinungen) {
                const meinungDesc = stripHtmlTags(meinung["meinungtext"]).trim();

                if (!meinungDesc) {
                    continue;
                }

                contentReviews.push({
                    ratingAutor: addcslashes(meinung["anzeigeName"], '"\\'),
                    ratingDatum: PreishistorieformatDate(meinung["meinungDatum"]),
                    ratingDescription: addcslashes(meinungDesc, '"\\'),
                    ratingTitel: addcslashes(meinung["mtitel"], '"\\'),
                    ratingValue: meinung["meinungstern"],
                });

                i++;

                if (i == 3) {
                    break;
                }
            }
        }

        const contentSnippets = {
            produktName: addcslashes(this.produkt.data.produktName, '"\\'),
            produktURL: "/produkte/" + this.produkt.data.produktURL,
            produktBild: this.produkt.data.bilder[0]["E"]["url"],
            showGTIN: this.produkt.data.EAN != "",
            herstellerName: this.produkt.data.MAN,
            gtin14: this.produkt.data.EAN,
            besterPreis: this.angebote.getBestPrice(false),
            hoherPreis: this.angebote.getWorstPrice(false),
            anzahlAngebote: this.angebote.countOffers(),
            description: addcslashes(produktText, '"\\'),
            reviews: contentReviews ? contentReviews.slice(0, -1) : "",
            showSnippetsTests: this.testberichte.getScore() > 0,
            showSnippetsAngebote: this.angebote.countOffers() > 0,
            showSnippetsMeinungen: !this.testberichte.getScore() && this.meinungen.countMeinungen(),
            snippetTestScore: this.testberichte.getScore(),
            snippetTestCount: this.testberichte.countTests(),
            snippetMeinungenCount: this.meinungen.countMeinungen(),
            snippetMeinungenScore: this.meinungen.getMeinungenPunkte(),
        };

        return contentSnippets;
    };
}

module.exports = new PageProdukt();
