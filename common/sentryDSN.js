const domain = require("@exactly/common/domain");

const defaultDSN = "https://ac8875331e4cecd67dd0a7519a36dfeb@o1351734.ingest.us.sentry.io/4506186349674496";

module.exports =
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  {
    "web.exactly.app": defaultDSN,
    "sandbox.exactly.app": defaultDSN,
  }[domain];
