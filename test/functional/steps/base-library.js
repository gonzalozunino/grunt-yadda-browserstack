/* jslint node: true */
"use strict";

var library = require("yadda").localisation.English.library();

library.given("[Tt]hat I open Google's search page", function() {
    this.controller.goToPage();
});

module.exports = library;
