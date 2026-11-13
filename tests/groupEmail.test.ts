import test from 'node:test';
import assert from 'node:assert/strict';
import { MAILTO_LIMIT, addressesForPasting, bandMembers, bccMailto, emailAddresses, withoutEmail } from '../src/utils/groupEmail';
import type { Member } from '../src/types/church';

const person = (id: string, fullName: string, email: string, departments: Member['departments'] = []) =>
  ({ id, fullName, email, departments } as Member);

const people = [
  person('p1', 'Cat', 'cat@example.org', ['Band & Vocals']),
  person('p2', 'Ann', ' ann@example.org ', ['Hospitality & Welcome']),
  person('p3', 'Bob', ''),
  person('p4', 'Dan', 'CAT@example.org'),
  person('p5', 'Eve', 'member@gracecommunity.org.uk', ['Band & Vocals']),
  person('p6', 'Fay', 'not an email'),
];

test('only real addresses are used, once each, in name order', () => {
  assert.deepEqual(emailAddresses(people), ['ann@example.org', 'cat@example.org']);
  assert.equal(withoutEmail(people), 3);
});

test('the band is everyone on the Band & Vocals team', () => {
  assert.deepEqual(bandMembers(people).map((p) => p.id), ['p1', 'p5']);
  assert.deepEqual(emailAddresses(bandMembers(people)), ['cat@example.org']);
});

test('everyone goes in BCC, with the sender as To', () => {
  assert.equal(bccMailto(['a@x.org', 'b@x.org'], { to: 'me@x.org', subject: 'Hi there' }),
    'mailto:me%40x.org?bcc=a%40x.org,b%40x.org&subject=Hi%20there');
  assert.equal(bccMailto(['a@x.org']), 'mailto:?bcc=a%40x.org');
  assert.equal(bccMailto([]), null);
});

test('a list too long for mail apps gives no link, so the addresses are copied instead', () => {
  const many = Array.from({ length: 120 }, (_, i) => `person${i}@example.org`);
  assert.equal(bccMailto(many), null);
  const fits = bccMailto(many.slice(0, 20)) || '';
  assert.ok(fits.length > 0 && fits.length <= MAILTO_LIMIT);
  assert.equal(addressesForPasting(['a@x.org', 'b@x.org']), 'a@x.org; b@x.org');
});
