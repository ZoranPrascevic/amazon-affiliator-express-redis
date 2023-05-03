const { htmlEntities, getNote } = require("../../utils/functions.inc");
const Hersteller = require("../class.Hersteller");
const Kategorie = require("../class.Kategorie");
const Produktliste = require("../class.Produktliste");
const {
    ANZAHL_PRODUKTE_HERSTELLER,
    ANZAHL_KATEGORIE_PRODUKT_DATENBLATT,
} = require("./../../constants/globals");

class PageHersteller {
    hersteller = null;

    produktListe = null;
    produkte = null;
    filter = null;

    page = 1;

    constructor() {}

    load = async (req) => {
        this.identifier = req.params.producerName;

        if (req.query.filter) this.categoryNames = req.query.filter;
        else this.categoryNames = "";

        if (req.params.page) this.page = parseInt(req.params.page);
        else this.page = 1;

        this.hersteller = await Hersteller.getByURL(this.identifier);
        if (!this.hersteller.isLoad) {
            throw new Error('Hersteller "' + this.identifier + '" nicht gefunden');
        }

        let haupBox;
        if (this.categoryNames) {
            this.produktListe = new Produktliste("", this.hersteller.data.herstellerURL);

            await Promise.all(
                this.categoryNames.split(",").map(async (category) => {
                    const kategorie = await Kategorie.getByURL(category);

                    if (kategorie.getIsLoad && kategorie.getIsLeaf) {
                        await this.produktListe.multipleLoad(kategorie);
                    }
                })
            );

            this.filter = await this.produktListe.getFilter();

            haupBox = this.makeHauptbox();
        } else {
            this.produktListe = new Produktliste("", this.hersteller.data.herstellerURL);
            await this.produktListe.load();
            this.filter = await this.produktListe.getFilter();

            haupBox = this.makeHauptbox();
        }

        return haupBox;
    };

    makeHauptbox = async () => {
        let start = (this.page - 1) * ANZAHL_PRODUKTE_HERSTELLER;

        const totalProductCount = this.produktListe.getProductCount();
        let totalPageCount = Math.ceil(totalProductCount / ANZAHL_PRODUKTE_HERSTELLER);

        this.produkte = await this.produktListe.getItems(start, ANZAHL_PRODUKTE_HERSTELLER);

        let i = 0;
        let contentProdukte = [];
        for (const key in this.produkte) {
            const produkt = this.produkte[key];
            console.log('key', key)
            i++;

            const prdJson = {
                id: "1-" + produkt["id"],
                pname: produkt["pname"].replace("'", "&x27;"),
                url: produkt["produktURL"],
                score: produkt["score"],
            };

            const datenblatt = produkt["datenblatt"].slice(0, ANZAHL_KATEGORIE_PRODUKT_DATENBLATT);

            contentProdukte.push({
                pos: i,
                produktID: produkt["id"],
                produktName: htmlEntities(produkt["pname"]),
                produktName: produkt["produktURL"],
                produktNameKurz: htmlEntities(
                    produkt["pname"].slice(0, 45) + (produkt["pname"].length > 45 ? "..." : "")
                ),
                produktURL: produkt["produktURL"],
                produktLink: produkt["produktLink"],
                produktBildURL: produkt["img"],
                produktBildBreite: produkt["breite"],
                herstellerName: produkt["hersteller"],
                merklisteJSON: prdJson,
                datenblatt: datenblatt,
                showMeinungen: produkt["meinungen"],
                score: produkt["score"],
                anzahlTests: produkt["tests"],
                anzahlSterne: produkt["meinungenStars"],
                anzahlMeinungen: produkt["meinungen"],
                produktPreis: produkt["preis"],
                anzahlAngebote: produkt["angebote"],
                testNoteText: getNote(produkt["score"], produkt["tests"]),
                ean: produkt["ean"],
                eek: produkt["energieEffizienzKlasse"],
                eekC: produkt["energieEffizienzKlasse"].toLowerCase().replace("+", "p"),
            });
        }

        const contentFilter = this.makeFilterbox();

        const contentHauptbox = {
            contentFilter: contentFilter,
            contentProdukte: contentProdukte,
            totalProductCount: totalProductCount,
            pageNumber: this.page,
            totalPageCount: totalPageCount,
        };

        return contentHauptbox;
    };

    makeFilterbox = () => {
        const contentFilter = {
            postURL: this.hersteller.data.herstellerURL,
            filterName: this.filter.name,
            filter: this.filter["filter"],
        };

        return contentFilter;
    };
}

module.exports = new PageHersteller();
