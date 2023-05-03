exports.limit = 30; //KATEGORIE
exports.limitNeueProdukte = 5; //KATEGORIE
exports.limitTestReihen = 2; //KATEGORIE
exports.testsSeite1 = 10;
exports.meinungenSeite1 = 2;
exports.limitTopFilter = 1; // Anzahl Filter auf Produktseite für interne Verlinkung
exports.cdnSub = "https://cdn.testbericht.de";
exports.cdnimgSub = "https://images.testbericht.de";
exports.cdnimgSubG = "https://img.testbericht.de";
exports.cdnProduktImages = "https://images.testbericht.de/produktbilder";
exports.cdnShops = "https://img.testbericht.de/shops";
exports.cdnTester = "https://img.testbericht.de/tester";

exports.SITE_URL = "";
exports.SITE_URL_HTTPS = "https://dev.webtestberichet.com:8081";
exports.SITE_URL_HTTP = "http://dev.webtestberichet.com:80";
exports.DOCUMENT_ROOT = `${__dirname}`;

exports.SITE_CDN = "https://cdn.testbericht.de";
exports.SITE_IMG_GOOGLE = "https://img.testbericht.de";
exports.CDN_SHOPS = "https://img.testbericht.de/shops";

//Kategorie
exports.globalFilterNoindex = 1; //wenn mehr als diese Filter Aktiv sind, dann ist es auf Noindex

exports.angeboteAnzeigeAnzahl = 6;
exports.ANZAHL_ANGEBOTE = 8; // Anzahl der Angebote in einem Produkt
exports.ANZAHL_TESTS = 10; // Anzahl der Tests in einem Produkt
exports.ANZAHL_MEINUNGEN = 4; // Anzahl der Meinungen in einem Produkt
exports.PRODUKTE_NISCHENKATEGORIE = 10; // Werden max. in Nischenkategorien angezeigt
exports.FILTER_KOMBI_ANZAHL = 20; // Anzahl Filterkombinationen im Footer pro Seite
exports.ANZAHL_KATEGORIE_PRODUKTE = 30; // Anzahl der Produkte pro Seite
exports.ANZAHL_KATEGORIE_PRODUKTE_SEITE_1 = 30; // Anzahl der Produkte auf Seite 1 von 10 auf 30 geändert DG 11.02.2017

exports.promotedAmzPartner = [
    1, // tbe.org
    44, // sparbote.de
];

exports.gesperrteIPs = [
    /*"95.90.120.73",
    "95.113.114.138",
    "85.182.130.187",
    "188.174.230.146",
    "84.190.114.228",
    "95.90.120.73",
    "86.56.84.138",
    "88.70.43.252"*/
    "91.121.107.25",
    "159.149.133.252",
];

exports.gesperrteUAs = ["Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.1) Gecko/20090624 Firefox/3.5"];

exports.dataRepl_obj = {
    "Bildschirmgröße:": "Bildschirmdiagonale:",
    "Art:": "Geräte-Typ:",
    "1920 x 1080 Pixel": "1.920 x 1.080 Pixel",
    "Produkttyp: ": "",
};

exports.dateRepl_obj = {
    Mon: "Mo",
    Teu: "Di",
    Wed: "Mi",
    Thu: "Di",
    Fri: "Fr",
    Sat: "Sa",
    Sun: "So",
    May: "Mai",
    Mar: "Mrz",
    Dec: "Dez",
};

