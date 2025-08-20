import { logger } from '../services/logger'

export const logger = {
  info:  (...a:any[]) => logger.info('[info]',  ...a),
  warn:  (...a:any[]) => console.warn('[warn]',  ...a),
  error: (...a:any[]) => console.error('[error]', ...a),
  debug: (...a:any[]) => { if (process.env.DEBUG) logger.debug('[debug]', ...a); },
};
export default logger;