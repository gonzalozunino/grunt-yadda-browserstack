/* jslint node: true */
"use strict";

var library = require("yadda").localisation.English.library();

//Scenario 1
library.when("I search for $money", function(searchKey) {
    this.controller.sendValuesToElement(searchKey);
    this.controller.triggerClick('#sblsbb .lsb');
});

library.then("About 2,640,000,000 results gets displayed", function() {
    this.controller.checkMessage('#resultStats', 'Cerca de 2,660,000,000 resultados (0.31 segundos) ');
});

module.exports = library;
