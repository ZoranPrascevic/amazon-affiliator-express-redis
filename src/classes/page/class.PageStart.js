const Index = require("../class.Index");
const HttpException = require("../../utils/HttpException.utils");
const Kategorie = require("../class.Kategorie");
const Strings = require("../class.Strings");
const { ANZAHL_START_TESTREIHEN } = require("../../constants/globals");

class PageStart {
    index = null;

    constructor() {
        this.load();
    }

    load = () => {
        this.index = Index.getInstance();

        if (!this.index.isLoad) {
            throw new HttpException(502, "Index konnte nicht geladen werden");
        }
    };

    makeTopProdukte = async () => {
        let produkte = await this.index.getTopProdukte();

        produkte.sort((a, b) => {
            return a["punkte"] - b["punkte"];
        });

        return produkte;
    };

    makeKategorien = async () => {
        let tree = await Kategorie.getCompleteTreeRekursive();
        tree = tree[0];

        tree = { childs: tree };

        tree = await this.getTree(tree, 3);

        const sortedTree = this.sortedTree(tree);

        return sortedTree;
    };

    sortedTree(object) {
        return Array.isArray(object)
            ? object.map(sortedTree)
            : object && typeof object === "object"
            ? Object.fromEntries(Object.entries(object).map(([k, v]) => [v && v.lft? v.lft : k, this.sortedTree(v)]))
            : object;
    }

    makeTestreihen = async () => {
        let testreihen = await this.index.getTestreihen(ANZAHL_START_TESTREIHEN);

        testreihen.forEach((row) => {
            row["title"] = row["ueberschrift"].replace("Vergleichstest", "Test").substring(0, 40);
            row["text"] = Strings.dataSnippet(row["beschreibung"], 15);
        });

        return testreihen;
    };

    makeTopSlider = async () => {
        const slider = await this.index.getTopSlider();

        return slider;
    };

    getTree = async (tree, maxLevel = null, level = 0) => {
        level++;

        let ret = {};
        let tmp = {};

        for (const [k, kat] of Object.entries(tree["childs"])) {
            let row = { ...kat };
            row["childs"] = null;

            row["kategorieBild"] = row["kategorieBild"].replace("/S", "/E");
            row["kategorieLink"] = `/${row["kategorieURL"]}/`;

            if (kat["childs"]) {
                const childList = await this.getTree(kat, maxLevel, level);
                if (level >= maxLevel) {
                    ret[k] = row;
                    for (const k2 in childList) {
                        if (Object.hasOwnProperty.call(childList, k2)) {
                            ret[k2] = childList[k2];
                        }
                    }
                } else {
                    row["childs"] = childList;
                    ret[k] = row;
                }
            } else {
                if (level >= maxLevel) ret[k] = row;
                else tmp[k] = row;
            }
        }

        if (Object.keys(tmp).length) {
            tree["childs"] = {};
            ret[tree["id"]] = tree;
            for (const k in tmp) {
                if (Object.hasOwnProperty.call(tmp, k)) {
                    ret[tree["id"]]["childs"][k] = tmp[k];
                }
            }
        }

        return ret;
    };
}

module.exports = new PageStart();
