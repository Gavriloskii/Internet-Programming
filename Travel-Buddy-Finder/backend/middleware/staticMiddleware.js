const express = require('express');
const path = require('path');

const staticFileMiddleware = (directory) => {
    return express.static(path.resolve(directory));
};

module.exports = staticFileMiddleware;
