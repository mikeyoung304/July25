/**
 * DataDog RUM (Real User Monitoring) integration
 * Stub implementation - replace with actual DataDog SDK when ready
 */

export function initDataDog() {
  // Stub for DataDog initialization
  // Uncomment and configure when ready to integrate
  
  /*
  import { datadogRum } from '@datadog/browser-rum';
  
  datadogRum.init({
    applicationId: import.meta.env.VITE_DD_APP_ID,
    clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN,
    site: 'datadoghq.com',
    service: 'rebuild-client',
    env: import.meta.env.MODE,
    sessionSampleRate: 100,
    trackInteractions: true,
    trackResources: true,
    trackLongTasks: true,
  });
  
  datadogRum.startSessionReplayRecording();
  */
  
  // Mock DataDog global for development
  if (!window.DD_RUM) {
    window.DD_RUM = {
      addTiming: (name: string, value: number) => {
        console.log('[DataDog Mock] Timing:', name, value);
      },
      addAction: (name: string, context?: any) => {
        console.log('[DataDog Mock] Action:', name, context);
      },
      setUser: (user: any) => {
        console.log('[DataDog Mock] User:', user);
      },
    } as any;
  }
}

export function trackToDataDog(metric: any) {
  if (window.DD_RUM) {
    window.DD_RUM.addTiming(metric.name, metric.value);
  }
}