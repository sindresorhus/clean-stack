import {execFile} from 'node:child_process';
import os from 'node:os';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promisify} from 'node:util';
import cleanStack from './index.js';

const execFileAsync = promisify(execFile);

test('default', () => {
	const pre = `Error: foo
    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)`;
	const stack = `${pre}\n
    at MySocket.emit (node:events:365:28)
    at MySocket.emit (node:fs/promises:363:28)
    at handleMessage (internal/child_process.js:695:10)
    at Pipe.channel.onread (internal/child_process.js:440:11)
    at process.emit (events.js:172:7)`;
	assert.equal(cleanStack(stack), pre);
});

test('default #2', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)`;
	assert.equal(cleanStack(stack), pre);
});

test('directly executed node script', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)
    at node.js:968:3`;
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)`;
	assert.equal(cleanStack(stack), pre);
});

test('internal child_process', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at internal/child_process.js:696:12`;
	assert.equal(cleanStack(stack), pre);
});

test('keeps an `internal/` path whose last segment ends in a slash', () => {
	const line = '    at Object.<anonymous> (internal/a/:1:1)';
	const stack = `Error: foo\n${line}`;
	assert.equal(cleanStack(stack), `Error: foo\n${line}`);
});

test('internal next_tick', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at _combinedTickCallback (internal/process/next_tick.js:67:7)
    at process._tickCallback (internal/process/next_tick.js:98:9)`;
	assert.equal(cleanStack(stack), pre);
});

test('internal various modules', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at emitOne (events.js:101:20)
    at process.emit (events.js:188:7)
    at process._fatalException (bootstrap_node.js:300:26)`;
	assert.equal(cleanStack(stack), pre);
});

test('babel-polyfill', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at run (/Users/sindresorhus/dev/clean-stack/node_modules/babel-polyfill/node_modules/core-js/modules/es6.promise.js:87:22)
    at /Users/sindresorhus/dev/clean-stack/node_modules/babel-polyfill/node_modules/core-js/modules/es6.promise.js:100:28`;
	assert.equal(cleanStack(stack), pre);
});

test('pirates', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)`;
	const stack = `${pre}\n
    at Module._compile (/Users/zavr/dev/clean-stack/node_modules/pirates/lib/index.js:83:24)
    at Object.newLoader [as .js] (/Users/zavr/dev/clean-stack/node_modules/pirates/lib/index.js:88:7)`;
	assert.equal(cleanStack(stack), pre);

	// Pnpm nests the package under a versioned directory.
	assert.equal(cleanStack('Error: foo\n    at f (/a/node_modules/.pnpm/pirates@4.0.7/node_modules/pirates/lib/index.js:83:24)'), 'Error: foo');
});

test('works on Windows', () => {
	const expected = `Error: foo
    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)`;
	const stack = String.raw`Error: foo
    at Test.fn (\Users\sindresorhus\dev\clean-stack\test.js:6:15)
    at handleMessage (internal\child_process.js:695:10)
    at Pipe.channel.onread (internal\child_process.js:440:11)
    at process.emit (events.js:172:7)`;
	assert.equal(cleanStack(stack), expected);
});

test('works with Electron stack traces - dev app', () => {
	const expected = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/fixture-rejection.js:17:16)
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/fixture-rejection.js:19:3)`;

	const stack = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/fixture-rejection.js:17:16)
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/fixture-rejection.js:19:3)
    at Module._compile (module.js:571:32)
    at Object.Module._extensions..js (module.js:580:10)
    at Module.load (module.js:488:32)
    at tryModuleLoad (module.js:447:12)
    at Function.Module._load (module.js:439:3)
    at loadApplicationPackage (/Users/sindresorhus/dev/electron-unhandled/node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar/main.js:283:12)
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar/main.js:325:5)
    at Object.<anonymous> (/Users/sindresorhus/dev/electron-unhandled/node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar/main.js:361:3)`;

	assert.equal(cleanStack(stack), expected);
});

