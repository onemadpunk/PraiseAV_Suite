# "Let the team know" emails

When a worship leader presses **Let the team know**, everyone on that service's rota sees a notice in the Suite. PraiseAV also emails them, through one small service that Steven runs for every church. A church's own Firebase is on the free plan, which can't send email, so churches set nothing up.

## How it decides who gets an email

The function `notifyTeamEmail` (`functions/`) runs in the `praiseav-suite` project and is reached at `/api/notify-team` on the Suite site. It sends only when all of these are true:

1. The church is **ready** in the PraiseAV church directory.
2. The caller is signed in with a **verified email** from that church's own Firebase project.
3. The caller can read the plan, using their own sign-in and the church's rules, and pressed Let the team know on it in the last 10 minutes. Only planners and worship leaders can write plans.
4. Each address belongs to someone on that plan's rota who hasn't been marked Declined. The check compares the address's SHA-256 fingerprint with the rota entry. Nobody else can be emailed.

The email is a fixed message: the church name, service, date, the person's roles, and the church's own Suite link. Replies go to the worship leader. The limits are:

- 40 people per send
- one send per service every 10 minutes
- 120 emails per church per day
- 280 emails per day in total, which keeps within Brevo's free 300

Email addresses are passed on to send each message and nothing else; only the daily counts are kept, in `mailLimits`.

## One-time setup (Steven)

1. **Firebase plan.** In the Firebase console, move `praiseav-suite` to the **Blaze** plan. Cloud Functions need it, even within the free allowance. Add a budget alert, for example £5 a month. At church volumes the cost should be £0.
2. **Mail account.** Create a free Brevo account and verify `praiseav.com` as a sending domain. Brevo gives you DNS records to add where the domain is managed. Then create an API key under **SMTP & API → API keys**.
3. **Store the key** (it is never committed):
   ```sh
   firebase functions:secrets:set BREVO_API_KEY --project praiseav-suite
   ```
4. **Deploy the function, then the site.** The function must come first, because the site's `/api/notify-team` points at it.
   ```sh
   cd functions && npm install && npm test && cd ..
   firebase deploy --config firebase.functions.json --only functions --project praiseav-suite
   npm run build
   firebase deploy --config firebase.hosting.json --only hosting --project praiseav-suite
   ```
   Emails are sent from `rota@praiseav.com`. To use another address on the verified domain, answer the `MAIL_FROM` prompt during deploy.

Until this is done, Let the team know still shows the notice in the Suite and tells the leader that emails couldn't be sent.
