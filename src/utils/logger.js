// src/utils/logger.js
import 'dotenv/config'; // pour lire le .env
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { EmbedBuilder, Colors } from 'discord.js';
import client from '../config/client.js';

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // à définir dans .env

/* ───── Winston setup ───── */
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message }) =>
      `${timestamp} ${level.toUpperCase()} – ${message}`
    )
  ),
  transports: [
    new transports.Console({ format: format.colorize({ all: true }) }),
    new transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'bandit-bot-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      zippedArchive: false,
    }),
  ],
});

/* ───── Push sur Discord pour warn|error ───── */
async function pushDiscord(level, message, meta) {
  console.log(`[Logger] Attempting to push to Discord (${level}):`, message);

  if (!LOG_CHANNEL_ID) {
    console.warn('[Logger] LOG_CHANNEL_ID non défini.');
    return;
  }

  if (!client.isReady?.()) {
    console.warn('[Logger] Client non prêt au moment du push.');
    return;
  }

  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) {
      console.warn('[Logger] Channel introuvable.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(
        level === 'error' ? Colors.Red :
        level === 'warn'  ? Colors.Yellow :
                            Colors.Blurple
      )
      .setDescription(message.slice(0, 4000))
      .setTimestamp();

    if (meta?.stack) {
      embed.addFields({
        name: 'Stack',
        value: `\`\`\`${meta.stack.slice(0, 1000)}\`\`\``
      });
    }

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.warn('[Logger] ERREUR lors de l’envoi Discord ❌', e.message);
  }
}

/* ─── Routes Discord pour info|warn|error ─── */
/* ─── Patch : chaque appel logger.<lvl>() pousse aussi sur Discord ─── */
['info', 'warn', 'error'].forEach((lvl) => {
  const orig = logger[lvl].bind(logger);
  logger[lvl] = (...args) => {
    // 1) journalise normalement (console + fichier)
    orig(...args);

    // 2) envoie dans Discord
    const msg   = args[0] instanceof Error ? args[0].message : String(args[0]);
    const stack = args[0] instanceof Error ? args[0].stack   : undefined;
    pushDiscord(lvl, msg, { stack });
  };
});

export default logger;
