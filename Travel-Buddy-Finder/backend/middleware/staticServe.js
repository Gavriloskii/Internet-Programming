const express = require('express');
const path = require('path');

function createStaticMiddleware(directory) {
    return function staticMiddleware(req, res, next) {
        const middleware = express.static(directory);
        middleware(req, res, next);
    };
}

module.exports = createStaticMiddleware;
