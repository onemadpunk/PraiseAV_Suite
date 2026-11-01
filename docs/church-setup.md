# Set up a church-owned Suite

A church administrator needs a Google account that the church controls. That account creates and owns the church's Firebase project. Each volunteer then signs in with their own Google account and waits for the administrator to approve access. There is no shared PraiseAV administrator account.

## Where to open the Suite

The recommended public address is **suite.praiseav.com**, with a clear Suite link from **praiseav.com**. Until that address is configured and its HTTPS certificate works, use the existing GitHub Pages address: **onemadpunk.github.io/PraiseAV_Suite/**. Keep both addresses in each church project’s Firebase Authentication → Authorized domains during a move, so existing users can still sign in. The Suite builds with relative asset paths and creates invitation links from the address currently open in the browser.

The site owner must first add `suite.praiseav.com` as the custom domain in the Suite repository’s GitHub Pages settings, then point a DNS CNAME for `suite` to `onemadpunk.github.io`. Enable HTTPS after GitHub issues its certificate. Do not publish the new address on praiseav.com until it loads and Google sign-in has been tested there. This changes only the Suite website address; it does not move any church’s Firestore records.

## 1. Create the church project

1. Open [Firebase Console](https://console.firebase.google.com/) in the church administrator's Google account.
2. Create a project for this church. Choose the Spark plan if its limits fit the church. You do not need to enable Analytics for the Suite.
3. In Project settings, add a Web app. Copy the Firebase web app configuration shown there. The Suite accepts the JavaScript snippet or a JSON object.
4. Open Authentication, then Sign-in method, and enable Google.
5. In Authentication settings, add the Suite website's domain to Authorized domains. Use the domain in the address bar, without a path.
6. Create a Cloud Firestore database. Choose the location that the church wants for its records. Do not put real records into open test-mode rules.

Firebase project creation is a guided manual step because doing it automatically would require broad control over the church's Google account. The Firebase web app API key is an identifier, not an administrator password; the Firestore rules protect records. Do not share Firebase service-account keys.

## 2. Install the church's rules

1. On the Suite start page, enter the church name and the Google email of the administrator who created the project.
2. Paste the Web app configuration.
3. Click Generate security rules, then Copy rules.
4. In Firebase Console, open Firestore Database → Rules. Replace the starter rules with the generated rules and publish them.
5. Back in the Suite, click Connect to church and sign in with the same administrator Google account.

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
