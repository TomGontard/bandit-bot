// src/events/index.js
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  const eventsPath = path.join(__dirname);
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file !== 'index.js');

  for (const file of eventFiles) {
    const event = require(`./${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
};