test('works with Electron stack traces - built app', () => {
	const expected = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/app/dist/main/index.js:107:16)
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/app/dist/main/index.js:568:3)`;

	const stack = `Error: foo
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/app/dist/main/index.js:107:16)
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/app/dist/main/index.js:568:3)
    at Module._compile (module.js:571:32)
    at Object.Module._extensions..js (module.js:580:10)
    at Module.load (module.js:488:32)
    at tryModuleLoad (module.js:447:12)
    at Function.Module._load (module.js:439:3)
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/electron.asar/browser/init.js:171:8)
    at Object.<anonymous> (/Users/sindresorhus/dev/forks/kap/dist/mac/Kap.app/Contents/Resources/electron.asar/browser/init.js:173:3)
    at Module._compile (module.js:571:32)`;

	assert.equal(cleanStack(stack), expected);
});

test('`pretty` option', () => {
	const stack = `Error: foo
    at Test.fn (${os.homedir()}/dev/clean-stack/test.js:6:15)
    at handleMessage (internal/child_process.js:695:10)
    at Pipe.channel.onread (internal/child_process.js:440:11)
    at process.emit (events.js:172:7)`;
	const expected = `Error: foo
    at Test.fn (~/dev/clean-stack/test.js:6:15)`;
	assert.equal(cleanStack(stack, {pretty: true}), expected);
});

test('`basePath` option', () => {
	const basePath = '/Users/foo/dev/';
	const stack = `Error: with basePath
    at Object.<anonymous> (/Users/foo/dev/node_modules/foo/bar.js:1:14)
    at /Users/foo/dev/node_modules/foo/baz.js:1:14
    at Module._compile (internal/modules/cjs/loader.js:1200:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1220:10)
    at Module.load (internal/modules/cjs/loader.js:1049:32)
    at Function.Module._load (internal/modules/cjs/loader.js:937:14)
    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)
    at internal/main/run_main_module.js:17:47`;

	const expected = `Error: with basePath
    at Object.<anonymous> (node_modules/foo/bar.js:1:14)
    at node_modules/foo/baz.js:1:14`;
	assert.equal(cleanStack(stack, {basePath}), expected);
	assert.equal(cleanStack(cleanStack(stack, {basePath})), expected);
	assert.equal(cleanStack(cleanStack(stack, {basePath}), {basePath}), expected);
});

const precedenceStack = `Error: with basePath
    at Object.<anonymous> (${os.homedir()}/dev/node_modules/foo/bar.js:1:14)
    at Module._compile (internal/modules/cjs/loader.js:1200:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1220:10)
    at Module.load (internal/modules/cjs/loader.js:1049:32)
    at Function.Module._load (internal/modules/cjs/loader.js:937:14)
    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:71:12)
    at internal/main/run_main_module.js:17:47`;

const precedenceExpected = `Error: with basePath
    at Object.<anonymous> (node_modules/foo/bar.js:1:14)`;

test('`basePath` option should have precedence over `pretty` option', () => {
	const basePath = `${os.homedir()}/dev/`;
	assert.equal(cleanStack(precedenceStack, {basePath, pretty: true}), precedenceExpected);
});

test('`basePath` option should ignore trailing slash', () => {
	const basePath = `${os.homedir()}/dev`;
	assert.equal(cleanStack(precedenceStack, {basePath, pretty: true}), precedenceExpected);
});

test('`basePath` option should support file URLs', () => {
	const basePath = '/dev';
	const stack = `Error
    at file:///dev/node_modules/foo/bar.js:1:14
    at ModuleJob.run (node:internal/modules/esm/module_job:193:25)
    at async Promise.all (index 0)
    at async ESMLoader.import (node:internal/modules/esm/loader:527:24)
    at async loadESM (node:internal/process/esm_loader:91:5)
    at async handleMainPromise (node:internal/modules/run_main:65:12)`;

	const expected = `Error
    at node_modules/foo/bar.js:1:14
    at async Promise.all (index 0)`;
	assert.equal(cleanStack(stack, {basePath, pretty: true}), expected);
});

test('`basePath` option only strips a whole leading path segment', () => {
	// A path that only shares the name of the base path, or a relative path, is not
	// below it.
	const stack = `Error: foo
    at A (/Users/foo/development/bar.js:1:14)
    at B (/home/x/dev/baz.js:1:14)
    at C (/Users/foo/dev.js:1:14)
    at D (/Users/foo/dev/qux.js:1:14)
    at E (dev/quux.js:1:14)`;

	const expected = `Error: foo
    at A (/Users/foo/development/bar.js:1:14)
    at B (/home/x/dev/baz.js:1:14)
    at C (/Users/foo/dev.js:1:14)
    at D (qux.js:1:14)
    at E (dev/quux.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath: '/Users/foo/dev'}), expected);
	assert.equal(cleanStack('Error: foo\n    at dev/a.js:1:7', {basePath: '/dev'}), 'Error: foo\n    at dev/a.js:1:7');
});

test('`basePath` option supports a relative base path', () => {
	const stack = `Error: foo
    at A (./a.b.js:1:14)`;
	assert.equal(cleanStack(stack, {basePath: '.'}), `Error: foo
    at A (a.b.js:1:14)`);
});

