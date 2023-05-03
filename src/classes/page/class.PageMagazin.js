const Kategorie = require("../class.Share.Kategorie");
const Magazin = require("../class.Magazin");
const Ausgabe = require("../class.Ausgabe");
const Testreihe = require("../class.Testreihe");
const { htmlEntities } = require("../../utils/functions.inc");
const { ANZAHL_TESTS_MAGAZIN, ANZAHL_TESTREIHEN_MAGAZIN } = require("../../constants/globals");

class PageMagazin {
    magazin = null;
    ausgabe = null;
    kategorie = null;

    ausgabeID = 0;
    kategorieID = 0;

    identifier = "";

    constructor() {}

    load = async () => {
        this.magazin = await Magazin.getByURL(this.identifier);
        if (!this.magazin.isLoad) {
            throw new Error(`Magazin "${this.identifier}" nicht gefunden`);
        }

        let title = this.magazin.data.testerName;
        if (this.ausgabeID) {
            if (!this.ausgabe) this.ausgabe = await Ausgabe.getByID(this.ausgabeID);

            if (!this.ausgabe.isLoad) {
                throw new Error(`Ausgabe "${this.identifier}" nicht gefunden`);
            }

            title += " - Ausgabe " + this.ausgabe.data.ausgabe;
        }
        if (this.kategorieID) {
            if (!this.kategorie) this.kategorie = await Kategorie.getByID(this.kategorieID);

            if (!this.kategorie.isLoad) {
                throw new Error(`Kategorie "${this.identifier}" nicht gefunden`);
            }

            title += " - " + this.kategorie.data.kategorieName;
        }
    };

    queryFilterBox = async (req) => {
        this.identifier = req.params.magazineName;

        if (req.query.ausgabeID !== undefined) {
            const ausgabeID = req.query.ausgabeID.split("-");
            this.ausgabeID = ausgabeID[ausgabeID.length - 1];
        } else this.ausgabeID = 0;

        if (req.query.kategorieURL !== undefined) {
            const kategorieURL = req.query.kategorieURL;

            this.kategorie = await Kategorie.getByURL(kategorieURL);
            if (!this.kategorie.isLoad) {
                throw new Error(`Kategorie "${kategorieURL}" nicht gefunden`);
            }

            this.kategorieID = this.kategorie.data.id;
        } else this.kategorieID = 0;

        await this.load();

        const filterBox = await this.makeFilterBoxen();

        return filterBox;
    };

    queryTestBox = async (req) => {
        this.identifier = req.params.magazineName;

        if (req.query.ausgabeID !== undefined) {
            const ausgabeID = req.query.ausgabeID.split("-");
            this.ausgabeID = ausgabeID[ausgabeID.length - 1];
        } else this.ausgabeID = 0;

        if (req.query.kategorieURL !== undefined) {
            const kategorieURL = req.query.kategorieURL;

            this.kategorie = await Kategorie.getByURL(kategorieURL);
            if (!this.kategorie.isLoad) {
                throw new Error(`Kategorie "${kategorieURL}" nicht gefunden`);
            }

            this.kategorieID = this.kategorie.data.id;
        } else this.kategorieID = 0;

        await this.load();

        if (req.params.page) var pageNumber = parseInt(req.params.page);
        else var pageNumber = 1;

        const testBoxCount = this.magazin.countTests(this.ausgabeID, this.kategorieID);
        const totalPageCount = Math.ceil(testBoxCount / ANZAHL_TESTS_MAGAZIN);

        const testBox = await this.makeTestBox(pageNumber);

        const vars = {
            pageNumber,
            totalPageCount,
            testBox,
        };

        return vars;
    };

    queryTestreiheBox = async (req) => {
        this.identifier = req.params.magazineName;

        if (req.query.ausgabeID !== undefined) {
            const ausgabeID = req.query.ausgabeID.split("-");
            this.ausgabeID = ausgabeID[ausgabeID.length - 1];
        } else this.ausgabeID = 0;

        if (req.query.kategorieURL !== undefined) {
            const kategorieURL = req.query.kategorieURL;

            this.kategorie = await Kategorie.getByURL(kategorieURL);
            if (!this.kategorie.isLoad) {
                throw new Error(`Kategorie "${kategorieURL}" nicht gefunden`);
            }

            this.kategorieID = this.kategorie.data.id;
        } else this.kategorieID = 0;

        await this.load();

        if (req.params.page) var pageNumber = parseInt(req.params.page);
        else var pageNumber = 1;

        const testreiheBoxCount = this.magazin.countTestreihen(this.ausgabeID, this.kategorieID);
        const totalPageCount = Math.ceil(testreiheBoxCount / ANZAHL_TESTREIHEN_MAGAZIN);

        const testreiheBox = await this.makeTestreiheBox(pageNumber);

        const vars = {
            pageNumber,
            totalPageCount,
            testreiheBox,
        };

        return vars;
    };

