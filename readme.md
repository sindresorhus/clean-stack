# clean-stack [![Build Status](https://travis-ci.org/sindresorhus/clean-stack.svg?branch=master)](https://travis-ci.org/sindresorhus/clean-stack)

> Clean up error stack traces

Removes the mostly unhelpful internal Node.js entries.

Also works in Electron.


## Install

```
$ npm install clean-stack
```


## Usage

```js
const cleanStack = require('clean-stack');

const error = new Error('Missing unicorn');

console.log(error.stack);
/*
Error: Missing unicorn
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
    at Module._compile (module.js:409:26)
    at Object.Module._extensions..js (module.js:416:10)
    at Module.load (module.js:343:32)
    at Function.Module._load (module.js:300:12)
    at Function.Module.runMain (module.js:441:10)
    at startup (node.js:139:18)
*/

console.log(cleanStack(error.stack));
/*
Error: Missing unicorn
    at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
*/

// If stack is undefiend or not a string
const errorWithUndefiendStack = new Error();
delete errorWithUndefiendStack.stack;

cleanStack(error.stack) // undefined;
```


## API

### cleanStack(stack, [options])

#### stack

Type: `string | undefined`

The `stack` property of an [`Error`](https://github.com/microsoft/TypeScript/blob/eac073894b172ec719ca7f28b0b94fc6e6e7d4cf/lib/lib.es5.d.ts#L972-L976).

#### options

Type: `Object`

##### pretty

Type: `boolean`<br>
Default: `false`

Prettify the file paths in the stack:

`/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`


## Related

- [extrack-stack](https://github.com/sindresorhus/extract-stack) - Extract the actual stack of an error
- [stack-utils](https://github.com/tapjs/stack-utils) - Captures and cleans stack traces


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