test('`basePath` option does not touch text outside of the path', () => {
	// The second line of the message starts with `at` and holds the base path, but it is
	// text and not a frame.
	const stack = `Error: cannot load /Users/foo/dev/x from /Users/foo/dev
    at /Users/foo/dev/internal/loader.js:1:14 the plugin was not found
    at Object.<anonymous> (/Users/foo/dev/x.js:1:14)`;

	const expected = `Error: cannot load /Users/foo/dev/x from /Users/foo/dev
    at /Users/foo/dev/internal/loader.js:1:14 the plugin was not found
    at Object.<anonymous> (x.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath: '/Users/foo/dev'}), expected);
});

test('`pretty` option only shortens paths that live in the home directory', () => {
	const stack = `Error: foo
    at A (${os.homedir()}-2/dev/a.js:1:1)
    at B (/other/${os.homedir()}/dev/a.js:1:1)
    at C (${os.homedir()}/dev/a.js:1:1)`;

	const expected = `Error: foo
    at A (${os.homedir()}-2/dev/a.js:1:1)
    at B (/other/${os.homedir()}/dev/a.js:1:1)
    at C (~/dev/a.js:1:1)`;

	assert.equal(cleanStack(stack, {pretty: true}), expected);
});

test('`pretty` option does not throw on a file URL that cannot become a path', () => {
	const stack = `Error: foo
    at A (file:///%/a.js:1:1)
    at B (file://host/a.js:1:1)
    at C (file:///a%2Fb.js:1:1)
    at D (file:///a.js:1:1)`;

	const expected = `Error: foo
    at A (file:///%/a.js:1:1)
    at B (file://host/a.js:1:1)
    at C (file:///a%2Fb.js:1:1)
    at D (/a.js:1:1)`;

	assert.equal(cleanStack(stack, {pretty: true}), expected);
});

test('`pretty` option decodes a file URL and keeps the rest of the frame', () => {
	// The decoded path is shorter than the URL, so the frame is rebuilt around it.
	const stack = 'Error: foo\r\n    at f (file:///a/b%20c.js:1:1)\r\n';
	assert.equal(cleanStack(stack, {pretty: true}), 'Error: foo\r\n    at f (/a/b c.js:1:1)\r');
});

test('works on Windows line endings', () => {
	const stack = 'Error: foo\r\n    at Test.fn (/base/test.js:6:15)\r\n    at internal/child_process.js:695:10\r\n    at process.emit (events.js:172:7)\r\n';
	assert.equal(cleanStack(stack), 'Error: foo\r\n    at Test.fn (/base/test.js:6:15)\r');
});

test('`pathFilter` option is applied on Windows line endings', () => {
	// eslint-disable-next-line unicorn/consistent-boolean-name -- `pathFilter` is the name of the public option, not a boolean name
	const pathFilter = path => !/omitme/v.test(path);

	const stack = 'Error: foo\r\n    at A (/base/omitme.js:1:1)\r\n    at B (/base/keep.js:3:3)\r\n';
	assert.equal(cleanStack(stack, {pathFilter}), 'Error: foo\r\n    at B (/base/keep.js:3:3)\r');
});

test('`pathFilter` option is not applied to the error message', () => {
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	const stack = `Error: could not find module at /some/where.js:1:1
    at /base/internal/loader.js:1:1 the plugin was not found
    at A (/base/a.js:1:1)`;

	assert.equal(cleanStack(stack, {pathFilter}), stack);
	assert.deepEqual(paths, ['/base/a.js:1:1']);
});

test('`pathFilter` option cannot remove the error message', () => {
	const stack = `Error: could not find module at /some/where.js:1:1
    at least one plugin is broken
    at A (/base/a.js:1:1)`;

	assert.equal(cleanStack(stack, {pathFilter: () => false}), `Error: could not find module at /some/where.js:1:1
    at least one plugin is broken`);
});

test('a line that is not indented is not a stack frame', () => {
	// V8 indents every frame, so `at` in the first column is part of a message, even
	// when the rest of the line looks like a frame.
	const stack = `Error: cannot start
at least one plugin is broken
at /a/x.js:1:1
    at A (/a.js:1:1)`;

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return false;
	};

	assert.equal(cleanStack(stack, {pathFilter}), `Error: cannot start
at least one plugin is broken
at /a/x.js:1:1`);
	assert.deepEqual(paths, ['/a.js:1:1']);
});

test('hands `pathFilter` a WebAssembly frame, which ends in a hex offset', () => {
	const stack = `Error: boom
    at wasm://wasm/a65f1d02:wasm-function[1]:0x2c`;

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return false;
	};

	assert.equal(cleanStack(stack, {pathFilter}), 'Error: boom');
	assert.deepEqual(paths, ['wasm://wasm/a65f1d02:wasm-function[1]:0x2c']);
});

test('rewrites the path of a frame and not a copy of it in the function name', () => {
	const stack = `Error: foo
    at x(/a/b.js:1:1) (/a/b.js:1:1)`;

	assert.equal(cleanStack(stack, {basePath: '/a'}), `Error: foo
    at x(/a/b.js:1:1) (b.js:1:1)`);
});

test('reads a frame that is indented with a tab', () => {
	const stack = 'Error: foo\n\tat f (/a/b.js:1:1)\n\tat internal/x.js:1:1';

	assert.equal(cleanStack(stack), 'Error: foo\n\tat f (/a/b.js:1:1)');
});

test('an indented line that does not start with the word `at` is not a stack frame', () => {
	// `attack` begins with `at`, but is not the keyword, so `a.js:1:1` is never read as a
	// path and never reaches `pathFilter`.
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return false;
	};

	assert.equal(cleanStack('Error: foo\n    attack (a.js:1:1)', {pathFilter}), 'Error: foo\n    attack (a.js:1:1)');
	assert.deepEqual(paths, []);
});

test('a frame with no closing parenthesis keeps its whole tail as the path', () => {
	// The ` (` only starts the path when the line also ends in `)`, so a truncated line
	// is read as one bare frame, with the function name as part of its path.
	const stack = `Error: foo
    at f (/a/b.js:1:1
    at f (internal/x.js:1:1`;

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack(stack, {pathFilter}), stack);
	assert.deepEqual(paths, ['f (/a/b.js:1:1', 'f (internal/x.js:1:1']);
	assert.equal(cleanStack(stack, {basePath: '/a'}), stack);
});

test('internal modules with a dash in the name', () => {
	const pre = `Error: foo
    at Object.filter (/base/app.js:7:95)`;
	const stack = `${pre}
    at cpSyncFn (node:internal/fs/cp/cp-sync:49:29)
    at configSecureContext (node:internal/tls/secure-context:171:11)
    at endOfStream (node:internal/streams/end-of-stream:12:9)
    at ModuleJob.run (node:internal/modules/esm/module_job:569:25)`;
	assert.equal(cleanStack(stack), pre);
});

test('drops a `native` frame but not a path that starts with it', () => {
	// `native` is a frame only when it is the whole path, which is how V8 prints a frame
	// that has neither a function name nor a path.
	const stack = `Error: foo
    at Array.forEach (native)
    at native
    at nativesound`;
	assert.equal(cleanStack(stack), `Error: foo
    at nativesound`);
});

test('cleans a frame line that is very long', () => {
	// The path is looked up by index, so the parentheses in it cost nothing to find. A
	// regex that backtracks over every `(` takes seconds on this input, while the scan
	// takes well under a millisecond, so a plain bound is safe on any machine.
	const path = `/a${'( '.repeat(40_000)}/b.js:1:1`;
	const stack = `Error: foo\n    at fn (${path})`;

	const start = process.hrtime.bigint();
	const cleaned = cleanStack(stack);
	const elapsed = Number(process.hrtime.bigint() - start) / 1e6;

	assert.equal(cleaned, stack);
	assert.ok(elapsed < 100, `${elapsed} ms`);
	assert.equal(cleanStack(stack, {basePath: '/'}), `Error: foo\n    at fn (${path.slice(1)})`);
});

