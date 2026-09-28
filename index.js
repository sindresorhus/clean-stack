import escapeStringRegexp from 'escape-string-regexp';
import {fileURLToPath} from 'url-extras';

// A frame is indented, so a line that starts with `at` in the first column is text.
const frameStartRegex = /^\s+at\b/v;
// A `node:` module name is not limited to word characters, as names such as
// `node:internal/fs/cp/cp-sync` and `node:internal/tls/secure-context` contain a dash. A
// bare `internal/` path keeps its old shape, so that a project of its own keeps at
// least the frames whose name holds a dash.
const pathRegex = /^(?:(?:node|node:[\w\-\/]+|internal\/[\w\/]+(?<!\/)|\w+)(?:\.js)?:\d+:\d+|native$)/v;
// The only prefixes V8 puts on a frame that has no function name.
const asyncPrefixRegex = /^(?:async|new) /v;
// A bare frame has no parentheses to end it, so it is recognised by the location it ends
// in: `:line:column` for a file, as in `at /a/b.js:1:2`, or `:0x…` for the offset of a
// WebAssembly function. The colon is part of that, so `/a/0xdeadbeef` is text, and it
// keeps the scan to the colons of the line.
const bareFrameEndRegex = /:(?:\d+:\d+|0x[\da-f]+)$/v;
const simplePathRegex = /^\w+\.js:\d+:\d+$/v;

// A stack frame is `at <function name> (<path>)`, or just `at <path>` when there is no
// function name. A line has to start with `at` for either form, so an error message that
// merely holds ` at ` is never mistaken for a frame, which is what `frameStartRegex` is
// for. A frame also has to end the way a frame ends, so that an indented line of a
// multi-line error message, such as `    at least one plugin is broken`, is text and can
// never be handed to `pathFilter`.
//
// The path is found by index and not by a regex, as a path can hold both a space and a
// parenthesis, as in `C:/Program Files (x86)/app.js:1:1`, which a regex has to
// backtrack over. `pathIndex` is where the path starts in the line, and
// `hasFunctionName` tells a bare simple relative path, which may be the user's own, from
// the same name inside `at fn (…)`, which is an old internal Node.js frame.
function getFrame(line) {
	const frameStart = frameStartRegex.exec(line);
	if (!frameStart) {
		return undefined;
	}

	// Trailing whitespace is part of neither form of the path, and a CRLF line keeps
	// its `\r`.
	const end = line.trimEnd().length;

	// `at fn (/a/b.js:1:2)` — the path is what sits inside the parenthesis the frame ends
	// with. A function name can hold a balanced parenthesis of its own, as V8 prints a
	// computed key verbatim, and a path can hold one too, as in
	// `C:/Program Files (x86)/app.js:1:1` or `paren)dir/app.js`, so the one to take is the
	// last that is not inside another.
	if (line[end - 1] === ')') {
		let depth = 0;
		let pathStart = -1;
		for (let index = frameStart[0].length; index < end; index++) {
			const character = line[index];
			if (character === '(') {
				if (depth === 0) {
					pathStart = index + 1;
				}

				depth++;
			} else if (character === ')' && depth > 0) {
				depth--;
			}
		}

		if (pathStart !== -1) {
			const path = line.slice(pathStart, end - 1);
			return path === '' ? undefined : {path, pathIndex: pathStart, hasFunctionName: true};
		}
	}

	// `at /a/b.js:1:2`, and the `async` or `new` form of it. Everything after `at` is
	// the path, so that a path holding a space survives. `at native` is the one bare
	// frame without a line and column.
	const rest = line.slice(frameStart[0].length, end).trimStart();
	const path = asyncPrefixRegex.test(rest) ? rest.slice(rest.indexOf(' ') + 1) : rest;
	// The path is the tail of the line, so `pathIndex` holds for the trimmed and the
	// `async`/`new` form too.
	return path === 'native' || bareFrameEndRegex.test(path)
		? {path, pathIndex: end - path.length, hasFunctionName: false}
		: undefined;
}

