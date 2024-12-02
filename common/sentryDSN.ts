import domain from "@exactly/common/domain";

const defaultDSN = "https://ac8875331e4cecd67dd0a7519a36dfeb@o1351734.ingest.us.sentry.io/4506186349674496";

export default process.env.EXPO_PUBLIC_SENTRY_DSN || // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing -- ignore empty string
  {
    "web.exactly.app": defaultDSN,
    "sandbox.exactly.app": defaultDSN,
  }[domain];
