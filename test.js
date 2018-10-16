import os from 'os';
import test from 'ava';
import cleanStack from '.';

test('default', t => {
	const pre = 'Error: foo\n    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)';
	const stack = `${pre}\n
    at handleMessage (internal/child_process.js:695:10)\n
    at Pipe.channel.onread (internal/child_process.js:440:11)\n
    at process.emit (events.js:172:7)`;
	t.is(cleanStack(stack), pre);
});

test('default #2', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)`;
	t.is(cleanStack(stack), pre);
});

test('directly executed node script', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)
    at node.js:968:3`;
	t.is(cleanStack(stack), pre);
});

test('internal child_process', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at internal/child_process.js:696:12`;
	t.is(cleanStack(stack), pre);
});

test('internal next_tick', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at _combinedTickCallback (internal/process/next_tick.js:67:7)
    at process._tickCallback (internal/process/next_tick.js:98:9)`;
	t.is(cleanStack(stack), pre);
});

test('internal various modules', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at emitOne (events.js:101:20)
    at process.emit (events.js:188:7)
    at process._fatalException (bootstrap_node.js:300:26)`;
	t.is(cleanStack(stack), pre);
});

test('babel-polyfill', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at run (/Users/sindresorhus/dev/clean-stack/node_modules/babel-polyfill/node_modules/core-js/modules/es6.promise.js:87:22)
    at /Users/sindresorhus/dev/clean-stack/node_modules/babel-polyfill/node_modules/core-js/modules/es6.promise.js:100:28`;
	t.is(cleanStack(stack), pre);
});

test('pirates', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at Module._compile (/Users/zavr/dev/clean-stack/node_modules/pirates/lib/index.js:83:24)
    at Object.newLoader [as .js] (/Users/zavr/dev/clean-stack/node_modules/pirates/lib/index.js:88:7)`;
	t.is(cleanStack(stack), pre);
});

test('works on Windows', t => {
	const expected = 'Error: foo\n    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)';
	const stack = `Error: foo\n    at Test.fn (\\Users\\sindresorhus\\dev\\clean-stack\\test.js:6:15)\n
    at handleMessage (internal\\child_process.js:695:10)\n
    at Pipe.channel.onread (internal\\child_process.js:440:11)\n
    at process.emit (events.js:172:7)`;
	t.is(cleanStack(stack), expected);
});

test('works with Electron stack traces - dev app', t => {
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

	t.is(cleanStack(stack), expected);
});

test('works with Electron stack traces - built app', t => {
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

	t.is(cleanStack(stack), expected);
});

test('pretty option', t => {
	const stack = `Error: foo\n
    at Test.fn (${os.homedir()}/dev/clean-stack/test.js:6:15)\n
    at handleMessage (internal/child_process.js:695:10)\n
    at Pipe.channel.onread (internal/child_process.js:440:11)\n
    at process.emit (events.js:172:7)`;
	const expected = 'Error: foo\n    at Test.fn (~/dev/clean-stack/test.js:6:15)';
	t.is(cleanStack(stack, {pretty: true}), expected);
});
