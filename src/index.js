require("dotenv").config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ChannelType
} = require("discord.js");
const config = require("./config");
const db = require("./storage");

// This bot is authorized to operate in one Discord server only.
const ALLOWED_GUILD_ID = "1544908713431932979";

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable.");
  process.exit(1);
}

const client = new Client({ intents: [
  GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent
], partials: [Partials.Channel, Partials.Message, Partials.GuildMember] });

const colors = { main: config.color || 0xBFC5D2, success: 0x43B581, warning: 0xFAA61A, danger: 0xED4245 };
const em = { ticket: config.emojis[2], support: config.emojis[3], verify: config.emojis[4], apply: config.emojis[5], bag: config.emojis[6], close: config.emojis[8] };

function embed(title, description, color = colors.main) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description)
    .setTimestamp().setFooter({ text: "NEXUS MARKET • Discord Store" });
}
function emojiData(value) {
  const m = String(value || "").match(/^<a?:([^:>]+):(\d+)>$/);
  return m ? { name: m[1], id: m[2], animated: String(value).startsWith("<a:") } : null;
}
function button(label, id, style, icon) {
  const b = new ButtonBuilder().setLabel(label).setCustomId(id).setStyle(style);
  const parsed = emojiData(icon);
  if (parsed) b.setEmoji(parsed);
  return b;
}
function english(guildId) { return db.guildConfig(guildId).language === "en"; }
function t(guildId, es, en) { return english(guildId) ? en : es; }
async function privateReply(i, content) {
  const payload = { content, ephemeral: true, allowedMentions: { parse: [] } };
  return i.replied || i.deferred ? i.followUp(payload) : i.reply(payload);
}
async function getMember(guild, user) { return guild.members.fetch(user.id).catch(() => null); }
async function logs(guild, title, text, color = colors.main) {
  try {
    const cfg = db.guildConfig(guild.id);
    const id = cfg.logChannelId || config.channels.logs;
    const channel = id && await guild.channels.fetch(id).catch(() => null);
    if (channel && channel.isTextBased()) await channel.send({ embeds: [embed(title, text, color)], allowedMentions: { parse: [] } });
  } catch (e) { console.warn("[logs]", e.message); }
}
async function panel(interaction, targetId, payload, missing) {
  const target = targetId ? await interaction.guild.channels.fetch(targetId).catch(() => null) : interaction.channel;
  if (!target || !target.isTextBased() || !target.send) return privateReply(interaction, missing);
  try { await target.send(payload(true)); }
  catch (e) {
    await target.send(payload(false));
  }
  return privateReply(interaction, t(interaction.guildId, "Panel publicado en " + target.toString(), "Panel posted in " + target.toString()));
}
function ticketComponents(useCustomEmoji) {
  return [new ActionRowBuilder().addComponents(
    button("Soporte / Support", "ticket:open:support", ButtonStyle.Primary, useCustomEmoji ? em.support : null),
    button("Comprar / Purchase", "ticket:open:purchase", ButtonStyle.Success, useCustomEmoji ? em.bag : null),
    button("Otros / Other", "ticket:open:other", ButtonStyle.Secondary, useCustomEmoji ? em.ticket : null)
  )];
}
async function openTicket(i, category) {
  const guild = i.guild;
  const openCount = [...guild.channels.cache.values()].filter(c => {
    const r = db.getTicket(c.id);
    return r && r.ownerId === i.user.id && r.guildId === guild.id && r.status === "open";
  }).length;
  if (openCount >= config.limits.openTicketsPerUser) return privateReply(i, t(guild.id, "Solo puedes tener 2 tickets abiertos a la vez.", "You can have only 2 open tickets at a time."));
  const slug = i.user.username.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "usuario";
  const categoryName = { support: t(guild.id, "soporte", "support"), purchase: t(guild.id, "compra", "purchase"), other: t(guild.id, "otros", "other") }[category] || "ticket";
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] },
    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels] }
  ];
  if (config.roles.staff && guild.roles.cache.has(config.roles.staff)) overwrites.push({
    id: config.roles.staff, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
  });
  const parent = process.env.TICKET_CATEGORY_ID;
  let channel;
  try {
    channel = await guild.channels.create({
      name: (categoryName + "-" + slug).slice(0, 90), type: ChannelType.GuildText,
      topic: "NEXUS_TICKET_OWNER=" + i.user.id + ";CATEGORY=" + category,
      permissionOverwrites: overwrites,
      ...(parent && guild.channels.cache.has(parent) ? { parent } : {})
    });
  } catch (e) {
    console.error("[tickets]", e.message);
    return privateReply(i, t(guild.id, "No pude crear el ticket. Revisa el permiso Administrar canales.", "Could not create the ticket. Check Manage Channels permission."));
  }
  db.createTicket(channel.id, { guildId: guild.id, ownerId: i.user.id, category, status: "open" });
  const staff = config.roles.staff && guild.roles.cache.has(config.roles.staff) ? " <@&" + config.roles.staff + ">" : "";
  const closeRow = new ActionRowBuilder().addComponents(button("Cerrar ticket / Close ticket", "ticket:close", ButtonStyle.Danger, em.close));
  const ticketEmbed = embed(t(guild.id, "Ticket creado", "Ticket created"),
    t(guild.id, "Hola " + i.user.toString() + ". Explica tu consulta y el equipo te responderá pronto.", "Hi " + i.user.toString() + ". Explain your request and the team will respond soon."))
    .addFields({ name: t(guild.id, "Categoría", "Category"), value: categoryName, inline: true });
  try {
    await channel.send({ content: i.user.toString() + staff, embeds: [ticketEmbed], components: [closeRow],
      allowedMentions: { users: [i.user.id], roles: config.roles.staff ? [config.roles.staff] : [] } });
  } catch (e) {
    console.warn("[tickets] Initial message with custom emoji failed:", e.message);
    const plainClose = new ActionRowBuilder().addComponents(button("Cerrar ticket / Close ticket", "ticket:close", ButtonStyle.Danger));
    await channel.send({
      content: i.user.toString() + staff, embeds: [ticketEmbed], components: [plainClose],
      allowedMentions: { users: [i.user.id], roles: config.roles.staff ? [config.roles.staff] : [] }
    }).catch(error => console.warn("[tickets] Could not send fallback close button:", error.message));
  }
  await i.reply({ content: t(guild.id, "Tu ticket: ", "Your ticket: ") + channel.toString(), ephemeral: true });
  await logs(guild, "Ticket abierto", i.user.tag + " abrió #" + channel.name, colors.success);
}
async function closeTicket(i) {
  const ticket = db.getTicket(i.channelId);
  if (!ticket) return privateReply(i, "Este canal no está registrado como ticket.");
  const member = await getMember(i.guild, i.user);
  const staff = member && (member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    (config.roles.staff && member.roles.cache.has(config.roles.staff)));
  if (i.user.id !== ticket.ownerId && !staff) return privateReply(i, t(i.guildId, "Solo quien abrió el ticket o el staff puede cerrarlo.", "Only the ticket owner or staff can close this ticket."));
  await privateReply(i, t(i.guildId, "El ticket se cerrará en 5 segundos.", "This ticket will close in 5 seconds."));
  const channel = i.channel;
  setTimeout(async () => {
    try { await logs(i.guild, "Ticket cerrado", "#" + channel.name + " fue cerrado por " + i.user.tag); db.deleteTicket(channel.id); await channel.delete(); }
    catch (e) { console.warn("[tickets] Close failed:", e.message); }
  }, config.limits.closeDelayMs);
}
function applicationModal() {
  const modal = new ModalBuilder().setCustomId("application:submit").setTitle("NEXUS MARKET • Postulación");
  const items = [
    ["app_name", "Nombre / usuario de Discord", "Tu usuario", TextInputStyle.Short, 100],
    ["app_age", "Edad", "Tu edad", TextInputStyle.Short, 20],
    ["app_country", "País y zona horaria", "País / UTC", TextInputStyle.Short, 100],
    ["app_experience", "Experiencia y disponibilidad", "Experiencia, horarios y habilidades", TextInputStyle.Paragraph, 800],
    ["app_motivation", "¿Por qué quieres entrar al equipo?", "Cómo contribuirías al servidor", TextInputStyle.Paragraph, 800]
  ];
  for (const [id, label, placeholder, style, max] of items) {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(style).setRequired(true).setMaxLength(max)
    ));
  }
  return modal;
}
async function moderate(interaction, targetUser) {
  const guild = interaction.guild;
  const actor = await getMember(guild, interaction.user);
  const target = await getMember(guild, targetUser);
  if (!actor || !target) { await privateReply(interaction, "No encontré al usuario en el servidor."); return null; }
  if (target.id === interaction.user.id || target.id === guild.ownerId || target.id === client.user.id) {
    await privateReply(interaction, "No puedes moderar a ese usuario."); return null;
  }
  if (interaction.user.id !== guild.ownerId && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    await privateReply(interaction, "Tu rol debe estar por encima del rol del usuario."); return null;
  }
  return target;
}