exports.url_repl_obj = {
    "/": "-",
    "\\": "-",
    ")": "-",
    "(": "-",
    "   ": "-",
    "  ": "-",
    " ": "-",
    ",": "-",
    ";": "-",
    ".": "",
    " µ ": "-",
    "µ ": "",
    µ: "-",
    "#": "",
    "'": "",
    '"': "",
    "&auml;": "ae",
    "&Auml;": "Ae",
    "&Uuml;": "Ue",
    "&Ouml;": "Oe",
    "&ouml;": "oe",
    "&uuml;": "ue",
    " &szlig; ": "-",
    "&szlig;": "ss",
    "&": "-",
    " & ": "-",
    ":": "-",
    " : ": "-",
    "?": "",
    "%": "",
    "!": "",
    "+": "",
    "¿": "",
    Ã: "A",
    "°": "",
    "[": "",
    "]": "",
    ü: "ue",
    Ü: "Ue",
    ä: "ae",
    Ä: "Ae",
    ß: "ss",
    ö: "oe",
    Ö: "Oe",
    É: "E",
    é: "e",
    È: "E",
    è: "e",
    À: "A",
    à: "a",
    Â: "A",
    â: "a",
    "\t": "-",
    " + ": "-",
    " schwarz": "",
    " blau": "",
    " rot": "",
    " pink": "",
    " grün": "",
    " rosa": "",
    " weiss": "",
    " weiß": "",
    " silber": "",
    " silver": "",
    " black": "",
    " Black": "",
    " Schwarz": "",
    " Blau": "",
    " Rot": "",
    " Pink": "",
    " Grün": "",
    " Rosa": "",
    " Weiss": "",
    " Weiß": "",
    " Silber": "",
    " Silver": "",
    " black": "",
    " Gold": "",
    " gold": "",
    " Grau": "",
    " grau": "",
    " Eisblau": "",
    " eisblau": "",
    " Braun": "",
    " braun": "",
    " blue": "",
    " Blue": "",
    " dunkelblau": "",
    " Dunkelblau": "",
    " Red": "",
    " red": "",
    " Midnight": "",
    " midnight": "",
    " Crystal": "",
    " crystal": "",
    " Ruby": "",
    " ruby": "",
    " Grau/Schwarz": "",
    " Tiefschwarz": "",
    " tiefschwarz": "",
    " rubinrot": "",
    " Rubinrot": "",
    " matt-schwarz": "",
    " Karamel": "",
    " karamel": "",
    " maroon/braun": "",
    " BODY": "",
    " Matt-glänzendes": "",
    " Anthrazit dunkel": "",
    " FHD": "",
    " piano /": "",
    " Alu-Design": "",
    " Gebürstetes": "",
    " Gehäuse mit Dekofront in Hochglanzoptik": "",
    " Gehäuse": "",
    " graphit-schwarz": "",
    " glänzend-schwarz": "",
    " Klavierlack-Schwarz": "",
    " Pianolack-Schwarz": "",
    " anthrazitfarbene Zierleiste": "",
    " Pianolackdesign": "",
    " Matt-Schwarz": "",
    " Anthrazit-Schwarz": "",
    " Mattschwarz": "",
    " klavierlack": "",
    " &farbene Zierleiste": "",
    " farbene Zierleiste": "",
    " elegantes Bordeauxrot": "",
    " Metal": "",
    " hochglänzend": "",
    "----": "-",
    "---": "-",
    "--": "-",
    "-": "-",
    Ž: "-",
    "`": "-",
    "*": "",
    "@": "a",
    "®": "",
    ">": "-",
    "<": "-",
    ê: "e",
    "%": "",
    ô: "o",
    ò: "o",
    $: "",
    ž: "",
    "²": "2",
    "~": "-",
    "³": "3",
    ë: "e",
    "«": "-",
    "»": "-",
    "=": "-",
    î: "i",
    ñ: "n",
    ï: "i",
    ç: "c",
    å: "a",
    ø: "",
    û: "u",
    í: "i",
    æ: "ae",
    "|": "-",
    " ": "-",
    "¨": "",
    "½": "1-2",
    "{": "-",
    "}": "-",
    "™": "",
    ã: "a",
    "¤": "",
    "¶": "",
    ù: "u",
    ý: "y",
    Ÿ: "Y",
    á: "a",
    "±": "",
    "©": "",
    "·": "",
    "­": "", // unsichtbares sonderzeichen
    "­": "", // unsichtbares sonderzeichen,
    º: "",
    "‚": "-",
    "­": "", // unsichtbares sonderzeichen
    ó: "o",
    ú: "u",
    ÿ: "y",
    "“": "",
    "×": "x",
    ì: "i",
    "–": "-",
    "¯": "",
    Ñ: "n",
};

