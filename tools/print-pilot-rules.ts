import { churchRules } from '../src/services/churchRules.ts';

const owner = process.argv[2];
if (!owner) throw new Error('Pass the existing pilot owner email.');
process.stdout.write(churchRules(owner, true) + '\n');
