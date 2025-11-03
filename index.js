import escapeStringRegexp from 'escape-string-regexp';
import {fileURLToPath} from 'url-extras';

const extractPathRegex = /\s+at.*[(\s](.*)\)?/;
const pathRegex = /^(?:(?:(?:node|node:[\w/]+|(?:(?:node:)?internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)(?:\.js)?:\d+:\d+)|native)/;
const simplePathRegex = /^\w+\.js:\d+:\d+$/;

export default function cleanStack(stack, {pretty = false, basePath, pathFilter} = {}) {
	if (typeof stack !== 'string') {
		return undefined;
	}

	const basePathRegex = basePath && new RegExp(`(file://)?${escapeStringRegexp(basePath.replaceAll('\\', '/'))}/?`, 'g');

	let homeDirectory = '';
	if (pretty) {
		const os = process.getBuiltinModule?.('node:os');
		homeDirectory = os ? os.homedir().replaceAll('\\', '/') : '';
	}

	return stack.replaceAll('\\', '/')
		.split('\n')
		.filter(line => {
			const pathMatches = line.match(extractPathRegex);
			if (!pathMatches?.[1]) {
				return true; // Keep lines without paths (like error messages)
			}

			const match = pathMatches[1];

			// Filter out Electron internal paths
			if (
				match.includes('.app/Contents/Resources/electron.asar')
				|| match.includes('.app/Contents/Resources/default_app.asar')
				|| match.includes('node_modules/electron/dist/resources/electron.asar')
				|| match.includes('node_modules/electron/dist/resources/default_app.asar')
			) {
				return false;
			}

			// Keep simple relative paths like 'foo.js:1:1'
			if (simplePathRegex.test(match)) {
				return true;
			}

			// Filter out internal Node.js paths
			if (pathRegex.test(match)) {
				return false;
			}

			// Apply user's path filter if provided
			return pathFilter ? pathFilter(match) : true;
		})
		.filter(line => line.trim() !== '')
		.map(line => {
			if (basePathRegex) {
				line = line.replace(basePathRegex, '');
			}

			if (pretty) {
				line = line.replace(extractPathRegex, (m, p1) => {
					let filePath = p1;

					// Convert file:// URLs to regular paths first
					if (filePath.startsWith('file://')) {
						filePath = fileURLToPath(filePath);
					}

					// Then replace home directory with ~ (only if homeDirectory is not empty)
					if (homeDirectory) {
						filePath = filePath.replace(homeDirectory, '~');
					}

					return m.replace(p1, filePath);
				});
			}

			return line;
		})
		.join('\n');
}