test('`basePath` option does not strip from the middle of a path', () => {
	// A space in the path must not be mistaken for the start of the path.
	const stack = `Error: foo
    at A (/Users/me/My src/index.js:1:14)
    at B (src/index.js:1:14)`;

	const expected = `Error: foo
    at A (/Users/me/My src/index.js:1:14)
    at B (index.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath: 'src'}), expected);
});

test('`basePath` option supports a Windows file URL', () => {
	const stack = `Error: foo
    at A (file:///C:/Users/me/dev/a.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath: 'C:/Users/me/dev'}), `Error: foo
    at A (a.js:1:14)`);
});

test('`basePath` option supports a Windows path', () => {
	const stack = String.raw`Error: foo
    at A (C:\Users\me\dev\a.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath: String.raw`C:\Users\me\dev`}), `Error: foo
    at A (a.js:1:14)`);
});

test('`pretty` option does not truncate a file URL at `?` or `#`', () => {
	const stack = `Error: foo
    at A (file:///Users/me/x.js?v=1:1:14)
    at B (file:///Users/me/C#proj/x.js:1:14)`;

	assert.equal(cleanStack(stack, {pretty: true}), stack);
});

test('`pretty` option does not split a frame on a decoded line break', () => {
	// The decoded line break would smuggle a frame in past the internal filter.
	const stack = 'Error: foo\n    at A (file:///m/a.js%0A%20%20%20at%20internal/evil.js:1:1:14)';
	assert.equal(cleanStack(stack, {pretty: true}), stack);

	const lowercaseStack = 'Error: foo\n    at B (file:///m/a.js%0d%0a:1:1:14)';
	assert.equal(cleanStack(lowercaseStack, {pretty: true}), lowercaseStack);
});

test('does not change backslashes outside of a stack frame', () => {
	const stack = String.raw`Error: ENOENT: no such file or directory, open 'C:\Users\me\x.txt'
    at Object.openSync (node:fs:596:17)
    at C:\Users\me\x.txt is missing
    at f (C:\Users\me\a.js:1:1)`;

	const expected = String.raw`Error: ENOENT: no such file or directory, open 'C:\Users\me\x.txt'
    at C:\Users\me\x.txt is missing
    at f (C:/Users/me/a.js:1:1)`;

	assert.equal(cleanStack(stack), expected);
});

test('works with Electron stack traces - Linux app', () => {
	const pre = `Error: foo
    at Object.<anonymous> (/app/src/main.js:17:16)`;
	const stack = `${pre}
    at Object.<anonymous> (/app/node_modules/electron/dist/resources/electron.asar/lib/browser/init.js:171:8)
    at Object.<anonymous> (/app/node_modules/electron/dist/resources/default_app.asar/main.js:283:12)`;
	assert.equal(cleanStack(stack), pre);
});

test('keeps an Electron app frame that is the app itself', () => {
	const stack = `Error: foo
    at Object.<anonymous> (/Applications/Foo.app/Contents/Resources/app.asar/main.js:1:1)`;
	assert.equal(cleanStack(stack), stack);
});

test('`pretty` option applies to a file URL that `basePath` did not match', () => {
	const stack = `Error: foo
    at f (file://${os.homedir()}/dev/a.js:1:1)`;

	assert.equal(cleanStack(stack, {basePath: '/elsewhere', pretty: true}), `Error: foo
    at f (~/dev/a.js:1:1)`);
});

test('`basePath` option supports a trailing slash together with a file URL', () => {
	const stack = `Error: foo
    at f (file:///dev/a.js:1:1)`;

	assert.equal(cleanStack(stack, {basePath: '/dev/'}), `Error: foo
    at f (a.js:1:1)`);
});

test('`pretty` option works on Windows line endings', () => {
	const stack = `Error: foo\r\n    at f (${os.homedir()}/dev/a.js:1:1)\r\n    at internal/x.js:1:1\r\n`;
	assert.equal(cleanStack(stack, {pretty: true}), 'Error: foo\r\n    at f (~/dev/a.js:1:1)\r');
});

test('handles a stack that is only an error message', () => {
	assert.equal(cleanStack('Error: foo'), 'Error: foo');
	assert.equal(cleanStack('Error: foo\n'), 'Error: foo');
	assert.equal(cleanStack(''), '');
	assert.equal(cleanStack('  \n\t\n'), '');
});

test('is idempotent', () => {
	const stack = `Error: foo
    at A (/Users/foo/dev/src/a.js:1:14)
    at async Promise.all (index 0)
    at Module._compile (node:internal/modules/cjs/loader:1200:30)`;

	const pretty = {pretty: true};
	const basePath = {basePath: '/Users/foo/dev'};
	const both = {pretty: true, basePath: '/Users/foo/dev'};

	assert.equal(cleanStack(cleanStack(stack, pretty), pretty), cleanStack(stack, pretty));
	assert.equal(cleanStack(cleanStack(stack, basePath), basePath), cleanStack(stack, basePath));
	assert.equal(cleanStack(cleanStack(stack, both), both), cleanStack(stack, both));

	// A cleaned file URL is a plain path, which the second pass leaves alone.
	const fileUrlStack = 'Error: foo\n    at f (file:///a/b.js:1:1)';
	assert.equal(cleanStack(cleanStack(fileUrlStack, pretty), pretty), cleanStack(fileUrlStack, pretty));
});

test('drops a frame whose path is a bare relative name', () => {
	// `at fn (a.js:1:14)` has the same shape as an old internal Node.js frame, so it is
	// filtered too. The bare form has no parenthesis to tell the two apart, and is kept.
	// The readme says so.
	assert.equal(cleanStack('Error: foo\n    at fn (a.js:1:14)'), 'Error: foo');
	assert.equal(cleanStack('Error: foo\n    at a.js:1:14'), 'Error: foo\n    at a.js:1:14');

	// Which is how a `basePath` can leave a stack that no longer survives a second pass.
	const options = {basePath: '/Users/foo/dev'};
	const once = cleanStack('Error: foo\n    at fn (/Users/foo/dev/a.js:1:14)', options);
	assert.equal(once, 'Error: foo\n    at fn (a.js:1:14)');
	assert.equal(cleanStack(once, options), 'Error: foo');
});

