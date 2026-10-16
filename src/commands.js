const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Comprueba la latencia del bot / Check bot latency"),
  new SlashCommandBuilder().setName("help").setDescription("Muestra todos los comandos / Show all commands"),
  new SlashCommandBuilder().setName("avatar").setDescription("Muestra el avatar de un usuario / Show a user's avatar")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario (opcional) / User (optional)").setRequired(false)),
  new SlashCommandBuilder().setName("userinfo").setDescription("Información de un usuario / User information")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario (opcional) / User (optional)").setRequired(false)),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Información del servidor / Server information"),
  new SlashCommandBuilder().setName("stats").setDescription("Estadísticas actuales del servidor / Current server statistics"),
  new SlashCommandBuilder().setName("ban").setDescription("Expulsa permanentemente a un usuario / Ban a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName("usuario").setDescription("Usuario que será expulsado / Member to ban").setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo / Reason").setMaxLength(400).setRequired(false)),
  new SlashCommandBuilder().setName("kick").setDescription("Expulsa a un usuario del servidor / Kick a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName("usuario").setDescription("Usuario que será expulsado / Member to kick").setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo / Reason").setMaxLength(400).setRequired(false)),
  new SlashCommandBuilder().setName("timeout").setDescription("Aplica un timeout a un usuario / Timeout a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("usuario").setDescription("Usuario / Member").setRequired(true))
    .addIntegerOption(o => o.setName("minutos").setDescription("Duración en minutos (1–40320) / Duration").setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo / Reason").setMaxLength(400).setRequired(false)),
  new SlashCommandBuilder().setName("untimeout").setDescription("Retira el timeout de un usuario / Remove a timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName("usuario").setDescription("Usuario / Member").setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo / Reason").setMaxLength(400).setRequired(false)),
  new SlashCommandBuilder().setName("clear").setDescription("Borra mensajes recientes / Delete recent messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad (1–100) / Amount").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("ticket-panel").setDescription("Publica el panel de tickets / Post the ticket panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName("verify-panel").setDescription("Publica el panel de verificación / Post the verification panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName("application-panel").setDescription("Publica el panel de postulaciones / Post the application panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName("welcome-channel").setDescription("Configura el canal de bienvenida / Configure welcome channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o => o.setName("canal").setDescription("Canal de bienvenida / Welcome channel").addChannelTypes(ChannelType.GuildText).setRequired(true)),
  new SlashCommandBuilder().setName("language").setDescription("Cambia el idioma de respuestas / Change response language")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName("idioma").setDescription("Idioma / Language").setRequired(true)
      .addChoices({ name: "Español", value: "es" }, { name: "English", value: "en" })),
  new SlashCommandBuilder().setName("custom-command").setDescription("Administra comandos personalizados / Manage custom commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName("add").setDescription("Crea un comando / Add a custom command")
      .addStringOption(o => o.setName("nombre").setDescription("Nombre sin prefijo / Name without prefix").setMinLength(2).setMaxLength(32).setRequired(true))
      .addStringOption(o => o.setName("respuesta").setDescription("Respuesta del bot / Bot response").setMinLength(1).setMaxLength(1800).setRequired(true)))
    .addSubcommand(s => s.setName("remove").setDescription("Elimina un comando / Remove a custom command")
      .addStringOption(o => o.setName("nombre").setDescription("Nombre del comando / Command name").setRequired(true)))
    .addSubcommand(s => s.setName("list").setDescription("Lista los comandos personalizados / List custom commands")),
  new SlashCommandBuilder().setName("say").setDescription("Envía un mensaje como el bot / Send a message as the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName("mensaje").setDescription("Mensaje / Message").setMinLength(1).setMaxLength(1900).setRequired(true))
    .addChannelOption(o => o.setName("canal").setDescription("Canal de destino (opcional) / Destination channel").addChannelTypes(ChannelType.GuildText).setRequired(false))
].map(command => command.toJSON());

module.exports = commands;
