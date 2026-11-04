# Set up a church-owned Suite

A church administrator needs a Google account that the church controls. That account creates and owns the church's Firebase project. Members can use their own Google account or register with an ordinary email address and password. Email registrants verify their address before adding their own details or requesting access to shared church records. There is no shared PraiseAV administrator account.

## Where to open the Suite

Open **https://praiseav-suite.web.app/**, or follow your church’s invitation link. Returning users sign into their connected church. New users find their church or follow the one-time church setup below.

All churches use the same Suite website. Each church connects its own Firebase project for accounts and church records; opening the website does not put a new church’s records in PraiseAV’s registration project.

## One-time setup for a church administrator

Only one administrator per church uses Firebase Console. Volunteers and congregation members receive a church link; they do not create Firebase projects. PraiseAV Windows works without Firebase. The Suite opens your church workspace after sign-in; it does not open an unsaved example workspace.

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

The owner email is embedded in the rules. Check it carefully before publishing. If it changes, the Firebase project owner can replace the rules in Firebase Console. The Suite checks a read-only rules version when connecting a new church and under **Church access**. Rules are maintained in each church project. Rule updates currently use Firebase Console. An owner-authorised updater is tracked in the internal development checklist.

The PraiseAV registration directory stores the church name, town, setup status and project ID only; it holds no church records or member contact details. A name and town match prevents ordinary accidental duplicate setups, but email verification cannot prove that someone officially represents a church. PraiseAV does not certify churches. See [church directory operations](church-directory.md).

**Existing church projects upgrading to the current roles, directory and private sermon drafts (rules v2):** open **Church access → Copy updated security rules**, paste them into that church's Firestore → Rules, and publish before using the new roles or directory. In Firebase Authentication → Sign-in method, enable **Email/Password** if ordinary email registration is wanted. Leave **Email link** off. Repeat this rules update in each church's own Firebase project. These changes do not require a paid Firebase plan.

## 3. Invite the team

Open Church access, copy the church link, or enter an email address and open an invitation draft in your mail app. Office staff can prepare these drafts, while an owner or administrator approves requests and assigns roles. People sign in with Google or create an email-and-password account. Email registrants open Firebase's verification email, return to the Suite, and confirm verification there. Once verified, they can enter their own name, contact number and household details in **My details**; these private details are visible to that person and church administrators. They then request access to shared church records. The church administrator can give several people the Preacher or Worship leader role, and can remove access later. A link or registration alone does not grant shared church access.

If a member forgets their password, use **Reset password** on the sign-in page. Firebase sends the reset email. A church member does not need a Google account. After approval, each adult can optionally list their name in **Church directory** and independently choose whether to show household name, email and phone. These choices are off by default and can be withdrawn in **My details**. Other family members' names are kept private. Do not give the general `member` or `family` role access to the staff People collection.

See [roles and privacy](roles-and-privacy.md) before approving access to children, pastoral notes, or giving records. The link itself is not permission to read church records.

## 4. Move older Suite data, if present

Older versions kept data in one browser's localStorage. On that same browser, choose Open existing browser records. Download a church backup before clearing browser data. Sign in to the new church project, download a backup of any existing cloud records, then choose Restore backup file. Review the confirmation carefully: records with matching IDs are replaced and records absent from the backup are removed.

A browser backup is an ordinary unencrypted JSON file containing personal data. Store it in a location controlled by the church and delete unneeded copies. The Suite does not automatically migrate or upload older records.

## 5. Connect to PraiseAV Windows

In the Suite, choose a service, then open **PraiseAV export**. In Chrome or another browser with folder access, click **Send to PraiseAV folder** and choose the same **PraiseAV Services** folder that PraiseAV Windows uses. The Suite remembers the folder in that browser and can send later versions with one click. If PraiseAV already has that service open, the AV desk sees an update notice and chooses when to load the new version. The Suite refuses to replace the file if PraiseAV or another computer has changed it since the last transfer.

If your browser cannot choose a folder, use **Download .praiseav file** and open it in PraiseAV through Service → Open → More choices → Open from somewhere else, or move it to the PraiseAV Services folder yourself.

On first run, PraiseAV asks whether you plan to use the Suite or prepare on another computer. Choose Yes to open the optional Church sharing guide. Choose Not now to keep local folders. Later, open More → Church sharing in PraiseAV. If the Suite and PraiseAV run on different computers, both must use the same locally synced OneDrive or Google Drive folder. A cloud folder is shared only after you choose and confirm it.

The service file carries the order, the song words your church entered, and service-specific key and arrangement choices. Video and music published from My sermon & tablet travel as separate verified files in PraiseAV Assets alongside the service. The desktop waits for them before opening, then caches them for offline use. Visiting-speaker PowerPoint/PDF files still need desktop import. See workflows.md for the home-to-Sunday sermon steps.

## Share the band plan and follow live

In a service plan, assign volunteers using member records with their email addresses. **Copy team message** makes a service summary with the order, song keys and a link into the Suite Band stand. **Email team** opens your email app with the assigned, non-declined volunteers in Bcc; review the draft before sending it. Volunteers sign in with their own approved church accounts. The Band stand shows assignments matching the signed-in email address and lets each musician choose a key and capo for their own tablet.

For live following, send the updated `.praiseav` service file to PraiseAV Windows. When the file changes, the AV desk sees a notice and chooses when to load the new version; an active congregation slide is never replaced automatically. Turn on **Remote** in PraiseAV Windows. On the same church Wi-Fi, band members scan its QR code, request pairing, and the AV desk approves each tablet as **Band stand (read-only)**. The local band view shows the song chart and follows the current section when the operator advances slides. Its capo choice affects that tablet alone. This local connection uses no per-slide Firebase writes; it needs the Windows app and tablet on the same network. The remote page uses a certificate made on the church computer, so the tablet may need to trust that local address on first use.

## Costs and support boundary

The Suite itself has no subscription or payment processor. Firebase's free Spark plan has service quotas; reaching them can interrupt cloud features. Every church owns and administers its own project, so there is no single PraiseAV database quota shared across all churches. The Windows application continues to work without Firebase or an internet connection.

On 4 November 2026 the hosted Suite received the My sermon & tablet workspace, shared-folder video/music publication, remembered local-view return links, private-draft backup support, and church rules v2. This updates the registration project only. Newly generated church setups use v2; an existing independent church project must install the current rules before private sermon drafts are available.
