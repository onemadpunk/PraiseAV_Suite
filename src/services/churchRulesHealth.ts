import { doc, Firestore, getDocFromServer } from 'firebase/firestore';
import { CHURCH_RULES_VERSION } from './churchRules';

export type ChurchRulesHealth = 'current' | 'update-needed' | 'unavailable' | 'unsafe';

function codeOf(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
}

/** Check a permitted and a forbidden read against the church's deployed rules. */
export async function checkChurchRulesHealth(db: Firestore): Promise<ChurchRulesHealth> {
  try {
    await getDocFromServer(doc(db, 'ruleCapabilities', CHURCH_RULES_VERSION));
  } catch (error) {
    return codeOf(error) === 'permission-denied' ? 'update-needed' : 'unavailable';
  }
  try {
    await getDocFromServer(doc(db, 'ruleCapabilities', 'forbidden'));
    return 'unsafe';
  } catch (error) {
    return codeOf(error) === 'permission-denied' ? 'current' : 'unavailable';
  }
}
