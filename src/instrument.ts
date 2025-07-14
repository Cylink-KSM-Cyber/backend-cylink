const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Get environment-specific sampling rates
 * @returns Object containing traces and profile sampling rates
 */
function getSamplingRates() {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'production':
      return {
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% in production
        profileSessionSampleRate: parseFloat(process.env.SENTRY_PROFILE_SAMPLE_RATE || '0.1'), // 10% in production
      };
    case 'staging':
      return {
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.5'), // 50% in staging
        profileSessionSampleRate: parseFloat(process.env.SENTRY_PROFILE_SAMPLE_RATE || '0.5'), // 50% in staging
      };
    case 'development':
      return {
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'), // 100% in development
        profileSessionSampleRate: parseFloat(process.env.SENTRY_PROFILE_SAMPLE_RATE || '1.0'), // 100% in development
      };
    case 'test':
      return {
        tracesSampleRate: 0.0, // No sampling in test environment
        profileSessionSampleRate: 0.0,
      };
    default:
      return {
        tracesSampleRate: 0.1,
        profileSessionSampleRate: 0.1,
      };
  }
}

/**
 * Initialize Sentry with environment-specific configuration
 */
function initializeSentry() {
  const environment = process.env.NODE_ENV || 'development';
  const dsn = process.env.SENTRY_DSN;
  console.log(dsn);

  // Skip Sentry initialization in test environment or if DSN is not provided
  if (environment === 'test' || !dsn) {
    console.log(`Sentry initialization skipped for environment: ${environment}`);
    return;
  }

  const samplingRates = getSamplingRates();
  const release =
    process.env.SENTRY_RELEASE ||
    `${process.env.npm_package_name}@${process.env.npm_package_version}`;

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [nodeProfilingIntegration()],

    // Tracing configuration
    tracesSampleRate: samplingRates.tracesSampleRate,

    // Profiling configuration
    profileSessionSampleRate: samplingRates.profileSessionSampleRate,
    profileLifecycle: 'trace',

    // Privacy configuration
    sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',

    // Additional configuration
    beforeSend(event: any, _hint?: any) {
      // Add custom filtering logic if needed
      if (environment === 'development') {
        console.log('Sentry Event:', event.event_id, event.level, event.message);
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb: any, _hint?: any) {
      // Filter out sensitive breadcrumbs in production
      if (environment === 'production' && breadcrumb.category === 'http') {
        // Remove sensitive headers or data
        if (breadcrumb.data && breadcrumb.data.url) {
          breadcrumb.data.url = breadcrumb.data.url.replace(
            /(\?|&)(token|key|password)=[^&]*/gi,
            '$1$2=***',
          );
        }
      }
      return breadcrumb;
    },
  });

  console.log(`Sentry initialized for environment: ${environment}, release: ${release}`);
}

// Initialize Sentry
initializeSentry();

// Profiling happens automatically after setting it up with `Sentry.init()`.
// All spans (unless those discarded by sampling) will have profiling data attached to them.
