// src/index.js
require('dotenv').config();
const client = require('./config/client');
const registerEvents = require('./events');
const registerCommands = require('./commands');

// Chargement des events (ready, interaction, etc.)
registerEvents(client);

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
