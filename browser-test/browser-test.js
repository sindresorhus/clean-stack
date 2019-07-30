import {ClientFunction, Selector} from 'testcafe';

fixture`Getting Started`
	.page`./index.html`;

test('default', async t => {
	const cleanStackTest = ClientFunction(() => window.module.exports('    Error: Not cleanable line\n    at process.emit (events.js:172:7)'));
	await t.click(Selector('#awaiter')).expect(cleanStackTest()).eql('    Error: Not cleanable line');
});
