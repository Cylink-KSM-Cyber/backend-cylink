// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://0a53e3aab0ee47fc0c39bb80f800b9e0@o4507860939767808.ingest.us.sentry.io/4509660359622656",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});