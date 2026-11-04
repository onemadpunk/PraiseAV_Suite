# Church registration directory

The registration Firebase project `praiseav-suite` hosts a small public directory. It is separate from each church's Firebase project. It stores a church name, town, normalised search keys, a temporary reservation, the Firebase project ID after setup, and the registrar's Firebase user ID. It does not store member data, church records, or an administrator email address. Anyone can read directory entries; only the Google account that reserved an entry can finish or cancel it.

The user searches before setup. An exact name and town match blocks a second setup and points the user to the existing church administrator. A different congregation in the same town can add a neighbourhood to its name. A pending reservation lasts about 13 days. After expiration, another verified Google account can replace it without a scheduled job or manual review. The administrator can cancel their own unfinished reservation. On successful church connection, the entry becomes permanent. Firebase's free Spark plan is used; quota exhaustion stops registration until the quota resets and does not enable billing.

This is duplicate prevention for ordinary users, not a claim that PraiseAV has verified a church's legal identity. A person who deliberately changes the name or town can evade the match. A church whose administrator is unavailable should recover its Firebase project through Google and use its existing invite link; PraiseAV does not adjudicate ownership disputes.

## Deploying the registration rules

The public Suite must be hosted on `praiseav-suite.web.app` or its future Firebase Hosting custom domain. Firebase Hosting's reserved `/__/firebase/init.json` supplies the public directory Web configuration. The GitHub Pages build does not host this endpoint and cannot register churches.

The registration service needs the generated directory-enabled Firestore rules before the new start screen is published. Generate them with `node --import tsx tools/print-directory-rules.ts <site-owner-email> > .firebase-cli/directory.rules`. The ignored file stays local. Publish it to the existing `praiseav-suite` Firestore database using `firebase.directory.json`, then deploy Hosting from `dist`. Deploy rules first. These rules include the existing site-owner church permissions. Do not deploy directory-enabled rules to any church-owned Firebase project. `tools/church-cloud-setup.ts` includes the directory rules automatically only when targeting the exact registration project ID.

After rules and Hosting are updated, verify a no-match search, one temporary reservation, an exact duplicate result, reservation cancellation, and a fresh sign-in to the existing Suite site. Use only invented church names and delete no real records. No paid Firebase products or Cloud Functions are needed.
