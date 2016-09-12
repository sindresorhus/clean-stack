import test from 'ava';
import m from './';

test('default', t => {
	const pre = 'Error: foo\n    at Test.fn (/Users/sindresorhus/dev/clean-stack/test.js:6:15)';
	const stack = `${pre}\n
    at handleMessage (internal/child_process.js:695:10)\n
    at Pipe.channel.onread (internal/child_process.js:440:11)\n
    at process.emit (events.js:172:7)`;
	t.is(m(stack), pre);
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
	t.is(m(stack), pre);
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
	t.is(m(stack), pre);
});

test('internal child_process', t => {
	const pre = 'Error: foo\n    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:4:7)';
	const stack = `${pre}\n
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at internal/child_process.js:696:12`;
	t.is(m(stack), pre);
});
