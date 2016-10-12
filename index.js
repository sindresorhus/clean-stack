'use strict';
module.exports = stack => stack.replace(/\\/g, '/').replace(/\s+at.*\((?:(?:internal\/)?\w+\.js:\d+:\d+|native)\)|\s+at.*(?:node|internal\/\w+)\.js:\d+:\d+/g, '');
