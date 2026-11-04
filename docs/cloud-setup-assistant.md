# Optional developer cloud setup assistant

The public Suite has a guided setup for a church-owned Firebase project; see [church setup](church-setup.md). The command-line helper below is an optional developer tool for inspecting or provisioning a project under its owner's Google login. Ordinary churches should use the Suite's guided checklist. The `praiseav-suite` project hosts the public registration directory and a pilot church; it is not a shared database for other churches' records.

The pilot helper is `tools/church-cloud-setup.ts`. It uses the official Firebase CLI under the church administrator's Google login. It does not request a password, service-account key, or refresh token. Its default run prints a plan and changes nothing. `--apply` requires the exact project ID, verifies the signed-in account can see that project, and stops when the web app is ambiguous. It never deploys Hosting or Cloud Functions.

For the existing `praiseav-suite` pilot, first run it without `--apply`:

```sh
node --import tsx tools/church-cloud-setup.ts --project praiseav-suite --church "PraiseAV pilot" --owner "one.mad.punk@gmail.com" --location europe-west2
```

The location is used **only if the default Firestore database does not already exist**. Its selection cannot be changed later. Before a live run, verify that this is the location the project owner wants. Then run the same command with `--apply`. The Firebase CLI must already be installed and authenticated as the project owner. This is a developer pilot, so do not send these command instructions to ordinary church users.

The helper generates the security rules from the Suite's `churchRules` source, creates a missing web app, and deploys only Auth and Firestore rules. The official Firestore deployment also enables the Firestore API and creates a missing default Standard database in the chosen location. Existing databases and apps are reused. The helper saves the public Web app configuration to a temporary file. It does not import church records or share them with PraiseAV.

## Live pilot result

On 2 November 2026, the helper was run with the project owner's CLI login against `praiseav-suite`. The official Firebase CLI created the default Standard Firestore database in London (`europe-west2`) on the free Spark plan and deployed the church-specific rules. A subsequent read-only `--inspect` recognized the existing web app and London database without creating a duplicate. The Firebase Console showed Google sign-in enabled and `onemadpunk.github.io` among authorised domains. Those two Auth settings had also been configured manually before this run, so this pilot does **not** prove that the helper enables them on a fresh project.

## Verification still required

- Confirm whether the CLI's `authorizedRedirectUris` also adds the Suite's website to **Authentication → Settings → Authorized domains**. These are distinct settings in Firebase and must be checked in the console. The pilot's domain is `onemadpunk.github.io`; `suite.praiseav.com` would be used after that site is live.
- Confirm Google sign-in, administrator access, ordinary-user denial, and role approval in the Suite against the pilot Firestore database.
- Confirm the Auth provisioning and domain registration on a completely fresh project. Unit tests use a simulated CLI and do not establish this.
- Review the Store packaging and licence notices before distributing a setup companion. Google's standalone Windows CLI can avoid requiring churches to install Node. Do not make the Store application silently download an executable at runtime.
- Provide a church-facing graphical flow, clear consent, status, and recovery. This developer command is only the provisioning core.

The project owner can revoke the CLI's Google access at any time. Do not check Firebase CLI credentials, temporary configuration files, or any church data into Git.
