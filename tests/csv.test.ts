import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../src/utils/csv';

test('CSV output escapes quotes and prevents spreadsheet formulas in imported names', () => {
  assert.equal(csvCell('Normal Name'), `"Normal Name"`);
  assert.equal(csvCell('A "quoted" name'), `"A ""quoted"" name"`);
  assert.equal(csvCell('=HYPERLINK("bad")'), `"'=HYPERLINK(""bad"")"`);
  assert.equal(csvCell('+44 7700 900123'), `"'+44 7700 900123"`);
});
