// src/index.js

// 1️⃣ Chargement de dotenv
import 'dotenv/config';

// 2️⃣ Augmentation du nombre maximal d’écouteurs d’événements
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 20;

// 3️⃣ Import des modules principaux (ajoute .js aux chemins relatifs)
import client from './config/client.js';
import registerEvents from './events/index.js';
import registerCommands from './commands/index.js';
import connectToMongoDB from './services/mongo.js';

// 4️⃣ Chargement des tâches cron (on exécute simplement ces modules)
import './cron/scheduler.js';
import './cron/updateStatsChannels.js';
import './cron/rotatePublication.js';
import './cron/checkMuleEligibility.js';
import './cron/genesisRoleSync.js';

// 5️⃣ Enregistrement des commandes et des events
registerCommands(client);
registerEvents(client);

// 6️⃣ Connexion du bot Discord
client.login(process.env.DISCORD_TOKEN);

// 7️⃣ Connexion à la base MongoDB
connectToMongoDB();
