// src/index.js
require('dotenv').config();
const client = require('./config/client');
const registerEvents = require('./events');
const registerCommands = require('./commands');
const connectToMongoDB = require('./services/mongo');
registerCommands(client);
+require('./cron/scheduler');
+require('./cron/twitterRelay');
+require('./cron/updateStatsChannels');
+require('./cron/rotatePublication');


// Chargement des events (ready, interaction, etc.)
registerEvents(client);
registerCommands(client);

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

// Connexion à la base de données MongoDB
connectToMongoDB();
