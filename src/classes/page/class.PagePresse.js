const Presse = require("../class.Presse");
const Strings = require("../class.Strings");

class PagePresse {
    presse = null;
    identifier = "";

    constructor() {}

    load = async (req) => {
        if (req.params.identifier && req.params.identifier !== undefined) this.identifier = req.params.identifier;
        else this.identifier = "";

        if (this.identifier) {
            this.presse = await Presse.getByURL(this.identifier);

            if (!this.presse.isLoad) {
                throw new Error("Artikel " + this.identifier + " konnte nicht geladen werden");
            }

            let nr = 0;
            let abschnitte = [];
            let sidebarLinks = [];
            for (const [k, row] of Object.entries(this.presse.data.artikel)) {
                nr++;

                abschnitte.push({
                    absatzID: row["id"],
                    ueberschrift: row["ueberschrift"],
                    inhalt: Strings.replacePseudoCode(row["inhalt"]),
                });

                sidebarLinks.push({
                    absatzID: row["id"],
                    ueberschrift: row["ueberschrift"],
                    menueNr: nr,
                });
            }

            let glossar = [];
            if (this.presse.data.glossar.length) {
                for (const [k, row] of Object.entries(this.presse.data.glossar)) {
                    glossar.push({
                        absatzID: row["id"],
                        ueberschrift: row["ueberschrift"],
                        inhalt: Strings.descReplace(Strings.replacePseudoCode(row["inhalt"])),
                    });
                }
            }

            const liste = await Presse.getArtikelListe();

            let i = 0;
            let artikelLinks = [];
            for (const artikel of liste) {
                if (artikel["id"] == this.presse.data.id || !artikel["aktiv"]) {
                    continue;
                }

                artikelLinks.push({
                    link: "/presse/" + artikel["url"],
                    bildURL: artikel["bildURL"],
                    ueberschrift: artikel["ueberschrift"],
                });

                i++;

                if (i == 5) {
                    break;
                }
            }

            const content = {
                artikel: abschnitte,
                glossar: glossar,
                letzteArtikel: artikelLinks,
            };

            const sidebar = {
                sidebarLinks: sidebarLinks,
                extraSidebar: this.presse.data.sidebar,
            };

            var vars = {
                h1Title: this.presse.data.ueberschrift,
                coverImg: this.presse.data.bildURL,
                content: content,
                sidebar: sidebar,
            };
        } else {
            const liste = await Presse.getArtikelListe();

            let i = 0;
            let artikelboxen = [];
            for (const artikel of liste) {
                if (!artikel["aktiv"]) {
                    continue;
                }

                artikelboxen.push({
                    link: "/presse/" + artikel["url"],
                    ueberschrift: artikel["ueberschrift"],
                    bildURL: artikel["bildURL"],
                    teaser: artikel["teaser"],
                });

                i++;

                if (i == 15) {
                    break;
                }
            }

            var vars = {
                h1Title: "Letzte Publikationen",
                content: artikelboxen,
            };
        }

        return vars;
    };
}

module.exports = new PagePresse();
