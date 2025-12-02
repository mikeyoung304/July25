/**
 * External service configuration
 * Uses environment variables with sensible defaults
 */
export const serviceConfig = {
  datadog: {
    apiUrl: process.env['DATADOG_API_URL'] || 'https://api.datadoghq.com',
    logsUrl: process.env['DATADOG_LOGS_URL'] || 'https://http-intake.logs.datadoghq.com'
  },
  newRelic: {
    metricsUrl: process.env['NEW_RELIC_METRICS_URL'] || 'https://metric-api.newrelic.com'
  }
} as const;