exports.DB_REPLACE = {
    "Bildschirmdiagonale in Zoll": "Bildschirmgröße (Zoll):",
    "Bildschirmdiagonale in cm": "Bildschirmgröße (cm)",
    "Bildschirmgröße in cm": "Bildschirmgröße (cm)",
    "3D-Technologie": "3D Technologie",
    "Auflösung Höhe in Pixel": "Auflösung Höhe (Pixel)",
    "Auflösung Breite in Pixel": "Auflösung Breite (Pixel)",
    "Leistungsaufnahme im Standby-Zustand in W": "Stromverbrauch im Standby (W)",
    "Max. Leistungsaufnahme im Ein-Zustand in W": "Stromverbrauch (W)",
    "Energieverbrauch pro Jahr in kWh": "Jährlicher Energieverbrauch (kWh)",
    Energieeffizienzklasse: "Energie-Effizienzklasse",
    "Bildwiederholrate in Hz": "Bildwiederholungsrate (Hz)",
    Bildverhältnis: "Bildschirmformat",
    "Gewicht in kg": "Gewicht (kg)",
    "Tiefe in cm": "Tiefe (cm)",
    "Höhe in cm": "Höhe (cm)",
    "Breite in cm": "Breite (cm)",
    "Vertikale Frequenz in Hz": "Frequenz vertikal (Hz)",
    "Horizontale Frequenz in KHz": "Frequenz horizontal (KHz)",
    "Horizontaler Betrachtungswinkel": "Betrachtungswinkel",
    "Reaktionszeit in ms": "Reaktionszeit (ms)",
    "Lochmasken-/ Pixelabstand in mm": "Pixelabstand (mm)",
    "Bildhelligkeit in Candela/m²": "Bildhelligkeit (cd/m²)",
    "Anzahl Prozessorkerne": "Prozessorkerne",
    "Prozessor-Marke": "Prozessor Hersteller",
    "Speicherkapazität in GB": "Speicher (GB)",
    "Prozessor-Taktfrequenz in MHz": "Taktfrequenz (MHz)",
    "Arbeitspeicher (RAM) in MB": "Arbeitsspeicher (MB)",
    "Druckgeschwindigkeit in Seiten pro Minute in Farbe": "Druckgeschwindigkeit Farbe Min.",
    "Druckgeschwindigkeit in Seiten pro Minute in s/w": "Druckgeschwindigkeit s/w Min.",
    "Scanauflösung horizontal in dpi": "Scanauflösung(dpi)",
    "Anzahl Kopien pro Minute in Farbe": "Kopien Farbe Min.",
    "Anzahl Kopien pro Minute in s/w": "Kopien s/w  Min.",
    "Fassungsvermögen (Trockner) in kg": "max. Trockner-Fassungsvermögen (kg)",
    "Fassungsvermögen in kg": "max. Fassungsvermögen (kg)",
    "Schleuderumdrehungen pro min": "Schleuderumdrehungen (pro min)",
    "Geräuschpegel in dB": "Geräuschpegel max. (dB)",
    "Geräuschpegel Schleudern in dB": "max. Schleuder-Geräuschpegel (dB)",
    "Wasserverbrauch pro Jahr in l": "Wasserverbauch jährlich (l)",
    "Stromverbrauch pro Jahr in kWh": "Stromverbrauch jährlich (kWh)",
    Schleudereffizienzklasse: "Schleuder-Effizienzklasse",
};

/*
    INI Global Constants
*/

exports.SITE_URL_HTTPS_TBDE = "https://www.testbericht.de";
exports.SITE_URL_HTTPS_TBCOM = "https://www.testbericht.com";
exports.CDN_SLIDER = "https://img.testbericht.de/slider";
exports.CDN_TESTER = "https://img.testbericht.de/tester";
exports.PORTAL_NAME_TBDE = "Testbericht.de";
exports.PORTAL_NAME_TBCOM = "Testbericht.com";

exports.FILTER_INDEX_MAX = 1;

