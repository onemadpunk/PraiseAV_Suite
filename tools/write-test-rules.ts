import { mkdirSync, writeFileSync } from 'node:fs';
import { churchRules } from '../src/services/churchRules';
mkdirSync('.testing',{recursive:true});
writeFileSync('.testing/church.rules',churchRules('owner@example.org'));
