# PraiseAV Suite hosting

The existing PraiseAV Suite runs at https://praiseav-suite.web.app/ on Firebase project `praiseav-suite`. The project is on the no-cost Spark plan. Google sign-in, owner access, and an authenticated page reload were verified on 2 November 2026.

Build and deploy only the static Hosting files with:

```sh
npm run build
firebase deploy --config firebase.hosting.json --only hosting --project praiseav-suite
```

The Suite browser's Firebase Web configuration uses `praiseav-suite.web.app` as `authDomain`. The existing Google OAuth web client allows `https://praiseav-suite.web.app` as a JavaScript origin and `https://praiseav-suite.web.app/__/auth/handler` as a redirect URI. Firebase Authentication also lists `praiseav-suite.web.app` as an authorised domain.

The GitHub Pages build remains separate. It should not be presented as the verified Suite sign-in address until its Google login passes an end-to-end browser test.