exports.ANZAHL_PRODUKT_TESTS = 5; // Anzahl der Tests pro Seite in einem Produkt
exports.ANZAHL_PRODUKT_ANGEBOTE = 8; // Anzahl der Angebote pro Seite in einem Produkt
exports.ANZAHL_PRODUKT_MEINUNGEN = 5; // Anzahl der Meinungen pro Seite in einem Produkt
exports.ANZAHL_PRODUKT_FRAGEN = 5; // Anzahl der Fragen pro Seite in einem Produkt
exports.ANZAHL_PRODUKT_FRAGEN_KATEGORIE = 3; // Anzahl der Fragen auf der rechten Seite der Fragenbox
exports.ANZAHL_PRODUKT_FRAGEN_KATEGORIE_KEINE = 2; // Anzahl der Fragen auf der rechten Seite der Fragenbox, wenn keine Fragen vorhanden sind
exports.PRODUKTE_WEITERE_DAVOR = 3; // Anzahl der weiteren Produkte vor der aktuellen sortPos
exports.PRODUKTE_WEITERE_DANACH = 3; // Anzahl der weiteren Produkte hinter der aktuellen sortPos
exports.PRODUKTE_TOP_DAVOR = 6; // Anzahl der Top-Produkte vor der aktuellen sortPos
exports.PRODUKTE_TOP_DANACH = 6; // Anzahl der Top-Produkte hinter der aktuellen sortPos
exports.PRODUKTE_SIMILAR_DAVOR = 6; // Anzahl der ähnlichen Produkte vor der aktuellen sortPos
exports.PRODUKTE_SIMILAR_DANACH = 6; // Anzahl der ähnlichen Produkte hinter der aktuellen sortPos
exports.PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTER = 4; // Anzahl der Filter-Links für beliebte Suchen
exports.PRODUKTE_ANZAHL_BELIEBTE_SUCHEN_FILTERKOMBI = 4; // Anzahl der Filterkombi-Links unter beliebte Suchen
exports.PRODUKTE_ANZAHL_MAX_BELIEBTE_SUCHEN = 16; // Gesamtanzahl der Links unter beliebte Suchen

exports.ANZAHL_SERIE_TESTS = 7; // Anzahl der Tests pro Seite in einer Serie
exports.ANZAHL_SERIE_ANGEBOTE = 8; // Anzahl der Angebote pro Seite in einer Serie
exports.ANZAHL_SERIE_MEINUNGEN = 4; // Anzahl der Meinungen pro Seite in einer Serie
exports.ANZAHL_SERIE_FRAGEN = 5; // Anzahl der Fragen pro Seite in einer Serie

exports.ANZAHL_PRODUKTE_NISCHENKATEGORIE = 10; // Werden max. in Nischenkategorien angezeigt
exports.ANZAHL_PRODUKTE_KATEGORIE = 33; // Anzahl der Produkte pro Seite (origin 32)
exports.ANZAHL_TESTREIHEN_KATEGORIE = 2; // Anzahl der Testreihen auf der Kategorieseite
exports.ANZAHL_PRODUKTE_HERSTELLER = 32; // Anzahl der Produkte pro Seite
exports.ANZAHL_PRODUKTE_SUCHE = 32; // Anzahl der Produkte pro Seite
exports.ANZAHL_KATEGORIE_PRODUKT_DATENBLATT = 4; // Anzahl der Zeilen vom Datenblatt, die angezeigt werden sollen
exports.ANZAHL_TESTS_MAGAZIN = 7; // Anzahl Tests auf der Magazin-Seite
exports.ANZAHL_TESTREIHEN_MAGAZIN = 5; // Anzahl Testreihen auf der Magazin-Seite

exports.ANZAHL_FILTER_KOMBI_KATEGORIE = 20; // Anzahl Filterkombinationen im Footer
exports.ANZAHL_FILTER_HAUPTKATEGORIE = 20; // Anzahl der Filter in der Hauptkategoriebox
exports.ANZAHL_FILTER_AUFGEKLAPPT = 4; // Anzahl der Filter, die in der Kategorie aufgeklappt sein sollen
exports.ANZAHL_PAGES_KATEGORIEN = 6; // Anzahl der Seiten im Pager in der Kategorie
exports.ANZAHL_PAGES_HERSTELLER = 6; // Anzahl der Seiten im Pager auf der Herstellerseite
exports.ANZAHL_PAGES_SUCHE = 6; // Anzahl der Seiten im Pager auf der Sucheseite
exports.ANZAHL_PAGES_MAGAZIN = 6; // Anzahl der Seiten im Pager auf der Magazin-Seite
exports.ANZAHL_START_TESTREIHEN = 6; // Anzahl Testreihen auf der Startseite

exports.ANZAHL_SHOP_BEWERTUNGEN = 10; // Anzahl der Shopbewertungen pro Seite auf der Shopseite

exports.APP_ANZAHL_PRODUKTE_KATEGORIE = 50; // Anzahl der Produkte pro Ladevorgang in der App

