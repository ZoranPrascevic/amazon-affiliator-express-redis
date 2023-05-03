const { numberFormat } = require("../../utils/functions.inc");
const Schnellsuche = require("../class.Schnellsuche");

class AjaxSchnellsuche {
    constructor() {}

    load = async (req) => {
        const keyword = req.body.searchKey;

        const out = {
            contentLeft: [],
            contentRight: [],
        };

        if (keyword) {
            const schnellsuche = new Schnellsuche(keyword);

            let right = {
                Kategorien: [],
                Hersteller: [],
                "Beliebte Suchen": [],
            };

            let left = {
                Kategorien: [],
                "Filter Hersteller": [],
                Hersteller: [],
                Filter: [],
                Filterkombinationen: [],
                Herstellerfilter: [],
                Serien: [],
                Produkte: [],
            };

            try {
                let erg = schnellsuche.sucheKategorien();
                left["Kategorien"] = erg["left"] ? erg["left"] : [];
                right["Kategorien"] = right["Kategorien"].concat(erg["right"] ? erg["right"].slice(0, 3) : []);

                erg = schnellsuche.sucheFilterHersteller();
                left["Filter Hersteller"] = erg["left"] ? erg["left"] : [];
                right["Kategorien"] = right["Kategorien"].concat(rg["right"] ? erg["right"].slice(0, 4) : []);

                erg = schnellsuche.sucheHersteller();
                left["Hersteller"] = erg["left"] ? erg["left"] : [];
                right["Hersteller"] = right["Hersteller"].concat(erg["right"] ? erg["right"].slice(0, 3) : []);

                erg = schnellsuche.sucheFilter();
                left["Filter"] = erg["left"] ? erg["left"] : [];
                right["Beliebte Suchen"] = right["Beliebte Suchen"].concat(
                    erg["right"] ? erg["right"].slice(0, 3) : []
                );

                erg = schnellsuche.sucheFilterkombi();
                left["Filterkombinationen"] = erg["left"] ? erg["left"] : [];
                right["Beliebte Suchen"] = right["Beliebte Suchen"].concat(
                    erg["right"] ? erg["right"].slice(0, 2) : []
                );

                erg = schnellsuche.sucheHerstellerfilter();
                left["Herstellerfilter"] = erg["left"] ? erg["left"] : [];
                right["Beliebte Suchen"] = right["Beliebte Suchen"].concat(
                    erg["right"] ? erg["right"].slice(0, 4) : []
                );

                erg = schnellsuche.sucheSerien();
                left["Serien"] = erg["left"] ? erg["left"] : [];
                right["Beliebte Suchen"] = right["Beliebte Suchen"].concat(
                    erg["right"] ? erg["right"].slice(0, 3) : []
                );

                erg = schnellsuche.sucheProdukte();
                left["Produkte"] = erg["left"] ? erg["left"] : [];
            } catch (error) {}

            let erg = [];
            let direkteTreffer = [];
            for (const [k, v] of Object.entries(left)) {
                if (!v.length) continue;

                for (const [k2, v2] of Object.entries(v)) {
                    if (v2["produktName"].trim().toLowerCase() == keyword.trim().toLowerCase()) {
                        direkteTreffer.push(v2);
                        delete v[k2];
                    }
                }

                if (erg.length < 8) erg = erg.concat(v);
            }

            erg = direkteTreffer.concat(erg);

            if (erg.length > 8) erg = erg.slice(0, 8);

            let hasBoxRight =
                right["Kategorien"].length || right["Hersteller"].length || right["Beliebte Suchen"].length;
            let contentLeft = this.makeContentLeft(erg, hasBoxRight);
            let contentRight = this.makeContentRight(right);

            out.contentLeft = contentLeft;
            out.contentRight = contentRight;

            // schnellsuche.saveSuchanfrage();
        }

        return out;
    };

    makeContentLeft = (erg, hasBoxRight = false) => {
        let produkte = [];
        let sucheLines = "";
        let linePos = this.linePos;

        for (const val of erg) {
            if (produkte[val["produktID"]]) {
                continue;
            }

            produkte[val["produktID"]] = val["produktID"];
            linePos++;

            sucheLines.push({
                linePos: linePos,
                showPreis: val["preis"] && parseFloat(val["preis"]),
                preis: numberFormat(val["preis"], 2),
                show: val["show"],
                kategorieName: val["kategorieName"],
                anzahlTests: parseInt(val["anzahlTests"]),
                testNote: parseInt(val["score"]),
                testNoteText: this.getNoten(val["score"]),
                bild: val["bild"],
                link: val["link"],
                hasBoxRight: hasBoxRight,
            });

            this.linePos = linePos;
        }
        return sucheLines;
    };

    makeContentRight = (data) => {
        let sections = [];

        for (const [key, val] of Object.entries(data)) {
            if (!val.length) {
                continue;
            }

            let sucheLines = [];
            let linePos = this.linePos;

            for (const v of val) {
                if (!v["link"]) {
                    continue;
                }

                linePos++;

                sucheLines.push({
                    linePos: linePos,
                    show: v["show"],
                    link: v["link"],
                });
            }

            if (!sucheLines.length) {
                continue;
            }

            this.linePos = linePos;

            sections.push({
                section: key,
                lines: sucheLines,
            });
        }

        return sections;
    };

    getNoten = (score, tab = "pname") => {
        if (tab == "pname") {
            score = parseInt(score);

            if (score >= 90) {
                return "sehr gut";
            }
            if (score >= 75) {
                return "gut";
            }
            if (score >= 60) {
                return "befriedigend";
            }
            if (score >= 40) {
                return "ausreichend";
            }
            if (score >= 11) {
                return "mangelhaft";
            }
            if (score >= 1) {
                return "ungenügend";
            }

            return "keine Endnote";
        }

        if (tab == "shop") {
            score = parseFloat(score);

            if (score >= 4.5) {
                return "sehr gut";
            }
            if (score >= 3.5) {
                return "gut";
            }
            if (score >= 2.5) {
                return "befriedigend";
            }
            if (score >= 1.5) {
                return "ausreichend";
            }
            if (score >= 0.5) {
                return "mangelhaft";
            }
        }

        return "";
    };
}

module.exports = new AjaxSchnellsuche();