async function command(i) {
  const guild = i.guild, id = guild.id, user = i.user;
  switch (i.commandName) {
    case "ping":
      return i.reply({ embeds: [embed("Pong!", "API: " + Math.round(client.ws.ping) + " ms")] });
    case "help":
      return privateReply(i, "NEXUS MARKET • Comandos / Commands\nUtilidad: /ping, /avatar, /userinfo, /serverinfo, /stats\nModeración: /ban, /kick, /timeout, /untimeout, /clear\nTienda: /ticket-panel, /verify-panel, /application-panel\nConfiguración: /welcome-channel, /language, /custom-command, /say\nPrefijo: !help, !ping, !say");
    case "avatar": {
      const u = i.options.getUser("usuario") || user;
      const url = u.displayAvatarURL({ extension: "png", size: 1024 });
      return i.reply({ embeds: [embed("Avatar • " + u.tag, "[Abrir imagen / Open image](" + url + ")").setImage(url)] });
    }
    case "userinfo": {
      const u = i.options.getUser("usuario") || user, m = await getMember(guild, u);
      return i.reply({ embeds: [embed("Usuario / User • " + u.tag, "ID: " + u.id +
        "\nCuenta creada / Account created: <t:" + Math.floor(u.createdTimestamp / 1000) + ":F>" +
        "\nEntró / Joined: " + (m && m.joinedTimestamp ? "<t:" + Math.floor(m.joinedTimestamp / 1000) + ":F>" : "—") +
        "\nRoles: " + (m ? m.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).slice(0, 12).join(", ") || "—" : "—"))
        .setThumbnail(u.displayAvatarURL({ size: 256 }))] });
    }
    case "serverinfo":
      return i.reply({ embeds: [embed("Servidor / Server • " + guild.name, "Miembros / Members: " + guild.memberCount +
        "\nCanales / Channels: " + guild.channels.cache.size + "\nRoles: " + guild.roles.cache.size +
        "\nCreado / Created: <t:" + Math.floor(guild.createdTimestamp / 1000) + ":D>\nID: " + guild.id).setThumbnail(guild.iconURL({ size: 256 }))] });
    case "stats":
      return i.reply({ embeds: [embed("Estadísticas / Statistics • " + guild.name,
        "Miembros / Members: " + guild.memberCount + "\nCanales / Channels: " + guild.channels.cache.size +
        "\nRoles: " + guild.roles.cache.size + "\nBoosts: " + (guild.premiumSubscriptionCount || 0))] });
    case "ban":
    case "kick": {
      const u = i.options.getUser("usuario", true), reason = i.options.getString("motivo") || "Sin motivo";
      const m = await moderate(i, u); if (!m) return;
      if (i.commandName === "ban") {
        if (!m.bannable) return privateReply(i, "Mi rol no puede banear a este usuario.");
        await m.ban({ reason: reason + " | " + user.tag });
      } else {
        if (!m.kickable) return privateReply(i, "Mi rol no puede expulsar a este usuario.");
        await m.kick(reason + " | " + user.tag);
      }
      await i.reply({ embeds: [embed(i.commandName.toUpperCase(), u.tag + "\nMotivo / Reason: " + reason, colors.danger)] });
      return logs(guild, i.commandName.toUpperCase(), u.tag + " por " + user.tag + ". Motivo: " + reason, colors.danger);
    }
    case "timeout":
    case "untimeout": {
      const u = i.options.getUser("usuario", true), reason = i.options.getString("motivo") || "Sin motivo";
      const m = await moderate(i, u); if (!m) return;
      if (!m.moderatable) return privateReply(i, "Mi rol no puede modificar el timeout de ese usuario.");
      if (i.commandName === "timeout") await m.timeout(i.options.getInteger("minutos", true) * 60000, reason + " | " + user.tag);
      else await m.timeout(null, reason + " | " + user.tag);
      await i.reply({ embeds: [embed(i.commandName === "timeout" ? "Timeout" : "Timeout retirado / removed", u.tag + "\n" + reason, colors.warning)] });
      return logs(guild, i.commandName, u.tag + " • " + reason, colors.warning);
    }
    case "clear": {
      const amount = i.options.getInteger("cantidad", true);
      const deleted = await i.channel.bulkDelete(amount, true);
      return privateReply(i, "Mensajes eliminados / Messages deleted: " + deleted.size);
    }
    case "ticket-panel":
      return panel(i, db.guildConfig(id).ticketPanelChannelId || "1544912257308303521", useEmoji => ({
        embeds: [embed("NEXUS MARKET • Tickets", t(id, "Abre un ticket privado para soporte, compras u otras consultas. No compartas contraseñas ni datos sensibles.", "Open a private ticket for support, purchases or other questions. Never share passwords or sensitive data."))],
        components: ticketComponents(useEmoji)
      }), "No encontré el canal de tickets; configura TICKET_PANEL_CHANNEL_ID.");
    case "verify-panel":
      return panel(i, null, useEmoji => ({
        embeds: [embed("NEXUS MARKET • Verificación", t(id, "Pulsa el botón para verificarte y acceder al servidor.", "Press the button to verify and access the server."))],
        components: [new ActionRowBuilder().addComponents(button("Verificarme / Verify me", "verify:complete", ButtonStyle.Success, useEmoji ? em.verify : null))]
      }), "Ejecuta este comando en un canal de texto.");
    case "application-panel":
      return panel(i, null, useEmoji => ({
        embeds: [embed("NEXUS MARKET • Postulaciones", t(id, "Pulsa para rellenar el formulario de postulación. El staff revisará tu solicitud.", "Press to fill out the application form. Staff will review your submission."))],
        components: [new ActionRowBuilder().addComponents(button("Postularme / Apply", "application:open", ButtonStyle.Primary, useEmoji ? em.apply : null))]
      }), "Ejecuta este comando en un canal de texto.");
    case "ticket-channel": {
      const ch = i.options.getChannel("canal", true);
      db.updateGuildConfig(id, { ticketPanelChannelId: ch.id });
      return privateReply(i, "Canal de tickets configurado / Ticket panel channel set: " + ch.toString());
    }
    case "logs-channel": {
      const ch = i.options.getChannel("canal", true);
      db.updateGuildConfig(id, { logChannelId: ch.id });
      return privateReply(i, "Canal de registros configurado / Logs channel set: " + ch.toString());
    }
    case "application-channel": {
      const ch = i.options.getChannel("canal", true);
      db.updateGuildConfig(id, { applicationChannelId: ch.id });
      return privateReply(i, "Canal de postulaciones configurado / Application channel set: " + ch.toString());
    }
    case "welcome-channel": {
      const ch = i.options.getChannel("canal", true);
      db.updateGuildConfig(id, { welcomeChannelId: ch.id });
      return privateReply(i, "Canal de bienvenida configurado / Welcome channel set: " + ch.toString());
    }
    case "language": {
      const lang = i.options.getString("idioma", true);
      db.updateGuildConfig(id, { language: lang });
      return privateReply(i, lang === "en" ? "Language set to English." : "Idioma configurado en español.");
    }
    case "custom-command": {
      const sub = i.options.getSubcommand();
      if (sub === "add") {
        const name = i.options.getString("nombre", true).toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (name.length < 2) return privateReply(i, "Usa un nombre de al menos 2 caracteres: letras, números, - o _.");
        db.setCustomCommand(id, name, i.options.getString("respuesta", true));
        return privateReply(i, "Comando creado / Command created: " + config.prefix + name);
      }
      if (sub === "remove") return privateReply(i, db.removeCustomCommand(id, i.options.getString("nombre", true)) ? "Comando eliminado / Command removed." : "No existe ese comando / Command not found.");
      const names = Object.keys(db.getCustomCommands(id));
      return privateReply(i, names.length ? names.map(n => config.prefix + n).join(", ") : "Aún no hay comandos personalizados / No custom commands yet.");
    }
    case "say": {
      const text = i.options.getString("mensaje", true), channel = i.options.getChannel("canal") || i.channel;
      if (!channel || !channel.isTextBased() || !channel.send) return privateReply(i, "Ese canal no admite mensajes.");
      await channel.send({ content: text, allowedMentions: { parse: [] } });
      return privateReply(i, "Mensaje enviado / Message sent: " + channel.toString());
    }
  }
}

