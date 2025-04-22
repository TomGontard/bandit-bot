/* src/utils/commandWrapper.js */
import logger from './logger.js';

export default function wrapCmd(fn, name) {
  return async interaction => {
    try {
      await fn(interaction);
      logger.info(`[CMD] /${name} – ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`[CMD‑ERR] /${name} – ${err.message}`, err);
      throw err;
    }
  };
}
