/* jslint node: true */
/* global before, afterEach, after, featureFile, scenarios, steps */
"use strict";


/*
    Direccion donde se encuentran los features
 */
var FEATURES_DIR = './test/functional/features',
    Yadda = require('yadda'),
    baseLibrary = require('./steps/base-library'),
    Controller = require('./controllers/controller'),
    webdriver = require('browserstack-webdriver'),
    fs = require('fs'),
    path = require('path'),
    driver,
    files,
    controller;


/**
 * Variable pasada en el user environment para
 * indicar si se quiere ejecutar un feature en particular
 */
var feature = process.env.feature;

Yadda.plugins.mocha.StepLevelPlugin.init();

if (feature === undefined) {
    files = new Yadda.FeatureFileSearch(FEATURES_DIR);
} else {
    files = new Yadda.FileSearch(FEATURES_DIR, feature);
}



/**
 * Se recorren los archivos .features y por cada uno
 * se incluye su archivo de steps
 */
files.each(function(file) {
    featureFile(file, function(feature) {

        before(function(done) {
            executeInFlow(function() {
                var capabilities = {
                    'browserstack.local': 'true',
                    'browserName': 'firefox',
                    'browserstack.user': 'juanpablo48',
                    'browserstack.key': 'BfBVyjkCGFHSjVcyNs35'
                };

                driver = new webdriver.Builder().
                usingServer('http://hub.browserstack.com/wd/hub').
                withCapabilities(capabilities).
                build();

                driver.manage().timeouts().implicitlyWait(10000);
                driver.manage().window().maximize();
                controller = new Controller(driver);

            }, done);
        });

        var fileName = path.basename(file, '.feature');
        scenarios(feature.scenarios, function(scenario) {
            var library = require('./steps/' + fileName + '-library');
            steps(scenario.steps, function(step, done) {
                executeInFlow(function() {
                    Yadda.createInstance([baseLibrary, library], {
                        driver: driver,
                        controller: controller
                    }).run(step);
                }, done);
            });
        });

        after(function(done) {
            driver.quit().then(done);
        });
    });
});

function executeInFlow(fn, done) {
    webdriver.promise.controlFlow().execute(fn).then(function() {
        done();
    }, done);
}