client.on("interactionCreate", async i => {
  try {
    if (i.guildId && i.guildId !== ALLOWED_GUILD_ID) {
      if (i.isRepliable()) await privateReply(i, "Este bot solo está disponible en su servidor autorizado.");
      return;
    }
    if (i.isChatInputCommand()) return i.guild ? await command(i) : privateReply(i, "Usa este comando en un servidor.");
    if (i.isButton() && i.guild) {
      if (i.customId.startsWith("ticket:open:")) return openTicket(i, i.customId.split(":")[2]);
      if (i.customId === "ticket:close") return closeTicket(i);
      if (i.customId === "verify:complete") {
        const roleId = config.roles.verified;
        if (!roleId) return privateReply(i, "Falta configurar VERIFIED_ROLE_ID en el hosting.");
        const role = await i.guild.roles.fetch(roleId).catch(() => null), member = await getMember(i.guild, i.user);
        if (!role || !member) return privateReply(i, "No encuentro el rol de verificación. Revisa VERIFIED_ROLE_ID.");
        if (member.roles.cache.has(role.id)) return privateReply(i, "Ya estás verificado / Already verified.");
        await member.roles.add(role, "NEXUS MARKET verification");
        if (config.roles.unverified && member.roles.cache.has(config.roles.unverified)) await member.roles.remove(config.roles.unverified).catch(() => null);
        await privateReply(i, "Verificación completada / Verification complete!");
        return logs(i.guild, "Verificación", i.user.tag + " se verificó.", colors.success);
      }
      if (i.customId === "application:open") return i.showModal(applicationModal());
    }
    if (i.isModalSubmit() && i.customId === "application:submit") {
      const val = key => i.fields.getTextInputValue(key).trim();
      const application = {
        guildId: i.guildId, userId: i.user.id, userTag: i.user.tag,
        name: val("app_name"), age: val("app_age"), country: val("app_country"),
        experience: val("app_experience"), motivation: val("app_motivation"),
        createdAt: new Date().toISOString(), status: "pending"
      };
      const appId = db.addApplication(application);
      const cfg = db.guildConfig(i.guildId);
      const channelId = cfg.applicationChannelId || config.channels.applications || config.channels.logs;
      const channel = channelId && await i.guild.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const card = embed("Nueva postulación / New application • " + i.user.tag, "ID: " + appId)
          .addFields(
            { name: "Discord", value: application.name.slice(0, 100), inline: true },
            { name: "Edad / Age", value: application.age.slice(0, 100), inline: true },
            { name: "País / zona horaria", value: application.country.slice(0, 100), inline: true },
            { name: "Experiencia / Experience", value: application.experience.slice(0, 1024) },
            { name: "Motivación / Motivation", value: application.motivation.slice(0, 1024) }
          );
        await channel.send({ content: "<@" + i.user.id + ">", embeds: [card], allowedMentions: { users: [i.user.id] } });
      }
      return i.reply({ content: "Postulación enviada / Application submitted. ¡Gracias!", ephemeral: true });
    }
  } catch (e) {
    console.error("[interaction]", e);
    if (i.isRepliable()) { try { await privateReply(i, "Ocurrió un error. Revisa permisos, roles y configuración."); } catch {} }
  }
});