test('`basePath` option treats a base path with regex characters literally', () => {
	// `escape-string-regexp` has to keep `a.b(c)` from matching `aXbc`.
	const stack = `Error: foo
    at fn (/a.b(c)/d.js:1:14)
    at fn (/aXbc/e.js:2:24)`;

	assert.equal(cleanStack(stack, {basePath: '/a.b(c)'}), `Error: foo
    at fn (d.js:1:14)
    at fn (/aXbc/e.js:2:24)`);

	// A base path that looks like a catastrophic pattern is still a literal.
	assert.equal(cleanStack('Error: foo\n    at fn (/a/(a+)+$/c.js:1:1)', {basePath: '/a/(a+)+$'}), 'Error: foo\n    at fn (c.js:1:1)');
});

test('`basePath` option matches a file URL before it is decoded', () => {
	// The base path is matched before a file URL is decoded, so it never matches an
	// encoded part of one. The readme says so.
	assert.equal(cleanStack('Error: foo\n    at f (file:///Users/John%20Doe/dev/a.js:1:1)', {basePath: '/Users/John Doe/dev'}), 'Error: foo\n    at f (file:///Users/John%20Doe/dev/a.js:1:1)');
	assert.equal(cleanStack('Error: foo\n    at f (file:///Users/John/dev/My%20Project/a.js:1:1)', {basePath: '/Users/John/dev'}), 'Error: foo\n    at f (My%20Project/a.js:1:1)');

	// `pretty` cannot decode what `basePath` already reduced to a plain path.
	assert.equal(cleanStack('Error: foo\n    at f (file:///Users/John/dev/My%20Project/a.js:1:1)', {basePath: '/Users/John/dev', pretty: true}), 'Error: foo\n    at f (My%20Project/a.js:1:1)');
});

test('`basePath` option does not match a relative base path behind `file://`', () => {
	// `file:///dev/a.js` is the absolute path `/dev/a.js`, which a relative base path
	// does not name.
	const urlStack = 'Error: foo\n    at f (file:///dev/a.js:1:1)';
	assert.equal(cleanStack(urlStack, {basePath: 'dev'}), urlStack);
	assert.equal(cleanStack('Error: foo\n    at f (dev/a.js:1:1)', {basePath: 'dev'}), 'Error: foo\n    at f (a.js:1:1)');
});

test('`pathFilter` option receives the path of every kind of frame', () => {
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	const stack = `Error: foo
    at A (/base/a.js:1:1)
    at /base/b.js:2:2
    at async /base/e.js:5:5
    at new /base/f.js:6:6
    at new Promise (<anonymous>)
    at async Promise.all (index 0)
    at Object.x [as y] (/base/c.js:3:3)
    at fn (/my dir/y.js:1:1)
    at fn (file:///base/d.js:4:4)`;

	cleanStack(stack, {pathFilter});

	// `pathFilter` runs before `pretty`, so the file URL is still a URL here.
	assert.deepEqual(paths, ['/base/a.js:1:1', '/base/b.js:2:2', '/base/e.js:5:5', '/base/f.js:6:6', '<anonymous>', 'index 0', '/base/c.js:3:3', '/my dir/y.js:1:1', 'file:///base/d.js:4:4']);
});

// `Program Files (x86)` is a real install path. A regex that took the path up to the last
// space, or up to the first parenthesis, would cut it short.
const parenthesisStack = String.raw`Error: foo
    at f (C:\Program Files (x86)\App\a.js:1:1)`;

test('keeps a path that contains a parenthesis', () => {
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack(parenthesisStack, {pathFilter}), `Error: foo
    at f (C:/Program Files (x86)/App/a.js:1:1)`);
	assert.deepEqual(paths, ['C:/Program Files (x86)/App/a.js:1:1']);
});

test('finds the path past a parenthesis in the function name', () => {
	// V8 prints a computed key verbatim, so a function name can hold a parenthesis of its
	// own. The one that opens the frame is the last that is not inside another.
	const stack = 'Error: render boom\n    at render (partial) (/base/a.js:6:9)';

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack(stack, {pathFilter, basePath: '/base'}), 'Error: render boom\n    at render (partial) (a.js:6:9)');
	assert.deepEqual(paths, ['/base/a.js:6:9']);
	assert.equal(cleanStack('Error: x\n    at get (weird) name (node:internal/modules/cjs/loader:1200:30)'), 'Error: x');
});

test('finds the path when the path itself holds a parenthesis', () => {
	// `paren)dir` closes the parenthesis the frame opens, so the depth cannot be the
	// whole story.
	const stack = `Error: boom
    at boom (/base/paren)dir/app.js:2:8)`;

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack(stack, {pathFilter, basePath: '/base'}), `Error: boom
    at boom (paren)dir/app.js:2:8)`);
	assert.deepEqual(paths, ['/base/paren)dir/app.js:2:8']);
});

test('reads an unbalanced parenthesis in the function name as part of the path', () => {
	// The docs say so: nothing on the line tells where the name ends.
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	const stack = 'Error: foo\n    at a(b (/base/a.js:6:9)';
	assert.equal(cleanStack(stack, {pathFilter, basePath: '/base'}), stack);
	assert.deepEqual(paths, ['b (/base/a.js:6:9']);
});