exports.MODUL_KEYWORDS = true; // true == Keywords in Tests werden ersetzt
exports.MODUL_TESTS_KEYWORDS = true; // true = Keywords von oben nach unten; false = Keywords von unten nacch oben
exports.MODUL_TESTS_MORE_OFFEN = true; // Bestimmt, ob die Pro und Contras bei Tests offen oder geschlossen sind
exports.MODUL_PRODUKT_TESTS_PAGER = false; // true = Es wird der Pager angezeigt und die Tests nachgeladen
exports.MODUL_SERIE_TESTS_PAGER = true; // true = Es wird der Pager angezeigt und die Tests nachgeladen
exports.MODUL_SOCIAL = false; // true = Anzeige der Social-Buttons
exports.MODUL_PROMOTED_OFFER = false; // true = Anzeige eines einzelnen ausgesuchten Angebotes
exports.MODUL_FILTER_FORM = true; // Filter über Formular absenden
exports.MODUL_LINKS_HIDE = false; // true = Links werden maskiert, bei false mit 'rel="nofollow"' markiert
exports.MODUL_CSS_INLINE = true; // true = CSS wird Inline auf jeder Seite angezeigt.
exports.MODUL_JS_INLINE = false; // true = JS wird Inline auf jeder Seite angezeigt.
exports.MODUL_JS_LOAD_SEPARATE = false; // true = JS-Dateien werden einzeln geladen statt einer Großen
exports.MODUL_JS_LOAD_ASYNC = false; // true = Lädt die JS-Datein in einem eigenen JS-Loader nach
exports.MODUL_JS_LOAD_BOTTOM = true; // true = JS-Dateien werden im Footer geladen
exports.MODUL_CLICKY = false; // true = Clicky-Statistik verwenden
exports.MODUL_GOOGLE_REMARKETING = false; // true = Google Remarketing verwenden
exports.MODUL_GOOGLE_ANALYTICS = true; // true = Google Analytics verwenden
exports.MODUL_PRODUKT_TOP_PRODUKTE = true; // true = Top-Produkte auf der Produktseite anzeigen
exports.MODUL_PRODUKT_WEITERE_PRODUKTE = true; // true = Weitere Produkte auf der Produktseite anzeigen
exports.MODUL_PRODUKT_AEHNLICHE_PRODUKTE = false; // true = ähnliche Produkte auf der Produktseite anzeigen

exports.EXCEPTION_KATEGORIE = 98;
exports.EXCEPTION_PRODUKT = 97;
exports.EXCEPTION_TESTREIHE = 93;
exports.EXCEPTION_MAGAZIN = 92;
exports.EXCEPTION_AUSGABE = 91;

exports.FILTER_INDEX_MAX = 1; // wenn gleich oder mehr als diese Filter Aktiv sind, dann ist es auf Noindex

exports.GOOGLE_CAPTCHA_SECRET = "6LeaxikTAAAAALGaidlDWcoUjamXPNhi8NA7vqOy";

exports.SERVER = {
    "t1-tbde-v1": "S1",
    "t1-tbde-v2": "S2",
    "t1-tbde-v3": "S3",
    "t1-tbde-v4": "S4",
};

exports.MONATE = {
    January: "Januar",
    February: "Februar",
    March: "März",
    April: "April",
    May: "Mai",
    June: "Juni",
    July: "Juli",
    August: "August",
    September: "September",
    October: "Oktober",
    November: "November",
    December: "Dezember",
    1: "Januar",
    2: "Februar",
    3: "März",
    4: "April",
    5: "Mai",
    6: "Juni",
    7: "Juli",
    8: "August",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Dezember",
};

exports.LAENDERLISTE = {
    at: "Österreich",
    be: "Belgien",
    ch: "Schweiz",
    cn: "China",
    cz: "Tschechien",
    de: "Deutschland",
    dk: "Dänemark",
    es: "Spanien",
    fr: "Frankreich",
    gb: "Großbritannien",
    hk: "Hongkong",
    ie: "Irland",
    it: "Italien",
    li: "Lichtenstein",
    nl: "Niederlande",
    pl: "Polen",
    pt: "Portugal",
    sg: "Singapur",
    tw: "Taiwan",
    uk: "Großbritannien",
    us: "Vereinigte Staaten von Amerika",
};
