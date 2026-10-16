const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "database.json");

const defaults = () => ({
  guilds: {},
  tickets: {},
  applications: {},
  customCommands: {}
});

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(defaults(), null, 2), "utf8");
}

function read() {
  ensureFile();
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      ...defaults(),
      ...raw,
      guilds: raw.guilds || {},
      tickets: raw.tickets || {},
      applications: raw.applications || {},
      customCommands: raw.customCommands || {}
    };
  } catch (error) {
    const backup = dataFile + ".corrupt-" + Date.now();
    try { fs.copyFileSync(dataFile, backup); } catch {}
    const fresh = defaults();
    fs.writeFileSync(dataFile, JSON.stringify(fresh, null, 2), "utf8");
    console.error("[storage] La base JSON estaba dañada; se guardó una copia en", backup, error.message);
    return fresh;
  }
}

function write(data) {
  ensureFile();
  const tempFile = dataFile + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempFile, dataFile);
}

function guildConfig(guildId) {
  const db = read();
  return db.guilds[guildId] || { language: "es" };
}

function updateGuildConfig(guildId, patch) {
  const db = read();
  db.guilds[guildId] = { language: "es", ...(db.guilds[guildId] || {}), ...patch };
  write(db);
  return db.guilds[guildId];
}

function getCustomCommands(guildId) {
  const db = read();
  return db.customCommands[guildId] || {};
}

function setCustomCommand(guildId, name, response) {
  const db = read();
  db.customCommands[guildId] ||= {};
  db.customCommands[guildId][name.toLowerCase()] = response;
  write(db);
}

function removeCustomCommand(guildId, name) {
  const db = read();
  const commands = db.customCommands[guildId] || {};
  const existed = Object.prototype.hasOwnProperty.call(commands, name.toLowerCase());
  delete commands[name.toLowerCase()];
  db.customCommands[guildId] = commands;
  write(db);
  return existed;
}

function createTicket(channelId, data) {
  const db = read();
  db.tickets[channelId] = { ...data, createdAt: new Date().toISOString() };
  write(db);
}

function getTicket(channelId) {
  return read().tickets[channelId] || null;
}

function deleteTicket(channelId) {
  const db = read();
  delete db.tickets[channelId];
  write(db);
}

function addApplication(application) {
  const db = read();
  const id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
  db.applications[id] = application;
  write(db);
  return id;
}

module.exports = {
  read, write, guildConfig, updateGuildConfig, getCustomCommands,
  setCustomCommand, removeCustomCommand, createTicket, getTicket,
  deleteTicket, addApplication
};
