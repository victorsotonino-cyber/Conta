require("dotenv").config();
const { REST, Routes } = require("discord.js");
const commands = require("./commands");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("Faltan DISCORD_TOKEN y/o CLIENT_ID en las variables de entorno.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log("✅ Registrados " + commands.length + " comandos en el servidor " + guildId + ".");
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log("✅ Registrados " + commands.length + " comandos globales. Su propagación puede tardar.");
    }
  } catch (error) {
    console.error("No se pudieron registrar los comandos:", error.message);
    process.exitCode = 1;
  }
})();
