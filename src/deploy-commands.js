require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = "1544908713431932979";

if (!token || !clientId) {
  console.error("Faltan DISCORD_TOKEN y/o CLIENT_ID en las variables de entorno.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("✅ Registrados " + commands.length + " comandos exclusivamente en el servidor autorizado " + guildId + ".");
  } catch (error) {
    console.error("No se pudieron registrar los comandos:", error.message);
    process.exitCode = 1;
  }
})();
