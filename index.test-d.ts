import {expectType} from 'tsd';
import cleanStack from './index.js';

const error = new Error('Missing unicorn');

if (error.stack) {
	expectType<string>(cleanStack(error.stack));
	expectType<string>(cleanStack(error.stack, {pretty: true}));
	expectType<string>(cleanStack(error.stack, {basePath: 'foo'}));
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	expectType<undefined>(cleanStack(undefined));
}
