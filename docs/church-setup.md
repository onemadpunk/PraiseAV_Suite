# Set up a church-owned Suite

A church administrator needs a Google account that the church controls. That account creates and owns the church's Firebase project. Members can use their own Google account or register with an ordinary email address and password. Email registrants verify their address before adding their own details or requesting access to shared church records. There is no shared PraiseAV administrator account.

## Where to open the Suite

For the existing `praiseav-suite` pilot, use **https://praiseav-suite.web.app/**. Google sign-in and church-owner access were verified there on 2 November 2026. This Firebase Hosting site uses the pilot's existing Spark project; it does not require a paid plan. The GitHub Pages address is still available, but its sign-in did not pass the pilot browser test.

The planned public address is **suite.praiseav.com**. The current **praiseav.com** site links to the tested Firebase Hosting pilot. The existing GitHub Pages build remains at **onemadpunk.github.io/PraiseAV_Suite/**, but its sign-in is unverified. When moving a church to a new address, keep both addresses in that project's Firebase Authentication → Authorized domains until sign-in has been tested on the new address. The Suite builds with relative asset paths and creates invitation links from the address currently open in the browser.

If moving to `suite.praiseav.com`, add it as a custom domain for the existing Firebase Hosting site and follow the DNS records shown by Firebase Console. Then add the new domain to Firebase Authentication's authorised domains and the existing Google OAuth web client's JavaScript origins and redirect URI. Test HTTPS and Google sign-in there before changing the link on praiseav.com. This changes only the Suite website address; it does not move any church's Firestore records or require a paid Firebase plan.

## One-time setup for a church administrator

Only one administrator per church uses Firebase Console. Volunteers and congregation members receive a church link; they do not create Firebase projects. PraiseAV Windows works without Firebase. The Suite's sample mode is for exploration and does not save new changes.

At the Suite start page, enter the church name and town and choose **Find church**. If a church with that name is already registered, ask its administrator for the church link. They can approve your access; you do not need another Firebase project. If it is a different congregation with the same name, add its neighbourhood to the name. If there is no match, choose **Set up this church** and sign in with the church administrator's Google account. This reserves the name and town for about two weeks while setup is completed. An unfinished reservation then expires without anyone at PraiseAV reviewing it.

The Suite's **Church setup checklist** recognises the project ID when you paste the Web app code, provides direct links to that project's pages, and generates security rules automatically. The church administrator email is taken from the Google account that reserved the registration.

## 1. Create the church project

1. Open [Firebase Console](https://console.firebase.google.com/) in the church administrator's Google account.
2. Create a project for this church. Choose the Spark plan if its limits fit the church. You do not need to enable Analytics for the Suite.
3. In Project settings → General → Your apps, add a Web app named PraiseAV Suite. Leave Firebase Hosting unchecked. Paste the full code example containing `firebaseConfig` into the Suite checklist. The Firebase SDK is already installed in the Suite, so you do not need to run `npm install firebase`.
4. Use the checklist's project-specific link to Authentication → Sign-in method. Enable Google for the church administrator. Enable Email/Password for members without Google accounts. Set the public-facing name, select the church's support email, and save. Leave the separate passwordless Email link switch off: on the Spark plan, Firebase currently limits its sign-in emails to five per day.
5. Use the checklist's link to Authentication → Settings. Add the Suite website's domain to Authorised domains. Enter only the hostname, without `https://` or a path.
6. Use the checklist's link to create a Cloud Firestore database. Choose Standard edition, ID `(default)`, a location near the church, and Production mode. London (`europe-west2`) is an option for UK churches. The database location cannot be changed later. Do not enter real records yet.

Firebase project creation is a guided manual step because doing it automatically would require broad control over the church's Google account. The Firebase web app API key is an identifier, not an administrator password; the Firestore rules protect records. Do not share Firebase service-account keys.

## 2. Install the church's rules

1. On the Suite start page, reserve the church name and town, then paste the Web app configuration. Use the same Google account to create and connect the church project.
2. The church-specific security rules appear automatically. Click Copy security rules.
3. In Firebase Console, open Firestore → Rules. Replace the starter rules with the generated rules and publish them.
4. Tick **I published these rules in Firestore** in the Suite checklist, then click **Connect and sign in** using the same administrator Google account. The Suite completes the church's directory entry at this point.

The owner email is embedded in the rules. Check it carefully before publishing. If it changes, the Firebase project owner can replace the rules in Firebase Console. Rules are maintained in each church project; when the Suite's rules change in a future release, administrators may need to publish the new version.

The PraiseAV registration directory stores the church name, town, setup status and project ID only; it holds no church records or member contact details. A name and town match prevents ordinary accidental duplicate setups, but email verification cannot prove that someone officially represents a church. PraiseAV does not certify churches. See [church directory operations](church-directory.md).

**Existing church projects upgrading to email registration:** open **Church access → Copy updated security rules**, paste them into Firestore → Rules, and publish. In Firebase Authentication → Sign-in method, enable **Email/Password**. Leave **Email link** off. The new private **My details** form cannot save until the updated rules are published. These changes do not require a paid Firebase plan.

## 3. Invite the team

Open Church access, copy the church link, and send it to the people who need access. They sign in with Google or create an email-and-password account. Email registrants open Firebase's verification email, return to the Suite, and confirm verification there. Once verified, they can enter their own name, contact number and household details in **My details**; these details are visible only to that person and church administrators, not to other members. They then request access to shared church records. The church administrator selects roles and approves each request. The owner can remove access later. This approval is for reading shared church data; it does not prevent a verified person from entering their own details.

If a member forgets their password, use **Reset password** on the sign-in page. Firebase sends the reset email. A church member does not need a Google account. A full member-facing address book with per-field visibility choices is still to be built; do not give the general `member` role access to the staff People collection.

See [roles and privacy](roles-and-privacy.md) before approving access to children, pastoral notes, or giving records. The link itself is not permission to read church records.

## 4. Move older Suite data, if present

Older versions kept data in one browser's localStorage. On that same browser, choose Open existing browser records. Download a church backup before clearing browser data. Sign in to the new church project, download a backup of any existing cloud records, then choose Restore backup file. Review the confirmation carefully: records with matching IDs are replaced and records absent from the backup are removed.

A browser backup is an ordinary unencrypted JSON file containing personal data. Store it in a location controlled by the church and delete unneeded copies. The Suite does not automatically migrate or upload older records.

## 5. Connect to PraiseAV Windows

In the Suite, choose a service, then open **PraiseAV export**. In Chrome or another browser with folder access, click **Send to PraiseAV folder** and choose the same **PraiseAV Services** folder that PraiseAV Windows uses. The Suite remembers the folder in that browser and can send later versions with one click. PraiseAV must reopen the service to see a newer file. The Suite refuses to replace the file if PraiseAV or another computer has changed it since the last transfer.

If your browser cannot choose a folder, use **Download .praiseav file** and open it in PraiseAV through Service → Open → More choices → Open from somewhere else, or move it to the PraiseAV Services folder yourself.

On first run, PraiseAV asks whether you plan to use the Suite or prepare on another computer. Choose Yes to open the optional Church sharing guide. Choose Not now to keep local folders. Later, open More → Church sharing in PraiseAV. If the Suite and PraiseAV run on different computers, both must use the same locally synced OneDrive or Google Drive folder. A cloud folder is shared only after you choose and confirm it.

The service file carries the order, the song words your church entered, and service-specific key and arrangement choices. Large media and visiting speaker presentation files are not embedded. Attach those files and run Ready for Sunday on the church computer before the service.

## Share the band plan and follow live

In a service plan, assign volunteers using member records with their email addresses. **Copy team message** makes a service summary with the order, song keys and a link into the Suite Band stand. **Email team** opens your email app with the assigned, non-declined volunteers in Bcc; review the draft before sending it. Volunteers sign in with their own approved church accounts. The Band stand shows assignments matching the signed-in email address and lets each musician choose a key and capo for their own tablet.

For live following, send the updated `.praiseav` service file to PraiseAV Windows and reopen it there. Turn on **Remote** in PraiseAV Windows. On the same church Wi-Fi, band members scan its QR code, request pairing, and the AV desk approves each tablet as **Band stand (read-only)**. The local band view shows the song chart and follows the current section when the operator advances slides. Its capo choice affects that tablet alone. This local connection uses no per-slide Firebase writes; it needs the Windows app and tablet on the same network. The remote page uses a certificate made on the church computer, so the tablet may need to trust that local address on first use.

## Costs and support boundary

The Suite itself has no subscription or payment processor. Firebase's free Spark plan has service quotas; reaching them can interrupt cloud features. Every church owns and administers its own project, so there is no single PraiseAV database quota shared across all churches. The Windows application continues to work without Firebase or an internet connection.
