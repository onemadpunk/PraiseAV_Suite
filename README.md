# PraiseAV Suite

PraiseAV Suite plans services and keeps church records. It can run as a sample without an account, or connect to a Firebase project owned by your church. The Suite includes a mobile Band stand with personal key and capo choices. The Windows PraiseAV application works independently and offline. A service planned in the Suite can be downloaded as a .praiseav file and opened in the Windows application.

## Start here

- [Church-owned setup](docs/church-setup.md): connect a Firebase project, sign in, invite people, and migrate older browser data.
- [Roles and privacy](docs/roles-and-privacy.md): who can see each kind of record, backups, child pickup codes, and data ownership.
- [Using the Suite with PraiseAV](docs/workflows.md): service exports, songs, presentation files, rotas, and current limits.

This is a static website. Firebase Authentication and Cloud Firestore are configured separately by each church. PraiseAV does not operate a central database for your church's records. Churches should check Firebase's current [Spark plan limits](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) and [Firestore quotas](https://firebase.google.com/docs/firestore/quotas); free use has limits.

## For developers

Run npm install --legacy-peer-deps, then npm run lint, npm test, and npm run build. To run the optional cross-application test, set PRAISEAV_DESKTOP_ROOT to a PraiseAV checkout before npm test.

The Suite exports PraiseAV's format from src/utils/praiseavService.ts. The desktop reader is electron/services.cjs in the PraiseAV repository. The Firestore rules generator is src/services/churchRules.ts. These must be kept compatible when either application changes.

The existing browser-only Suite stored records under praiseav_suite_zero_cost_db_v1 in localStorage. This version can read those records to let users download a backup. It never uploads them without the church administrator's restore action.