export default function cleanStack(stack, {pretty = false, basePath, pathFilter} = {}) {
	if (typeof stack !== 'string') {
		return undefined;
	}

	// Windows separators become `/`, and empty segments are dropped so that `/dev`,
	// `//server/dev`, and `/dev/` name the same base path. A base path that started with
	// a slash only ever matches an absolute path, as `dev/a.js` is not below `/dev`.
	const slashedBasePath = basePath?.replaceAll('\\', '/');
	const isAbsoluteBasePath = Boolean(slashedBasePath?.startsWith('/'));
	const isWindowsDrivePath = /^[A-Za-z]:/v.test(slashedBasePath ?? '');
	const normalizedBasePath = slashedBasePath?.split('/').filter(segment => segment !== '').join('/');

	// The base path must be the *whole* leading part of a path, otherwise
	// `/Users/foo/dev` would truncate `/Users/foo/development` into `elopment`. A file
	// URL carries its own leading slash, so `file:///dev` matches as `/dev` does. A
	// Windows drive path is absolute in practice, and a relative base path is not, so
	// only the former may reach behind `file:///`.
	let basePathPrefix = '';
	if (isAbsoluteBasePath) {
		basePathPrefix = '(?:file:///?|/{1,2})';
	} else if (isWindowsDrivePath) {
		basePathPrefix = '(?:file:///)?';
	}

	const basePathBoundary = normalizedBasePath === '' ? '' : '(?:/|$)';
	const basePathRegex = basePath && new RegExp(`^${basePathPrefix}${escapeStringRegexp(normalizedBasePath)}${basePathBoundary}`, 'gv');

	let homeDirectory = '';
	if (pretty) {
		const os = globalThis.process?.getBuiltinModule?.('node:os');
		homeDirectory = os ? os.homedir().replaceAll('\\', '/') : '';
		// `HOME` can end with separators, which the comparison below would double.
		while (homeDirectory.length > 1 && homeDirectory.endsWith('/')) {
			homeDirectory = homeDirectory.slice(0, -1);
		}
	}

	const lines = stack.split('\n').map(rawLine => {
		const frame = getFrame(rawLine);

		// Windows separators become `/`, but only in a stack frame. An error message can
		// hold a path of its own, and that text must survive untouched. The separators
		// do not change the length of the line, so `pathIndex` stays valid.
		return {
			line: frame ? rawLine.replaceAll('\\', '/') : rawLine,
			path: frame?.path.replaceAll('\\', '/'),
			pathIndex: frame?.pathIndex,
			hasFunctionName: frame?.hasFunctionName,
		};
	});

	return lines
		.filter(({path, hasFunctionName}) => {
			if (path === undefined) {
				return true; // Keep lines without paths (like error messages)
			}

			// Filter out Electron internal paths, and internal Node.js paths. A bare simple
			// relative path like `foo.js:1:1` matches the Node.js pattern, so it is
			// exempted from that part only. The user's `pathFilter` still applies to it.
			const isInternalPath = pathRegex.test(path) && (hasFunctionName || !simplePathRegex.test(path));
			if (
				isInternalPath
				|| path.includes('.app/Contents/Resources/electron.asar')
				|| path.includes('.app/Contents/Resources/default_app.asar')
				|| path.includes('node_modules/electron/dist/resources/electron.asar')
				|| path.includes('node_modules/electron/dist/resources/default_app.asar')
				|| path.includes('node_modules/babel-polyfill/')
				|| path.includes('node_modules/pirates/')
			) {
				return false;
			}

			return pathFilter ? pathFilter(path) : true;
		})
		.filter(({line}) => line.trim() !== '')
		.map(({line, path, pathIndex}) => {
			if (path === undefined || (!basePathRegex && !pretty)) {
				return line;
			}

			// `basePath` and `pretty` only ever apply to the path of a stack frame,
			// never to the error message or the function name.
			let newPath = path;

			if (basePathRegex) {
				newPath = newPath.replaceAll(basePathRegex, '');
			}

			if (pretty) {
				// Convert file:// URLs to regular paths first. A stack can hold anything,
				// so a URL we cannot convert is left as-is instead of throwing. `?` and
				// `#` are left alone too, as they truncate the frame at that character,
				// and so is `%0A`/`%0D`, as decoding it splits the frame into two lines.
				if (newPath.startsWith('file://') && !/[#?]|%0[ad]/iv.test(newPath)) {
					try {
						// The path a file URL stands for is native, and so uses `\` on
						// Windows, while the rest of the stack has already become `/`.
						newPath = fileURLToPath(newPath).replaceAll('\\', '/');
					} catch {}
				}

				// Then replace home directory with ~, but only when the path really
				// lives in it, so `/Users/sindresorhus-2` is left alone.
				if (homeDirectory && (newPath === homeDirectory || newPath.startsWith(homeDirectory + '/'))) {
					newPath = '~' + newPath.slice(homeDirectory.length);
				}
			}

			return line.slice(0, pathIndex) + newPath + line.slice(pathIndex + path.length);
		})
		.join('\n');
}