client.on("messageCreate", async message => {
  try {
    if (message.guild && message.guild.id !== ALLOWED_GUILD_ID) return;
    if (!message.guild || message.author.bot || !message.content.startsWith(config.prefix)) return;
    const tokens = message.content.slice(config.prefix.length).trim().split(/\s+/);
    const name = (tokens.shift() || "").toLowerCase(), args = tokens;
    if (name === "ping") return message.reply({ content: "Pong! " + Math.round(client.ws.ping) + " ms", allowedMentions: { repliedUser: false } });
    if (name === "help") return message.reply({ content: "NEXUS MARKET: /help, /ping, /avatar, /userinfo, /serverinfo, /stats, /ban, /kick, /timeout, /clear, /ticket-panel, /verify-panel, /application-panel, /custom-command. Prefijo: !ping, !help, !say.", allowedMentions: { repliedUser: false } });
    if (name === "say") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply("Necesitas el permiso Gestionar mensajes.");
      const text = args.join(" ").slice(0, 1900);
      if (!text) return message.reply("Uso: !say mensaje");
      await message.channel.send({ content: text, allowedMentions: { parse: [] } });
      return message.delete().catch(() => null);
    }
    if (name === "ban" || name === "kick") {
      const perm = name === "ban" ? PermissionsBitField.Flags.BanMembers : PermissionsBitField.Flags.KickMembers;
      if (!message.member.permissions.has(perm)) return message.reply("No tienes permiso para esta acción.");
      const targetUser = message.mentions.users.first();
      if (!targetUser) return message.reply("Uso: !" + name + " @usuario motivo");
      const target = await getMember(message.guild, targetUser);
      if (!target || target.id === message.author.id || target.id === message.guild.ownerId ||
        (message.author.id !== message.guild.ownerId && message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0)) {
        return message.reply("No puedo moderar a ese usuario por jerarquía o porque no lo encontré.");
      }
      const reason = args.slice(1).join(" ") || "Sin motivo";
      if (name === "ban") {
        if (!target.bannable) return message.reply("Mi rol no puede banear a ese usuario.");
        await target.ban({ reason: reason + " | " + message.author.tag });
      } else {
        if (!target.kickable) return message.reply("Mi rol no puede expulsar a ese usuario.");
        await target.kick(reason + " | " + message.author.tag);
      }
      await logs(message.guild, name.toUpperCase(), targetUser.tag + " — " + reason, colors.warning);
      return message.reply({ content: "Acción completada para " + targetUser.tag, allowedMentions: { repliedUser: false } });
    }
    const custom = db.getCustomCommands(message.guild.id);
    if (Object.prototype.hasOwnProperty.call(custom, name)) {
      return message.channel.send({ content: custom[name].slice(0, 1900), allowedMentions: { parse: [] } });
    }
  } catch (e) { console.error("[messageCreate]", e); }
});

