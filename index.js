'use strict';

const extractPathRegex = /\s+at.*(?:\(|\s)(.*)\)?/;
const pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/babel-polyfill\/.*)?\w+)\.js:\d+:\d+)|native)/;

module.exports = stack => {
	return stack.replace(/\\/g, '/')
		.split('\n')
		.filter(x => {
			const pathMatches = x.match(extractPathRegex);
			if (pathMatches === null || !pathMatches[1]) {
				return true;
			}

			const match = pathMatches[1];

			// Electron
			if (match.includes('.app/Contents/Resources/electron.asar') ||
				match.includes('.app/Contents/Resources/default_app.asar')) {
				return false;
			}

			return !pathRegex.test(match);
		})
		.filter(x => x.trim() !== '')
		.join('\n');
};
