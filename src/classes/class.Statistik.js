class Statistik {
    static db2 = null;

    scriptStart = 0;

    constructor() {
        this.scriptStart = new Date().getTime();
    }

    static addBotEntry = (modul, produktName, kategorieName, herstellerURL = "", filterURL = "") => {};
}
