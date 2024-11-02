"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _8_1_1 = require("./8.1");
var _8_2_1 = require("./8.2");
var _8_3_1 = require("./8.3");
var sum = (0, _8_1_1.add)(5, 10);
var product = (0, _8_1_1.multiply)(5, 10);
console.log("Sum: ".concat(sum, ", Product: ").concat(product));
var capitalized = (0, _8_2_1.capitalize)('hello world');
var reversed = (0, _8_2_1.reverse)('hello');
console.log("Capitalized: ".concat(capitalized, ", Reversed: ").concat(reversed));
var rectangle = new _8_3_1.Rectangle(10, 5);
var circle = new _8_3_1.Circle(7);
var shapes = [rectangle, circle];
shapes.forEach(function (shape) {
    console.log("Area: ".concat(shape.area()));
});
