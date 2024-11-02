"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = capitalize;
exports.reverse = reverse;
function capitalize(input) {
    return input.charAt(0).toUpperCase() + input.slice(1);
}
function reverse(input) {
    return input.split('').reverse().join('');
}
