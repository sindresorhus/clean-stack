import escapeStringRegexp from 'escape-string-regexp';
import {fileURLToPath} from 'url-extras';

const extractPathRegex = /(?<=\s)at.*[\s\(](?<path>.*)/v;
const pathRegex = /^(?:(?:node|node:[\w\/]+|(?:node:)?internal\/[\w\/]+(?<!\/)|.*node_modules\/(?:babel-polyfill|pirates)\/.*\w|\w+)(?:\.js)?:\d+:\d+|native)/v;
const simplePathRegex = /^\w+\.js:\d+:\d+$/v;

export default function cleanStack(stack, {pretty = false, basePath, pathFilter} = {}) {
	if (typeof stack !== 'string') {
		return undefined;
	}

	const basePathRegex = basePath && new RegExp(`(file://)?${escapeStringRegexp(basePath.replaceAll('\\', '/'))}/?`, 'gv');

	let homeDirectory = '';
	if (pretty) {
		const os = process.getBuiltinModule?.('node:os');
		homeDirectory = os ? os.homedir().replaceAll('\\', '/') : '';
	}

	return stack.replaceAll('\\', '/')
		.split('\n')
		.filter(line => {
			const pathMatch = line.match(extractPathRegex);
			if (!pathMatch?.groups?.path) {
				return true; // Keep lines without paths (like error messages)
			}

			const match = pathMatch.groups.path;

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
				line = line.replace(extractPathRegex, (lineMatch, filePath) => {
					let prettifiedFilePath = filePath;

					// Convert file:// URLs to regular paths first
					if (prettifiedFilePath.startsWith('file://')) {
						prettifiedFilePath = fileURLToPath(prettifiedFilePath);
					}

					// Then replace home directory with ~ (only if homeDirectory is not empty)
					if (homeDirectory) {
						prettifiedFilePath = prettifiedFilePath.replace(homeDirectory, '~');
					}

					// Replace literally, so a path containing `$` patterns is not mangled
					return lineMatch.replace(filePath, () => prettifiedFilePath);
				});
			}

			return line;
		})
		.join('\n');
}