client.on("guildMemberAdd", async member => {
  try {
    if (member.guild.id !== ALLOWED_GUILD_ID) return;
    const cfg = db.guildConfig(member.guild.id);
    const id = cfg.welcomeChannelId || config.channels.welcome;
    const channel = id && await member.guild.channels.fetch(id).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed("¡Bienvenido a NEXUS MARKET!", "Hola " + member.toString() + ", lee las normas y verifica tu cuenta para acceder al servidor.")
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields({ name: "Miembro / Member", value: String(member.guild.memberCount), inline: true })],
        allowedMentions: { users: [member.id] } });
    }
    await logs(member.guild, "Nuevo miembro / Member joined", member.user.tag, colors.success);
  } catch (e) { console.warn("[welcome]", e.message); }
});
client.on("guildMemberRemove", member => { if (member.guild.id === ALLOWED_GUILD_ID) return logs(member.guild, "Miembro salió / Member left", member.user.tag, colors.warning); });
client.on("guildCreate", async guild => {
  if (guild.id === ALLOWED_GUILD_ID) return;
  console.warn("[guild-guard] Leaving unauthorized server:", guild.id);
  try { await guild.leave(); }
  catch (e) { console.error("[guild-guard] Could not leave unauthorized server:", e.message); }
});

client.once("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    if (guild.id !== ALLOWED_GUILD_ID) {
      console.warn("[guild-guard] Leaving unauthorized server:", guild.id);
      await guild.leave().catch(e => console.error("[guild-guard] Could not leave server:", e.message));
    }
  }
  console.log("NEXUS MARKET online as " + client.user.tag + " for authorized server " + ALLOWED_GUILD_ID + ".");
  client.user.setPresence({ activities: [{ name: "NEXUS MARKET • /help", type: 3 }], status: "online" });
});
client.on("error", e => console.error("[discord.js]", e));
process.on("unhandledRejection", e => console.error("[unhandledRejection]", e));
client.login(process.env.DISCORD_TOKEN);
