import {expectType} from 'tsd';
import cleanStack = require('.');

const error = new Error('Missing unicorn');

if (error.stack) {
	expectType<string>(cleanStack(error.stack));
	expectType<string>(cleanStack(error.stack, {pretty: true}));
	expectType<string>(cleanStack(error.stack, {basePath: __dirname}));
}
