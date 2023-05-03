class Strings {
    constructor() {}

    static descReplace = (beschreibung) => {
        let catbeschreibungsql_top = beschreibung.replace("<p>", ""); // DAMIT ALTE TEXTE MIT P überschrieben werden
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</p>", ""); // DAMIT ALTE TEXTE MIT P überschrieben werden
        catbeschreibungsql_top = `<p>${catbeschreibungsql_top}</p>`;
        catbeschreibungsql_top = catbeschreibungsql_top.replace("\n\n", "</p>\n<p>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("\r\n\r\n", "</p>\n<p>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("\n\r\n", "</p>\n<p>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</div></p>", "</div>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><div", "<div");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p></div>", "</div>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace('"></p>', '">');
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><h5>", "<h5>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</h5></p>", "</h5>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><h4>", "<h4>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</h4></p>", "</h4>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><h3>", "<h3>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</h3></p>", "</h3>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</h3> </p>", "</h3>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><h2>", "<h2>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</h2></p>", "</h2>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><ul>", "<ul>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><ol>", "<ol>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><ul", "<ul");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</ul></p>", "</ul>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</ol></p>", "</ol>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><p>", "<p>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p><p ", "<p ");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("</p></p>", "</p>");
        catbeschreibungsql_top = catbeschreibungsql_top.replace("<p></p>", "");
        return catbeschreibungsql_top;
    };

    static manURLEncode = (man) => {
        man = man.toLowerCase();
        const suche = ["ä", "ö", "ü", " ", "&", ".", "+", ",", "@", "é", "ô", "=", "ß", "_", "/"];
        const ersetze = ["ae", "oe", "ue", "-", "-", "-", "-", "-", "a", "e", "o", "-", "ss", "-", "-"];

        for (let i = 0; i < suche.length; i++) {
            man = man.replace(suche[i], ersetze[i]);
        }

        man == man.replace(/[^a-z0-9-]/, "");

        return man;
    };

    static dataSnippet = (datasnippet, anzahl = 10) => {
        let datenblatt = datasnippet.replace(" // ", " / ");
        datenblatt = datenblatt.replace(" - ", " / ");
        datenblatt = datenblatt.split(" ").slice(0, anzahl);
        datenblatt = datenblatt.join(" ");
        return datenblatt;
    };

    static replacePseudoCode = (text) => {
        function Bilder(match) {
            const matches = match[0].match(/[A-Z]+=\"[^\"]+\"/g);

            let vars = {};
            matches.forEach((m) => {
                const exp = m.split("=");
                if (exp.includes("URL") > -1)
                    if (parseInt(exp[1])) vars.cont = exp[1];
                    else vars.cont = "40";

                if (exp.includes("URL") > -1) vars.bildURL = exp[1];
                else vars.bildURL = "";

                if (exp.includes("ALT") > -1) vars.altText = exp[1];
                else vars.altText = "";
            });

            return vars;
        }

        function Videos(match) {
            const matches = match[0].match(/[A-Z]+=\"[^\"]+\"/g);

            let vars = {};
            matches.forEach((m) => {
                const exp = m.split("=");
                if (exp.includes("TITLE") > -1);
                else vars.title = "Video";

                if (exp.includes("CONT") > -1)
                    if (parseInt(exp[1])) vars.title = exp[1];
                    else vars.cont = "";

                if (exp.includes("VIDEOID") > -1) vars.videoID = exp[1];
                else vars.videoID = "";
            });

            return vars;
        }

        function ProUndContra(match) {
            const matches = match[0].match(/\[PRO\](.+)\[\/PRO\]/g);

            let vars = {};

            return vars;
        }

        function UlLi(match) {
            const matches = match[0].match(/\[LI\](.+)\[\/LI\]/g);

            let vars = {};

            return vars;
        }

        function DivContainer(match) {
            const matches = match[0].match(/[A-Z]+=\"[^\"]+\"/g);

            let vars = {};

            return vars;
        }

        function Link(match) {
            const matches = match[0].match(/[A-Z]+=\"[^\"]+\"/g);

            let vars = {};

            return vars;
        }

        function bTag(match) {
            let vars = {};

            return vars;
        }

        function iTag(match) {
            let vars = {};

            return vars;
        }

        function uTag(match) {
            let vars = {};

            return vars;
        }

        function Tabelle(match) {
            const matches = match[0].match(/\[TH( .+)?\](.+)\[\/TH\]/g);

            let vars = {};

            return vars;
        }

        const bilder = text.match(/\[IMG (.+)\/\]/);
        const videos = text.match(/\[VID (.+)\/\]/);
        const proUndContra = text.match(/\[PROCONBOX\](.+)\[\/PROCONBOX\]/);
        const ulLi = text.match(/\[UL\](.+)\[\/UL\]/);
        const divContainer = text.match(/\[DIV( .+)?\](.+)\[\/DIV\]/);
        const link = text.match(/\[LINK( .+)?\](.+)\[\/LINK\]/);
        const btag = text.match(/\[B\](.+)\[\/B\]/);
        const itag = text.match(/\[I\](.+)\[\/I\]/);
        const utag = text.match(/\[U\](.+)\[\/U\]/);
        const tabelle = text.match(/\[TABELLE( .+)?\](.+)\[\/TABELLE\]/);

        if (bilder !== null) text = Bilder(bilder);
        if (videos !== null) text = Videos(videos);
        if (proUndContra !== null) text = ProUndContra(proUndContra);
        if (ulLi !== null) text = UlLi(ulLi);
        if (divContainer !== null) text = DivContainer(divContainer);
        if (link !== null) text = Link(link);
        if (btag !== null) text = bTag(btag);
        if (itag !== null) text = iTag(itag);
        if (utag !== null) text = uTag(utag);
        if (tabelle !== null) text = Tabelle(tabelle);

        return text;
    };

    static makeHtmlentities = (str = "") => {
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    };

    static wortKuerzen = (string, length, placeholder = "...") => {
        if (string.length > length) {
            string = string.substring(0, length) + placeholder;
            // string = string.substring(0, string.indexOf(" ")) + placeholder;
        }
        return string;
    };
}

module.exports = Strings;
