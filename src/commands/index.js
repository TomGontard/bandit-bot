// src/commands/index.js
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  client.commands = new Map();

  const commandsPath = path.join(__dirname);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./${file}`);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
};