test('only a bare frame ending in a location is a frame', () => {
	// `0xdeadbeef` with no colon before it is not a location.
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack('Error: x\n    at /a/0xdeadbeef', {pathFilter}), 'Error: x\n    at /a/0xdeadbeef');
	assert.deepEqual(paths, []);

	// A path whose first segment begins with `async` is not the `async` prefix, which
	// only counts when a space follows it.
	paths.length = 0;
	assert.equal(cleanStack('Error: x\n    at asynced internal/x.js:1:1', {pathFilter}), 'Error: x\n    at asynced internal/x.js:1:1');
	assert.deepEqual(paths, ['asynced internal/x.js:1:1']);
});

test('`basePath` option supports a path that contains a parenthesis', () => {
	assert.equal(cleanStack(parenthesisStack, {basePath: String.raw`C:\Program Files (x86)\App`}), `Error: foo
    at f (a.js:1:1)`);
});

test('`basePath` option supports a UNC path and its file URL', () => {
	const basePath = String.raw`\\server\share\dev`;
	const stack = String.raw`Error: foo
    at A (\\server\share\dev\a.js:1:14)
    at B (//server/share/dev/b.js:1:14)
    at C (file://server/share/dev/c.js:1:14)
    at D (/other/dev/d.js:1:14)`;

	const expected = `Error: foo
    at A (a.js:1:14)
    at B (b.js:1:14)
    at C (c.js:1:14)
    at D (/other/dev/d.js:1:14)`;

	assert.equal(cleanStack(stack, {basePath}), expected);
});

test('`basePath` option ignores repeated separators', () => {
	const stack = `Error: foo
    at A (/dev/a.js:1:1)
    at B (/devb/b.js:2:2)`;

	assert.equal(cleanStack(stack, {basePath: '//dev//'}), `Error: foo
    at A (a.js:1:1)
    at B (/devb/b.js:2:2)`);
});

test('`pretty` option works without `process`', () => {
	// The package also runs in the browser, where there is no `process` binding at all,
	// rather than one that is set to `undefined`.
	const {process} = globalThis;
	delete globalThis.process;

	try {
		assert.equal('process' in globalThis, false);
		assert.equal(cleanStack('Error: foo\n    at f (file:///base/a.js:1:1)', {pretty: true}), 'Error: foo\n    at f (/base/a.js:1:1)');
	} finally {
		// eslint-disable-next-line unicorn/no-global-object-property-assignment -- restore what the test removed
		globalThis.process = process;
	}
});

test('`pretty` option uses `/` for a file URL on Windows', async () => {
	// A file URL becomes a native path, which uses `\` on Windows, so the separator has
	// to be put back or the home directory below it goes unrecognised. The platform is
	// read when `url-extras` is first loaded, so this needs a process of its own.
	const indexUrl = new URL('index.js', import.meta.url).href;
	const source = String.raw`
		Object.defineProperty(process, 'platform', {value: 'win32'});
		const {default: cleanStack} = await import(${JSON.stringify(indexUrl)});
		const {homedir} = await import('node:os');
		const stack = 'Error: x\n'
			+ '    at a (file:///C:/Users/me/a.js:1:1)\n'
			+ '    at b (file://' + homedir() + '/dev/b.js:2:2)';
		process.stdout.write(cleanStack(stack, {pretty: true}));
	`;

	const {stdout} = await execFileAsync(process.execPath, ['--input-type=module', '--eval', source]);

	assert.equal(stdout, `Error: x
    at a (C:/Users/me/a.js:1:1)
    at b (~/dev/b.js:2:2)`);
});

test('`pathFilter` option is not applied to a line that has no path', () => {
	// A line that is only `at`, and a frame whose parentheses are empty, have no path to
	// hand over, so they are text.
	assert.equal(cleanStack('Error: foo\n    at', {pathFilter: () => false}), 'Error: foo\n    at');
	assert.equal(cleanStack('Error: foo\n    at f ()', {pathFilter: () => false}), 'Error: foo\n    at f ()');
});

test('filters a `node:` prefixed internal frame in every shape', () => {
	// The prefix sits on a bare frame, on a bare frame behind an `async`, or behind a
	// function name.
	const pre = `Error: foo
    at A (/base/app.js:1:1)`;
	const stack = `${pre}
    at Object.openSync (node:fs:596:17)
    at load (node:internal/modules/cjs/loader:1105:21)
    at node:internal/main/run_main_module:17:47
    at async node:internal/modules/esm/loader:650:26`;
	assert.equal(cleanStack(stack), pre);
});

test('`pathFilter` option runs before `basePath` and `pretty`', () => {
	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	cleanStack(`Error: foo
    at A (file://${os.homedir()}/dev/a.js:1:1)`, {pathFilter, basePath: os.homedir(), pretty: true});

	assert.deepEqual(paths, [`file://${os.homedir()}/dev/a.js:1:1`]);
});

test('keeps the lines of a `Caused by:` chain', () => {
	const stack = `Error: outer
    at A (/a/b.js:1:1)
Caused by: inner
    at C (/c/d.js:2:2)
    at Module._compile (node:internal/modules/cjs/loader:1200:30)`;

	const expected = `Error: outer
    at A (/a/b.js:1:1)
Caused by: inner
    at C (/c/d.js:2:2)`;

	assert.equal(cleanStack(stack), expected);
});

test('keeps every line of a multi-line error message', () => {
	// The third line looks like the start of a frame, and is not one.
	const stack = `Error: line one
line two at three
    at internal/loader.js:1:1 the plugin was not found
    at A (/a/b.js:1:1)`;

	const paths = [];

	const pathFilter = path => {
		paths.push(path);
		return true;
	};

	assert.equal(cleanStack(stack, {pathFilter}), stack);
	assert.deepEqual(paths, ['/a/b.js:1:1']);
	assert.equal(cleanStack(stack, {pretty: true}), stack);
	assert.equal(cleanStack(stack, {basePath: '/a', pretty: true}), `Error: line one
line two at three
    at internal/loader.js:1:1 the plugin was not found
    at A (b.js:1:1)`);
});

