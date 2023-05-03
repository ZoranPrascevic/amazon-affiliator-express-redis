const express = require("express");
const router = express.Router();

const {
    queryBoxSummary,
    queryTestsBox,
    queryAngeboteBox,
    queryPreishistorieBox,
    queryMeinungenBox,
    queryFragenBox,
    queryInformationenBox,
    queryTopProdukteBox,
    queryWeitereProdukteBox,
    querySimilarProdukteBox,
    queryFilterkombiBox,
    queryPreisalarmBox,
    querySnipptes,
} = require("../classes/page/class.PageProdukt");
const { queryFilterBox, queryTestBox, queryTestreiheBox } = require("../classes/page/class.PageMagazin");
const { makeTopProdukte, makeKategorien, makeTestreihen, makeTopSlider } = require("../classes/page/class.PageStart");

const { load: category } = require("../classes/page/class.PageKategorie");
const { load: pageShop } = require("../classes/page/class.PageShop");
const { load: pagePresse } = require("../classes/page/class.PagePresse");
const { load: pageHersteller } = require("../classes/page/class.PageHersteller");
const { load: ajaxSchnellsuche } = require("../classes/Ajax/class.AjaxSchnellsuche");
const { fetch: search } = require("./../classes/page/class.SearchPanel");

const { errorHandlerFactory } = require("../middleware/awaitHandlerFactory.middleware");

router.get("/top-products", errorHandlerFactory(makeTopProdukte));
router.get("/categories", errorHandlerFactory(makeKategorien));
router.get("/latest-comparisons", errorHandlerFactory(makeTestreihen));
router.get("/top-sliders", errorHandlerFactory(makeTopSlider));

router.get("/category/:categoryName/:baseID?/:secondaryID?/:page([0-9]+)?", errorHandlerFactory(category));
router.get("/product/:productName/boxSummary", errorHandlerFactory(queryBoxSummary));
router.get("/product/:productName/testsBox", errorHandlerFactory(queryTestsBox));
router.get("/product/:productName/angeboteBox", errorHandlerFactory(queryAngeboteBox));
router.get("/product/:productName/preishistorieBox", errorHandlerFactory(queryPreishistorieBox));
router.get("/product/:productName/meinungenBox/:page([0-9]+)?", errorHandlerFactory(queryMeinungenBox));
router.get("/product/:productName/fragenBox", errorHandlerFactory(queryFragenBox));
router.get("/product/:productName/informationenBox", errorHandlerFactory(queryInformationenBox));
router.get("/product/:productName/topProdukteBox", errorHandlerFactory(queryTopProdukteBox));
router.get("/product/:productName/weitereProdukteBox", errorHandlerFactory(queryWeitereProdukteBox));
router.get("/product/:productName/similarProdukteBox", errorHandlerFactory(querySimilarProdukteBox));
router.get("/product/:productName/filterkombiBox", errorHandlerFactory(queryFilterkombiBox));
router.get("/product/:productName/preisalarmBox", errorHandlerFactory(queryPreisalarmBox));
router.get("/product/:productName/snipptes", errorHandlerFactory(querySnipptes));

router.get("/magazine/:magazineName/filterBox", errorHandlerFactory(queryFilterBox));
router.get("/magazine/:magazineName/testBox/:page([0-9]+)?", errorHandlerFactory(queryTestBox));
router.get("/magazine/:magazineName/testreiheBox/:page([0-9]+)?", errorHandlerFactory(queryTestreiheBox));

router.get("/shop/:shopName/:page([0-9]+)?", errorHandlerFactory(pageShop));
router.get("/presse/:identifier?", errorHandlerFactory(pagePresse));
router.get("/producer/:producerName/:page([0-9]+)?", errorHandlerFactory(pageHersteller));
router.post("/search", errorHandlerFactory(ajaxSchnellsuche));

router.get("/searchPanel", errorHandlerFactory(search));

module.exports = router;
