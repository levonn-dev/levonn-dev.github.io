import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLinks } from '../pages/projects/links.js';

test('splitLinks returns plain text as a single text segment', () => {
  assert.deepEqual(splitLinks('Built with care.'), [{ text: 'Built with care.' }]);
});

test('splitLinks turns a [label](project-id) reference into a link segment', () => {
  assert.deepEqual(splitLinks('injected with [mdrom](mdrom) into the ROM'), [
    { text: 'injected with ' },
    { text: 'mdrom', id: 'mdrom' },
    { text: ' into the ROM' },
  ]);
});

test('splitLinks handles references at the edges and keeps the text between them', () => {
  assert.deepEqual(splitLinks('[a](a)\n\n[the b tool](b)'), [
    { text: 'a', id: 'a' },
    { text: '\n\n' },
    { text: 'the b tool', id: 'b' },
  ]);
});
