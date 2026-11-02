# Set up a church-owned Suite

A church administrator needs a Google account that the church controls. That account creates and owns the church's Firebase project. Each volunteer then signs in with their own Google account and waits for the administrator to approve access. There is no shared PraiseAV administrator account.

## Where to open the Suite

The recommended public address is **suite.praiseav.com**, with a clear Suite link from **praiseav.com**. Until that address is configured and its HTTPS certificate works, use the existing GitHub Pages address: **onemadpunk.github.io/PraiseAV_Suite/**. Keep both addresses in each church project’s Firebase Authentication → Authorized domains during a move, so existing users can still sign in. The Suite builds with relative asset paths and creates invitation links from the address currently open in the browser.

The site owner must first add `suite.praiseav.com` as the custom domain in the Suite repository’s GitHub Pages settings. If GoDaddy manages the domain’s DNS, add a CNAME with **Name `suite`** and **Value `onemadpunk.github.io`** (no repository path). If the domain uses another company’s nameservers, make the record there instead. Enable HTTPS after GitHub issues its certificate. Do not publish the new address on praiseav.com until it loads and Google sign-in has been tested there. This changes only the Suite website address; it does not move any church’s Firestore records.

## One-time setup for a church administrator

Only one administrator per church uses Firebase Console. Volunteers and congregation members receive a church invitation link and sign in with Google; they do not create Firebase projects. PraiseAV Windows works without Firebase. The Suite's sample mode is for exploration and does not save new changes.

Open the Suite's **Church setup checklist** alongside Firebase Console. The checklist recognises the project ID when you paste the Web app code, provides direct links to that project's pages, and generates security rules automatically after you enter the church name and administrator email.

## 1. Create the church project

1. Open [Firebase Console](https://console.firebase.google.com/) in the church administrator's Google account.
2. Create a project for this church. Choose the Spark plan if its limits fit the church. You do not need to enable Analytics for the Suite.
3. In Project settings → General → Your apps, add a Web app named PraiseAV Suite. Leave Firebase Hosting unchecked. Paste the full code example containing `firebaseConfig` into the Suite checklist. The Firebase SDK is already installed in the Suite, so you do not need to run `npm install firebase`.
4. Use the checklist's project-specific link to Authentication → Sign-in method. Choose Google, turn on Enable, set the public-facing name, select the church's support email, and save.
5. Use the checklist's link to Authentication → Settings. Add the Suite website's domain to Authorised domains. Enter only the hostname, without `https://` or a path.
6. Use the checklist's link to create a Cloud Firestore database. Choose Standard edition, ID `(default)`, a location near the church, and Production mode. London (`europe-west2`) is an option for UK churches. The database location cannot be changed later. Do not enter real records yet.

Firebase project creation is a guided manual step because doing it automatically would require broad control over the church's Google account. The Firebase web app API key is an identifier, not an administrator password; the Firestore rules protect records. Do not share Firebase service-account keys.

## 2. Install the church's rules

1. On the Suite start page, enter the church name and the Google email of the administrator who created the project. Paste the Web app configuration if you have not already done so.
2. The church-specific security rules appear automatically. Click Copy security rules.
3. In Firebase Console, open Firestore → Rules. Replace the starter rules with the generated rules and publish them.
4. Tick **I published these rules in Firestore** in the Suite checklist, then click **Connect and sign in** using the same administrator Google account.

The owner email is embedded in the rules. Check it carefully before publishing. If it changes, the Firebase project owner can replace the rules in Firebase Console. Rules are maintained in each church project; when the Suite's rules change in a future release, administrators may need to publish the new version.

## 3. Invite the team

Open Church access, copy the church link, and send it to the people who need access. They sign in with their own Google accounts and request access. The church administrator selects roles and approves each request. The owner can remove access later.

See [roles and privacy](roles-and-privacy.md) before approving access to children, pastoral notes, or giving records. The link itself is not permission to read church records.

## 4. Move older Suite data, if present

Older versions kept data in one browser's localStorage. On that same browser, choose Open existing browser records. Download a church backup before clearing browser data. Sign in to the new church project, download a backup of any existing cloud records, then choose Restore backup file. Review the confirmation carefully: records with matching IDs are replaced and records absent from the backup are removed.

A browser backup is an ordinary unencrypted JSON file containing personal data. Store it in a location controlled by the church and delete unneeded copies. The Suite does not automatically migrate or upload older records.

## 5. Connect to PraiseAV Windows

In the Suite, choose a service and download its .praiseav file. Open it in PraiseAV through Service → Open → More choices → Open from somewhere else, or place it in a shared PraiseAV Services folder.

On first run, PraiseAV asks whether you plan to use the Suite or prepare on another computer. Choose Yes to open the optional Church sharing guide. Choose Not now to keep local folders. Later, open More → Church sharing in PraiseAV. A cloud folder is shared only after you choose and confirm it.

The service file carries the order, the song words your church entered, and service-specific key and arrangement choices. Large media and visiting speaker presentation files are not embedded. Attach those files and run Ready for Sunday on the church computer before the service.

## Costs and support boundary

The Suite itself has no subscription or payment processor. Firebase's free Spark plan has service quotas; reaching them can interrupt cloud features. Every church owns and administers its own project, so there is no single PraiseAV database quota shared across all churches. The Windows application continues to work without Firebase or an internet connection.