    makeFilterBoxen = async () => {
        let deleteFilter = [];
        if (this.ausgabeID) {
            deleteFilter.push({
                link: "/de/magazine/" + this.magazin.data.testerURL + (this.kategorieID ? "-K" + this.kategorie.data.kategorieURL : ""),
                title: this.ausgabe.data.ausgabe,
                titleShow: this.magazin.data.testerURL + (this.kategorieID ? " - " + this.kategorie.data.kategorieName : ""),
            });
        }
        if (this.kategorieID) {
            deleteFilter.push({
                link: "/de/magazine/" + this.magazin.data.testerURL + (this.ausgabeID ? "-A" + this.ausgabe.data.ausgabeURL : ""),
                title: this.kategorie.data.kategorieName,
                titleShow: this.magazin.data.testerURL,
            });
        }

        if (deleteFilter.length) {
            deleteFilter.push({
                link: this.magazin.data.url,
                title: "Alle Filter löschen",
                titleShow: this.magazin.data.testerName,
            });
        }

        const filter = await this.magazin.getFilter(this.ausgabeID, this.kategorieID);

        const contentFilterBoxen = {
            postURL: this.magazin.data.url,
            filter: filter["filter"],
        };

        return contentFilterBoxen;
    };

    makeTestBox = async (pageNumber) => {
        const start = (pageNumber - 1) * ANZAHL_TESTS_MAGAZIN;
        const end = pageNumber * ANZAHL_TESTS_MAGAZIN;

        const tests = await this.magazin.getTests(start, end, this.ausgabeID, this.kategorieID);

        let contentTests = [];
        for (const test of tests) {
            let circleColor;
            let strokeOffset;
            let testnotePShow;

            if (!test["noteTB"]) {
                circleColor = "grey";
            } else if (test["noteTB"] < 40) {
                circleColor = "red";
            } else if (test["noteTB"] < 60) {
                circleColor = "yellow";
            } else if (test["noteTB"] < 75) {
                circleColor = "lime-green";
            } else {
                circleColor = "green";
            }

            if (test["noteTB"] === null) {
                strokeOffset = 0;
                testnotePShow = "-";
            } else {
                strokeOffset = 629;
                strokeOffset = Math.round((strokeOffset / 100) * test["noteTB"]);
                testnotePShow = test["noteTB"] + "%";
            }

            const testnoteCircle = {
                testnoteProzent: testnotePShow,
                circleColor: circleColor,
                strokeOffset: strokeOffset,
            };

            const exp = test["preis"].split(",");

            contentTests.push({
                produktLink: test["produktURL"],
                produktName: test["produktName"],
                bildLink: test["bildLink"],
                isNoIndex: test["noIndex"] == 1,
                note: test["note"],
                auszeichnung: test["auszeichnung"],
                fazit: test["fazit"],
                teaser: test["teaser"],
                originalFazit: test["originalFazit"],
                pros: test["pros"],
                contras: test["contras"],
                details: test["details"],
                angebote: test["angebote"],
                preisVK: exp[0] ? exp[0] : "",
                preisNK: exp[1] ? exp[1] : "",
                testnoteCircle: testnoteCircle,
            });
        }

        return contentTests;
    };

    makeTestreiheBox = async (pageNumber) => {
        const start = (pageNumber - 1) * ANZAHL_TESTREIHEN_MAGAZIN;
        const end = pageNumber * ANZAHL_TESTREIHEN_MAGAZIN;

        const testreihen = await this.magazin.getTestreihen(start, end, this.ausgabeID, this.kategorieID);

        let contentTestreihen = [];
        for (const row of testreihen) {
            let tmpBeschreibung;

            if (row["eigeneBeschreibung"]) {
                tmpBeschreibung = row["eigeneBeschreibung"];
            } else {
                tmpBeschreibung = row["beschreibung"];
            }

            let beschreibung = tmpBeschreibung.match(/(.|[\r\n]){1,200}/g);

            if (beschreibung) {
                beschreibung = htmlEntities(beschreibung[0]);
                if (tmpBeschreibung && tmpBeschreibung != beschreibung[0]) {
                    beschreibung += "...";
                }
            }

            const tr = await Testreihe.getByID(row["id"]);

            let produkte = [];
            let bildLink = "";
            for (const t of tr.data.tests) {
                produkte.push(t["produktName"]);

                if (!bildLink) bildLink = t["bildLink"];
            }

            contentTestreihen.push({
                bildLinkTestreihe: bildLink,
                title: row["ueberschrift"] ? row["ueberschrift"] : "Testvergleich aus " + row["testerName"] + " " + row["ausgabe"],
                showLinkTestreihe: !row["noIndex"],
                testreiheLink: "/de/vergleich/" + row["testerURL"] + "-" + row["id"],
                ausgabeName: row["ausgabe"],
                produkte: htmlEntities(produkte.join(",")),
                beschreibung: beschreibung,
            });
        }

        return contentTestreihen;
    };
}

module.exports = new PageMagazin();
