var webdriver = require('browserstack-webdriver');
var By = webdriver.By;
var _ = require("underscore");
var chai = require('chai');
var expect = chai.expect;

function Controller(driver) {
    this.driver = driver;
}

_.extend(Controller.prototype, {

    goToPage: function() {
        this.driver.get("http://www.google.com.ar");
    },
    
    sendValuesToElement: function(searchKey) {
        this.driver.findElement(By.id("lst-ib")).sendKeys(searchKey);
    },

    triggerClick: function(selector) {
        this.driver.findElement(By.css(selector)).click();
    },

    checkMessage: function(selector, message) {
        this.driver.findElement(By.css(selector)).getText().then(function(text) {
            expect(message).to.equal(text);
        });
    },

    checkMessages: function(selector, messages) {
        messages = messages.split("/");
        var driver = this.driver;
        _.each(messages, function(message, index) {
            driver.findElement(By.css(selector)).getText().then(function(text) {
                expect(text).to.include(message);
            });
        });
    },

    checkElement: function(selector) {
        this.driver.findElement(By.css(selector)).then(function(element) {
            expect(element).to.exist();
        });
    },

    waitforElementExist: function(selector, milisec) {
        var driver = this.driver;
        driver.wait(function() {
            return driver.isElementPresent(By.css(selector));
        }, milisec);
    }

});

module.exports = Controller;