test('`basePath` option supports the filesystem root', () => {
	const stack = `Error: foo
    at A (/a/b.js:1:14)
    at B (file:///c/d.js:2:2)`;

	assert.equal(cleanStack(stack, {basePath: '/'}), `Error: foo
    at A (a/b.js:1:14)
    at B (c/d.js:2:2)`);
});

test('`basePath` option does not strip from inside an `eval` frame', () => {
	// The path of an `eval` frame is the whole of what sits between the parentheses, and
	// it does not begin with the base path, so the anchored match does not reach inside.
	const stack = `Error: foo
    at eval (eval at <anonymous> (/base/a.js:1:1), <anonymous>:1:1)`;

	assert.equal(cleanStack(stack, {basePath: '/base'}), stack);
});

test('cleans a real error stack', () => {
	// Guards against a Node.js release changing the stack format in a way this
	// package cannot read.
	const error = new Error('Missing unicorn');
	const cleaned = cleanStack(error.stack);

	assert.ok(cleaned.startsWith('Error: Missing unicorn'));
	assert.ok(cleaned.includes('test.js'), cleaned);
	assert.ok(!cleaned.includes('node:internal'), cleaned);
	// The test runner puts its own internal frames in the stack, and those are dropped.
	assert.ok(cleaned.length < error.stack.length, `${cleaned}\n---\n${error.stack}`);
});

test('cleans a real error stack from an async frame', async () => {
	const fail = async () => {
		await Promise.resolve();
		throw new Error('Missing unicorn');
	};

	let error;
	try {
		await fail();
	} catch (error_) {
		error = error_;
	}

	const cleaned = cleanStack(error.stack);

	assert.ok(cleaned.includes('Missing unicorn'), cleaned);
	// The frame of this test is what must survive, or the stack would be the message alone.
	assert.ok(cleaned.includes('at fail'), cleaned);
	assert.ok(!cleaned.includes('node:internal'), cleaned);
});

test('keeps every frame shape that is not an internal one', () => {
	// A path holding a space or a parenthesis is the reason the path is found by index.
	// The tail after the space must not be read as the path, as `internal/x.js:1:1`
	// looks like an internal Node.js frame and would drop a frame of the user. Without a
	// function name there are no parentheses to anchor on, so the whole tail is the path.
	const frames = [
		'at fn (/abs/path/a.js:1:2)',
		'at /abs/path/a.js:1:2',
		'at fn (/a/b.js)',
		'at fn (/a/b.mjs:1:2)',
		'at fn (/a/b.cjs:1:2)',
		'at fn (/a/b.ts:1:2)',
		'at fn (/@scope/pkg/a.js:1:2)',
		'at fn (webpack:///./src/a.js:1:2)',
		'at fn (node_modules/x/y.js:1:2)',
		'at fn (/a/b (1)/c.js:1:2)',
		'at fn (/a/b c/d.js:1:2)',
		'at fn (/a/ünïcödé/🎉.js:1:2)',
		'at fn (file:///a/b%20c.js:1:2)',
		'at [eval]:1:1',
		'at <anonymous>:1:1',
		'at C:/p/a.js:1:1',
		'at async C:/p/a.js:1:2',
		'at /my dir/a.js:1:1',
		'at async /my dir/a.js:1:1',
		'at /my internal/x.js:1:1',
		'at fn (/my internal/x.js:1:1)',
		'at new Promise (<anonymous>)',
		'at async Promise.all (index 0)',
		'at fn [as x] (/a/b.js:1:2)',
		'at async fn (file:///a/b.js:1:2)',
	];

	const stack = `Error: foo\n${frames.map(frame => `    ${frame}`).join('\n')}`;
	assert.equal(cleanStack(stack), stack);
});

test('trailing whitespace is not part of the frame path', () => {
	// Without this the path is not recognised at all, so the frame survives the
	// internal filter and `basePath` is skipped.
	const stack = 'Error: foo\n    at f (node:internal/x.js:1:1) \n    at f (/base/a.js:1:1) ';
	assert.equal(cleanStack(stack, {basePath: '/base'}), 'Error: foo\n    at f (a.js:1:1) ');
});

test('keeps a project of its own under a top-level `internal/` when the name holds a dash', () => {
	// Only a `node:` module name was widened to hold a dash, so a name of only word
	// characters, such as `my_file.js`, is still read as an internal frame.
	const stack = `Error: foo
    at run (internal/my-file.js:1:1)
    at M._compile (node:internal/modules/cjs/loader:1200:30)`;

	assert.equal(cleanStack(stack), `Error: foo
    at run (internal/my-file.js:1:1)`);
	assert.equal(cleanStack('Error: foo\n    at run (internal/my_file.js:1:1)'), 'Error: foo');
});

test('`pathFilter` option removes the lines its callback rejects', () => {
	// `pathFilter` is the name of the public option, not a boolean name
	// eslint-disable-next-line unicorn/consistent-boolean-name
	const pathFilter = path => !/home-directory/v.test(path);

	const pre = `Error: foo
    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)`;

	const stack = `${pre}\n
		at getHomeDirectory (/Users/sindresorhus/dev/clean-stack/home-directory.js:3:32)
    at MySocket.emit (node:events:365:28)
    at MySocket.emit (node:fs/promises:363:28)
    at handleMessage (internal/child_process.js:695:10)
    at Pipe.channel.onread (internal/child_process.js:440:11)
    at process.emit (events.js:172:7)`;

	assert.equal(cleanStack(stack, {pathFilter}), pre);
});

