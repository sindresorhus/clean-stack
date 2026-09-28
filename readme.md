# clean-stack

> Clean up error stack traces

Removes the mostly unhelpful internal Node.js entries.

Also works in the browser and Electron.

## Install

```sh
npm install clean-stack
```

## Usage

```js
import cleanStack from 'clean-stack';

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
```

## API

### cleanStack(stack, options?)

Returns the cleaned stack or `undefined` if the given `stack` is not a string.

#### stack

Type: `string | undefined`

The `stack` property of an [`Error`](https://github.com/microsoft/TypeScript/blob/eac073894b172ec719ca7f28b0b94fc6e6e7d4cf/lib/lib.es5.d.ts#L972-L976), or `undefined`.

#### options

Type: `object`

##### pretty

Type: `boolean`\
Default: `false`

Prettify the file paths in the stack:

- `/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`
- `file:///Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`

When enabled, file URLs are converted to regular paths for better readability and IDE integration. URLs that cannot be converted, contain `?` or `#`, or decode to a line break are left unchanged.

`pretty` and `basePath` only rewrite frame paths. Backslashes become `/` throughout each frame. Error message text is preserved except for blank lines; lines shaped like frames are treated as frames.

##### basePath

Type: `string?`

Remove the given base path from stack trace file paths, effectively turning absolute paths into relative ones. It will also transform absolute file URLs into relative paths.

Supports absolute or relative paths, either separator, and the filesystem root. A leading slash only matches absolute paths. Relative base paths do not match inside `file:///`, except Windows drive paths such as `C:/Users`.

Example with `'/Users/sindresorhus/dev/clean-stack'` as `basePath`:

`/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `unicorn.js:2:15`

> [!NOTE]
> `basePath` matches before file URLs are decoded, so `/Users/John Doe/dev` does not match `file:///Users/John%20Doe/dev`. After a match, remaining URL escapes stay encoded, even with `pretty`.

> [!NOTE]
> Frames like `at fn (unicorn.js:2:15)` are removed because they resemble old internal Node.js frames. Cleaning again after `basePath` produces this form can therefore drop frames for files directly in the base path. Paths with a directory, like `at fn (src/unicorn.js:2:15)`, and bare frames like `at unicorn.js:2:15` are unaffected.

##### pathFilter

Type: `(path: string) => boolean`

Remove stack lines where the callback returns `false`. It receives the path without the closing parenthesis, with `/` separators, before `basePath` or `pretty` is applied. A pathless frame such as `at async Promise.all (index 0)` yields `index 0`.

> [!NOTE]
> Balanced parentheses in function names, such as `at render (partial) (/base/a.js:6:9)`, and paths, such as `C:/Program Files (x86)/app.js:1:1`, are supported. Unbalanced parentheses in a function name, such as `at a(b (/base/a.js:6:9)`, can cause part of the name to be included in the path.

```js
import cleanStack from 'clean-stack';

const error = new Error('Missing unicorn');

console.log(cleanStack(error.stack));
// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/omit-me.js:1:16)

const pathFilter = path => !/omit-me/.test(path);

console.log(cleanStack(error.stack, {pathFilter}));
// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
```

## Related

- [extract-stack](https://github.com/sindresorhus/extract-stack) - Extract the actual stack of an error
- [stack-utils](https://github.com/tapjs/stack-utils) - Captures and cleans stack traces
