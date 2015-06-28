/* jslint node: true */
"use strict";

var library = require("yadda").localisation.English.library();

//Scenario 1
library.when("I search for for money", function() {
    this.controller.checkElement('.header-logo.lan-tam');
});

library.then("About 2,640,000,000 results gets displayed", function() {
    this.controller.checkElement('.header-logo.lan-tam');
});

module.exports = library;