test('`pathFilter` option is applied to simple relative paths', () => {
	// A simple relative path like `omitme.js:2:2` is exempted from the internal
	// Node.js path filter, but the user filter must still get to remove it.
	// eslint-disable-next-line unicorn/consistent-boolean-name -- `pathFilter` is the name of the public option, not a boolean name
	const pathFilter = path => !/omitme/v.test(path);

	const stack = `Error: foo
    at A (/base/omitme.js:1:1)
    at omitme.js:2:2
    at B (/base/keep.js:3:3)`;

	assert.equal(cleanStack(stack, {pathFilter}), `Error: foo
    at B (/base/keep.js:3:3)`);
});

test('new stack format on Node.js 15 and later', () => {
	const stack = `Error
    at B (/home/fengkx/projects/test/stack.js:5:19)
    at A (/home/fengkx/projects/test/stack.js:7:9)
    at Object.<anonymous> (/home/fengkx/projects/test/stack.js:14:1)
    at Module._compile (node:internal/modules/cjs/loader:1099:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1131:10)
    at Module.load (node:internal/modules/cjs/loader:967:32)
    at Function.Module._load (node:internal/modules/cjs/loader:807:14)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:76:12)
    at node:internal/main/run_main_module:17:47`;
	const expected = `Error
    at B (/home/fengkx/projects/test/stack.js:5:19)
    at A (/home/fengkx/projects/test/stack.js:7:9)
    at Object.<anonymous> (/home/fengkx/projects/test/stack.js:14:1)`;
	assert.equal(cleanStack(stack), expected);
});

test('at async', () => {
	const basePath = '/base';
	const stack = `Error: test
    at /base/test.js:704:48
    at /base/node_modules/vitest/dist/chunk-runtime-chain.072b5677.js:2266:13
    at /base/node_modules/vitest/dist/chunk-runtime-chain.072b5677.js:2141:26
    at runTest (/base/node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:550:42)
    at async runSuite (/base/node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:645:15)
    at async runFiles (/base/node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:779:5)
    at async startTestsNode (/base/node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:797:3)
    at async /base/node_modules/vitest/dist/entry.js:94:11
    at async Module.withEnv (/base/node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:295:5)
    at async run (/base/node_modules/vitest/dist/entry.js:87:7)
    at async file:///base/node_modules/tinypool/dist/esm/worker.js:109:20
    at file:///base/node_modules/tinypool/dist/esm/worker.js:109:20`;
	const expected = `Error: test
    at test.js:704:48
    at node_modules/vitest/dist/chunk-runtime-chain.072b5677.js:2266:13
    at node_modules/vitest/dist/chunk-runtime-chain.072b5677.js:2141:26
    at runTest (node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:550:42)
    at async runSuite (node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:645:15)
    at async runFiles (node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:779:5)
    at async startTestsNode (node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:797:3)
    at async node_modules/vitest/dist/entry.js:94:11
    at async Module.withEnv (node_modules/vitest/dist/chunk-runtime-error.b043a88d.js:295:5)
    at async run (node_modules/vitest/dist/entry.js:87:7)
    at async node_modules/tinypool/dist/esm/worker.js:109:20
    at node_modules/tinypool/dist/esm/worker.js:109:20`;
	assert.equal(cleanStack(stack, {basePath}), expected);
});

test('handles a stack that is not a string', () => {
	assert.equal(cleanStack(undefined), undefined);
	assert.equal(cleanStack(undefined, {pretty: true}), undefined);
	assert.equal(cleanStack(null), undefined);
	assert.equal(cleanStack(42), undefined);
});

test('`pretty` option converts a file URL that is outside the home directory', () => {
	const stack = `Error: foo
    at Test.fn (file:///opt/project/test.js:6:15)
    at handleMessage (internal/child_process.js:695:10)`;

	assert.equal(cleanStack(stack, {pretty: true}), `Error: foo
    at Test.fn (/opt/project/test.js:6:15)`);
});

test('`pretty` option converts file:// URLs and replaces home directory', () => {
	const stack = `Error: foo
    at Test.fn (file://${os.homedir()}/dev/project/test.js:6:15)
    at handleMessage (internal/child_process.js:695:10)`;

	const expected = `Error: foo
    at Test.fn (~/dev/project/test.js:6:15)`;

	assert.equal(cleanStack(stack, {pretty: true}), expected);
});

test('`pretty` option handles a home directory that ends with separators', async () => {
	// The trailing separators have to come from the environment itself, and the
	// platform reads a different variable, so this needs a process of its own.
	const indexUrl = new URL('index.js', import.meta.url).href;
	const homeVariable = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
	const homeDirectory = os.homedir();
	const stack = JSON.stringify(`Error: foo\n    at f (${homeDirectory.replaceAll('\\', '/')}/dev/a.js:1:1)`);
	const source = `
		const {default: cleanStack} = await import(${JSON.stringify(indexUrl)});
		process.stdout.write(cleanStack(${stack}, {pretty: true}));
	`;

	const {stdout} = await execFileAsync(process.execPath, ['--input-type=module', '--eval', source], {
		env: {...process.env, [homeVariable]: `${homeDirectory}//`},
	});

	assert.equal(stdout, 'Error: foo\n    at f (~/dev/a.js:1:1)');
});

test('`pretty` option leaves `$` sequences in a path alone', () => {
	const stack = `Error: foo
    at Test.fn (/a/$&/b.js:6:15)
    at Other.fn (/a/$$/b.js:1:2)
    at Third.fn (/a/$1/b.js:3:4)
    at handleMessage (internal/child_process.js:695:10)`;

	const expected = `Error: foo
    at Test.fn (/a/$&/b.js:6:15)
    at Other.fn (/a/$$/b.js:1:2)
    at Third.fn (/a/$1/b.js:3:4)`;

	assert.equal(cleanStack(stack, {pretty: true}), expected);
});
