const {
  Client,
  GatewayIntentBits,
  IntentsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const config = require("./config.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
const myIntents = new IntentsBitField();
myIntents.add(
  IntentsBitField.Flags.GuildPresences,
  IntentsBitField.Flags.GuildMembers,
  IntentsBitField.Flags.GuildVoiceStates,
  IntentsBitField.Flags.Guilds
);

const { Player, RepeatMode } = require("discord-music-player");
const player = new Player(client, {
  leaveOnEnd: true,
  leaveOnStop: true,
  leaveOnEmpty: true,
  volume: 100,
  quality: "high",
});
let interval = "";
let action_row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("next_song")
    .setLabel("Следующий трек")
    .setStyle("Primary"),
  new ButtonBuilder()
    .setCustomId("pause_song")
    .setLabel("Пауза")
    .setStyle("Primary"),
  new ButtonBuilder()
    .setCustomId("queue_song")
    .setLabel("Очередь")
    .setStyle("Primary"),
  new ButtonBuilder()
    .setCustomId("stop_q")
    .setLabel("Выключить муызку")
    .setStyle("Primary")
);
let action_row2 = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("repeat_song")
    .setLabel("Зациклить трек")
    .setStyle("Primary"),
  new ButtonBuilder()
    .setCustomId("repeat_queue")
    .setLabel("Зациклить очередь")
    .setStyle("Primary"),
  new ButtonBuilder()
    .setCustomId("shuffle_queue")
    .setLabel("Перемешать очередь")
    .setStyle("Primary")
);
// You can define the Player as *client.player* to easily access it.
client.player = player;
client.player.guilds = new Map();
client.player.intervals = new Map();
client.player.msgs_add = new Map();

async function send_add_song(queue, song) {
  const msg = client.player.guilds.get(queue.guild.id);
  if (!msg) return;
  const embed = new EmbedBuilder()
    .setTitle("Добавлено в очередь")
    .setDescription(`[${song.name}](${song.url})`);
  msg.channel.send({ embeds: [embed] }).then((new_msg) => {
    setTimeout(() => new_msg.delete().catch((err) => console.log(err)), 5000);
  });
}

async function send_add_playlist(queue, playlist) {
  const msg = client.player.guilds.get(queue.guild.id);
  if (!msg) return;
  const embed = new EmbedBuilder()
    .setTitle("Плелист добавлен в очередь")
    .setDescription(`${playlist}(${playlist.songs.length})`);
  msg.channel.send({ embeds: [embed] }).then((new_msg) => {
    setTimeout(() => new_msg.delete(), 5000);
  });
}

async function end_message(queue) {
  const msg = client.player.guilds.get(queue.guild.id);
  if (!msg) return;
  if (!queue.destroyed && queue.songs.length !== 0) {
    queue.setPaused(false);
  }
  if (!queue.destroyed) {
    // queue.leave();
    // queue.stop();
  }
  msg
    .edit({
      content:
        "``Очередь закончилась либо остановили воспроизведение, прекращаю играть музыку``",
      embeds: [],
      components: [],
    })
    .then(() => {
      client.player.guilds.delete(queue.guild.id);
      setTimeout(() => msg.delete().catch((err) => console.log(err)), 5000);
    });
}

async function update_msg(_queue, song) {
  const queue = client.player.getQueue(_queue.guild.id);
  if (queue) {
    if (queue.destroyed && queue.songs.length === 0) return end_message(queue);
    clearInterval(client.player.intervals.get(queue.guild.id));
    const msg = client.player.guilds.get(queue.guild.id);
    if (!msg) return;
    let mode = "";
    switch (queue.repeatMode) {
      case 0:
        mode = "OFF";
        break;
      case 1:
        mode = "SONG";
        break;
      case 2:
        mode = "QUEUE";
        break;
      default:
        break;
    }
    try {
      const ProgressBar = queue.createProgressBar();
      const options = {
        title: song.name,
        description: `${song.author}\nРежим повтора: ${mode}`,
        url: song.url,
        thumbnail: {
          url: song.thumbnail,
        },
        fields: [
          {
            name: "Статус",
            value: `\`\`${ProgressBar.prettier}\`\``,
          },
        ],
      };
      const embed = new EmbedBuilder(options);
      msg.edit({
        content: "Играю",
        embeds: [embed],
        components: [action_row, action_row2],
      });
    } catch (error) {
      const options = {
        title: song.name,
        description: `${song.author}\nРежим повтора: ${mode}`,
        url: song.url,
        thumbnail: {
          url: song.thumbnail,
        },
      };
      const embed = new EmbedBuilder(options);
      msg.edit({ content: "Играю", embeds: [embed] });
    }
  }
}

async function get_queue(queue) {
  const embed = new EmbedBuilder().setTitle("Очередь");
  let description = "";
  for (let i = 0; i < queue.songs.length; i++) {
    if (i === 10) break;
    const song = queue.songs[i];
    description =
      `${description}\`\`${song.name}\`\`` +
      ` - ${song.requestedBy.toString()}\n`;
  }
  embed.setDescription(description);
  embed.setFooter({
    text: `Всего треков ${queue.songs.length}`,
  });
  return embed;
}

// Init the event listener only once (at the top of your code).
client.player
  // Emitted when channel was empty.
  .on("channelEmpty", (queue) =>
    console.log(`Everyone left the Voice Channel, queue ended.`)
  )
  // Emitted when a song was added to the queue.
  .on("songAdd", async (queue, song) => {
    console.log(`Song ${song} was added to the queue.`);
    await send_add_song(queue, song);
  })
  // Emitted when a playlist was added to the queue.
  .on("playlistAdd", async (queue, playlist) => {
    console.log(
      `Playlist ${playlist} with ${playlist.songs.length} was added to the queue.`
    );
  })
  // Emitted when there was no more music to play.
  .on("queueDestroyed", async (queue) => {
    console.log(`The queue was destroyed.`);
    clearInterval(client.player.intervals.get(queue.guild.id));
    clearInterval(interval);
    client.player.intervals.delete(queue.guild.id);
    await end_message(queue);
  })
  // Emitted when the queue was destroyed (either by ending or stopping).
  .on("queueEnd", async (queue) => {
    console.log(`The queue has ended.`);
    clearInterval(client.player.intervals.get(queue.guild.id));
    client.player.intervals.delete(queue.guild.id);
    await end_message(queue);
  })
  // Emitted when a song changed.
  .on("songChanged", async (queue, newSong, oldSong) => {
    console.log(`${newSong} is now playing.`);
    clearInterval(client.player.intervals.get(queue.guild.id));
    await update_msg(queue, newSong);
  })
  // Emitted when a first song in the queue started playing.
  .on("songFirst", async (queue, song) => {
    console.log(`Started playing ${song}.`);
    await update_msg(queue, song);
  })
  // Emitted when someone disconnected the bot from the channel.
  .on("clientDisconnect", (queue) =>
    console.log(`I was kicked from the Voice Channel, queue ended.`)
  )
  // Emitted when deafenOnJoin is true and the bot was undeafened
  .on("clientUndeafen", async (queue) => {
    console.log(`I got undefeanded.`);
    queue.stop();
    clearInterval(client.player.intervals.get(queue.guild.id));
    client.player.intervals.delete(queue.guild.id);
    await end_message(queue);
  })
  .on("QUEUE_STOPPED", async (queue) => {
    clearInterval(client.player.intervals.get(queue.guild.id));
    client.player.intervals.delete(queue.guild.id);
    await end_message(queue);
  })
  // Emitted when there was an error in runtime
  .on("error", async (error, queue) => {
    console.log(`Error: ${error} in ${queue.guild.name}`);
    if (error.includes("Video") || error.includes("410")) {
      if (queue.songs.length === 1) {
        client.player.emit("QUEUE_STOPPED", queue);
      } else {
        queue.skip();
      }
      return;
    }
    clearInterval(client.player.intervals.get(queue.guild.id));
    client.player.intervals.delete(queue.guild.id);
    await end_message(queue);
  });

client.on("ready", () => {
  console.log("I am ready to Play with DMP 🎶");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const queue = client.player.getQueue(interaction.guild.id);
  if (!queue) {
    await interaction.message.delete();
    return interaction.reply({
      content: "Этот плеер устарел",
      ephemeral: true,
    });
  }
  const msg = client.player.guilds.get(queue.guild.id);
  if (!msg) {
    await interaction.message.delete();
    return interaction.reply({
      content: "Этот плеер устарел",
      ephemeral: true,
    });
  }
  if (msg.id !== interaction.message.id) {
    await interaction.message.delete();
    return interaction.reply({
      content: "Этот плеер устарел",
      ephemeral: true,
    });
  }
  switch (interaction.customId) {
    case "shuffle_queue":
      interaction.reply({ content: "``Перемешал``" }).then(() => {
        interaction.fetchReply().then((_msg) => {
          setTimeout(
            () => _msg.delete().catch((err) => console.log(err)),
            3000
          );
        });
      });
      queue.shuffle();
      break;
    case "repeat_song":
      if (queue.repeatMode === 1) {
        interaction
          .reply({ content: "``Выключил режим зацикливания трека``" })
          .then(() => {
            interaction.fetchReply().then((_msg) => {
              setTimeout(
                () => _msg.delete().catch((err) => console.log(err)),
                3000
              );
            });
            queue.setRepeatMode(RepeatMode.DISABLED);
            update_msg(queue, queue.nowPlaying);
          });
      } else {
        interaction.reply({ content: "``Зациклил трек``" }).then(() => {
          interaction.fetchReply().then((_msg) => {
            setTimeout(
              () => _msg.delete().catch((err) => console.log(err)),
              3000
            );
          });
          queue.setRepeatMode(RepeatMode.SONG);
          update_msg(queue, queue.nowPlaying);
        });
      }
      break;
    case "repeat_queue":
      if (queue.repeatMode === 2) {
        interaction
          .reply({ content: "``Выключил режим зацикливания очереди``" })
          .then(() => {
            interaction.fetchReply().then((_msg) => {
              setTimeout(
                () => _msg.delete().catch((err) => console.log(err)),
                3000
              );
            });
            queue.setRepeatMode(RepeatMode.DISABLED);
            update_msg(queue, queue.nowPlaying);
          });
      } else {
        interaction.reply({ content: "``Зациклил очередь``" }).then(() => {
          interaction.fetchReply().then((_msg) => {
            setTimeout(
              () => _msg.delete().catch((err) => console.log(err)),
              3000
            );
          });
          queue.setRepeatMode(RepeatMode.QUEUE);
          update_msg(queue, queue.nowPlaying);
        });
      }
      break;
    case "next_song":
      if (queue.songs.length === 1) {
        queue.stop();
        client.player.emit("QUEUE_STOPPED", queue);
      } else {
        interaction.reply({ content: "``Пропускаю трек``" }).then(() => {
          interaction.fetchReply().then((_msg) => {
            setTimeout(
              () => _msg.delete().catch((err) => console.log(err)),
              3000
            );
          });
        });
        queue.skip();
      }
      break;
    case "pause_song":
      if (queue.paused) {
        interaction
          .reply({ content: "``Начинаю воспроизведение``" })
          .then(() => {
            interaction.fetchReply().then((_msg) => {
              setTimeout(
                () => _msg.delete().catch((err) => console.log(err)),
                3000
              );
            });
          });
        queue.setPaused(false);
      } else {
        interaction
          .reply({ content: "``Останавливаю воспроизведение``" })
          .then(() => {
            interaction.fetchReply().then((_msg) => {
              setTimeout(
                () => _msg.delete().catch((err) => console.log(err)),
                3000
              );
            });
          });
        queue.setPaused(true);
      }
      break;
    case "queue_song":
      interaction.reply({ embeds: [await get_queue(queue)] }).then(() => {
        interaction.fetchReply().then((_msg) => {
          setTimeout(
            () => _msg.delete().catch((err) => console.log(err)),
            30 * 1000
          );
        });
      });
      break;
    case "stop_q":
      queue.stop();
      client.player.emit("QUEUE_STOPPED", queue);
      break;
    default:
      break;
  }
});

client.on("messageCreate", async (message) => {
  try {
    const validURL = (str) => {
      const regex =
        /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
      return regex.test(str);
    };
    const validURLPlaylist = (str) => {
      const regex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
      return regex.test(str);
    };

    const args = message.content
      .slice(config.prefix.length)
      .trim()
      .split(/ +/g);
    const command = args.shift();
    if (message.content.slice(0, config.prefix.length) !== config.prefix) {
      return;
    }
    let guildQueue = client.player.getQueue(message.guild.id);

    if (command === "help") {
      await message.delete();
      const embed = new EmbedBuilder();
      let description =
        "play || p - Воспроизвести песню или плейлист с ютуба\n";
      embed.setTitle("Помощь");
      embed.setDescription(description);
      message.channel.send({ embeds: [embed] }).then((new_msg) => {
        setTimeout(() => new_msg.delete(), 60 * 1000);
      });
    } else if (command === "play" || command === "p") {
      message.delete().catch((err) => console.log(err));
      console.log(args, validURL(args[0]), validURLPlaylist(args[0]));
      if (validURL(args[0]) && validURLPlaylist(args[0])) {
        let song_request = "";
        for (let i = 1; i < args.length; i++) {
          song_request = `${song_request} ${args[i]}`;
        }
        if (!guildQueue) {
          if (!message.member.voice.channel) {
            message.channel
              .send({ content: "``Вы не в голосовом канале``" })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          if (!message.member.voice.channel.joinable) {
            message.channel
              .send({
                content:
                  "``У бота нету прав подключаться к этому голосовому каналу``",
              })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          const queue = client.player.createQueue(message.guild.id);
          queue.join(message.member.voice.channel).then(() => {
            message.channel
              .send({ content: `Ищу трек по запросу \`\`${song_request}\`\`` })
              .then((new_msg) => {
                client.player.guilds.set(new_msg.guild.id, new_msg);
                queue
                  .playlist(args.join(" "), { requestedBy: message.member })
                  .then(async (song) => {
                    const embed = new EmbedBuilder()
                      .setTitle("Добавлен плелист в очередь")
                      .setDescription(`[${song.name}](${song.url})`);
                    message.channel
                      .send({ embeds: [embed] })
                      .then((_new_msg) => {
                        setTimeout(() => _new_msg.delete(), 5000);
                      });
                    interval = setInterval(
                      async () => await update_msg(queue, queue.nowPlaying),
                      1000
                    );
                  })
                  .catch((err) => {
                    message.channel
                      .send({ content: "Ошибка поиска трека" })
                      .then((new_msg2) => {
                        setTimeout(() => new_msg2.delete(), 5000);
                      });
                    const msg = client.player.guilds.get(message.guild.id);
                    msg.delete().catch((err2) => console.log(err2));
                    client.player.guilds.delete(message.guild.id);
                    clearInterval(client.player.intervals.get(queue.guild.id));
                    client.player.intervals.delete(queue.guild.id);
                    if (!queue) queue.stop();
                  });
              });
          });
        } else if (message.member.voice.channel) {
          guildQueue
            .playlist(args.join(" "), { requestedBy: message.member })
            .then(async (song) => {
              const embed = new EmbedBuilder()
                .setTitle("Добавлен плелист в очередь")
                .setDescription(`[${song.name}](${song.url})`);
              message.channel.send({ embeds: [embed] }).then((new_msg) => {
                setTimeout(() => new_msg.delete(), 5000);
              });
              interval = setInterval(
                async () => await update_msg(guildQueue, guildQueue.nowPlaying),
                1000
              );
            })
            .catch((err) => {
              message.channel
                .send({ content: "Ошибка поиска трека" })
                .then((new_msg2) => {
                  setTimeout(() => new_msg2.delete(), 5000);
                });
              if (!guildQueue) guildQueue.stop();
            });
        } else {
          message.channel
            .send({ content: "``Вы не в тоже в голосовом канале, что и бот``" })
            .then((new_msg2) => {
              setTimeout(() => new_msg2.delete(), 5000);
            });
        }
      } else if (validURL(args[0])) {
        let song_request = "";
        for (let i = 1; i < args.length; i++) {
          song_request = `${song_request} ${args[i]}`;
        }
        if (!guildQueue) {
          if (!message.member.voice.channel) {
            message.channel
              .send({ content: "``Вы не в голосовом канале``" })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          if (!message.member.voice.channel.joinable) {
            message.channel
              .send({
                content:
                  "``У бота нета прав подключаться к этому голосовому каналу``",
              })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          const queue = client.player.createQueue(message.guild.id);
          queue.join(message.member.voice.channel).then(() => {
            message.channel
              .send({ content: `Ищу трек по запросу \`\`${song_request}\`\`` })
              .then((new_msg) => {
                client.player.guilds.set(new_msg.guild.id, new_msg);
                queue
                  .play(song_request, { requestedBy: message.member })
                  .then(async (song) => {
                    interval = setInterval(
                      async () => await update_msg(queue, queue.nowPlaying),
                      1000
                    );
                  })
                  .catch((err) => {
                    message.channel
                      .send({ content: "Ошибка поиска трека" })
                      .then((new_msg2) => {
                        setTimeout(() => new_msg2.delete(), 5000);
                      });
                    const msg = client.player.guilds.get(message.guild.id);
                    msg.delete().catch((err2) => console.log(err2));
                    client.player.guilds.delete(message.guild.id);
                    clearInterval(client.player.intervals.get(queue.guild.id));
                    client.player.intervals.delete(queue.guild.id);
                    if (!queue) queue.stop();
                  });
              });
          });
        } else if (message.member.voice.channel) {
          guildQueue
            .play(song_request, { requestedBy: message.member })
            .then((song) => {
              const old_msg = client.player.guilds.get(message.guild.id);
              if (old_msg.channel.id !== message.channel.id) {
                const embed = new EmbedBuilder()
                  .setTitle("Добавлен трек в очередь")
                  .setDescription(`[${song.name}](${song.url})`);
                message.channel.send({ embeds: [embed] }).then((new_msg) => {
                  setTimeout(() => new_msg.delete(), 5000);
                });
                interval = setInterval(
                  async () =>
                    await update_msg(guildQueue, guildQueue.nowPlaying),
                  1000
                );
              }
            })
            .catch((err) => {
              message.channel
                .send({ content: "Ошибка поиска трека" })
                .then((new_msg2) => {
                  setTimeout(() => new_msg2.delete(), 5000);
                });
              if (!queue) queue.stop();
            });
        } else {
          message.channel
            .send({ content: "``Вы не в тоже в голосовом канале, что и бот``" })
            .then((new_msg2) => {
              setTimeout(() => new_msg2.delete(), 5000);
            });
        }
      } else {
        let song_request = "";
        for (let i = 1; i < args.length; i++) {
          song_request = `${song_request} ${args[i]}`;
        }
        if (!guildQueue) {
          if (!message.member.voice.channel) {
            message.channel
              .send({ content: "``Вы не в голосовом канале``" })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          if (!message.member.voice.channel.joinable) {
            message.channel
              .send({
                content:
                  "``У бота нета прав подключаться к этому голосовому каналу``",
              })
              .then((new_msg2) => {
                setTimeout(() => new_msg2.delete(), 5000);
              });
            return;
          }
          const queue = client.player.createQueue(message.guild.id);
          queue.join(message.member.voice.channel).then(() => {
            message.channel
              .send({ content: `Ищу трек по запросу \`\`${song_request}\`\`` })
              .then((new_msg) => {
                client.player.guilds.set(new_msg.guild.id, new_msg);
                queue
                  .play(song_request, { requestedBy: message.member })
                  .then(async (song) => {
                    interval = setInterval(
                      async () => await update_msg(queue, queue.nowPlaying),
                      1000
                    );
                  })
                  .catch((err) => {
                    message.channel
                      .send({ content: "Ошибка поиска трека" })
                      .then((new_msg2) => {
                        setTimeout(() => new_msg2.delete(), 5000);
                      });
                    const msg = client.player.guilds.get(message.guild.id);
                    msg.delete().catch((err2) => console.log(err2));
                    client.player.guilds.delete(message.guild.id);
                    clearInterval(client.player.intervals.get(queue.guild.id));
                    client.player.intervals.delete(queue.guild.id);
                    if (!queue) queue.stop();
                  });
              });
          });
        } else if (message.member.voice.channel) {
          guildQueue
            .play(song_request, { requestedBy: message.member })
            .then((song) => {
              const old_msg = client.player.guilds.get(message.guild.id);
              if (old_msg.channel.id !== message.channel.id) {
                const embed = new EmbedBuilder()
                  .setTitle("Добавлен трек в очередь")
                  .setDescription(`[${song.name}](${song.url})`);
                message.channel.send({ embeds: [embed] }).then((new_msg) => {
                  setTimeout(() => new_msg.delete(), 5000);
                });
                interval = setInterval(
                  async () =>
                    await update_msg(guildQueue, guildQueue.nowPlaying),
                  1000
                );
              }
            })
            .catch((err) => {
              message.channel
                .send({ content: "Ошибка поиска трека" })
                .then((new_msg2) => {
                  setTimeout(() => new_msg2.delete(), 5000);
                });
              if (!queue) queue.stop();
            });
        } else {
          message.channel
            .send({ content: "``Вы не в тоже в голосовом канале, что и бот``" })
            .then((new_msg2) => {
              setTimeout(() => new_msg2.delete(), 5000);
            });
        }
      }
      /*} else if (command === "defPlay" || command === "dp") {
      let queue = client.player.createQueue(message.guild.id);
      await queue.join(message.member.voice.channel);
      let song = await queue
        .play(args.join(" "), { requestedBy: message.member })
        .catch((err) => {
          console.log(err);
          if (!guildQueue) queue.stop();
        });
    } else if (command === "playlist" || command === "pl") {
      let queue = client.player.createQueue(message.guild.id);
      await queue.join(message.member.voice.channel);
      let song = await queue
        .playlist(args.join(" "), { requestedBy: message.member })
        .catch((err) => {
          console.log(err);
          if (!guildQueue) queue.stop();
        });*/
    } else if (command === "skip") {
      await message.delete();
      guildQueue.skip();
    } else if (command === "stop") {
      await message.delete();
      guildQueue.stop();
    } else if (command === "removeLoop") {
      guildQueue.setRepeatMode(RepeatMode.DISABLED); // or 0 instead of RepeatMode.DISABLED
    } else if (command === "toggleLoop") {
      guildQueue.setRepeatMode(RepeatMode.SONG); // or 1 instead of RepeatMode.SONG
    } else if (command === "toggleQueueLoop") {
      guildQueue.setRepeatMode(RepeatMode.QUEUE); // or 2 instead of RepeatMode.QUEUE
    } else if (command === "setVolume") {
      guildQueue.setVolume(parseInt(args[0]));
    } else if (command === "seek") {
      await guildQueue.seek(parseInt(args[0]) * 1000);
    } else if (command === "clearQueue") {
      await message.delete();
      guildQueue.clearQueue();
    } else if (command === "shuffle") {
      guildQueue.shuffle();
    } else if (command === "queue") {
      message.delete().catch((err) => console.log(err));
      if (!guildQueue) {
        message.channel
          .send({
            content:
              "В настоящее время ничего не воспроизводится и очередь пустая",
          })
          .then((msg) => {
            setTimeout(() => msg.delete(), 10000);
          });
      } else {
        const embed = new EmbedBuilder().setTitle("Очередь");
        let description = "";
        guildQueue.songs.forEach((song) => {
          description =
            `${description}\`\`${song.name}\`\`` +
            ` - ${song.requestedBy.toString()}\n`;
        });
        embed.setDescription(description);
        message.channel.send({ embeds: [embed] }).then((new_msg) => {
          setTimeout(() => new_msg.delete(), 60 * 1000);
        });
      }
    } else if (command === "getVolume") {
      console.log(guildQueue.volume);
    } else if (command === "nowPlaying") {
      console.log(`Now playing: ${guildQueue.nowPlaying || "nothing"}`);
    } else if (command === "pause") {
      guildQueue.setPaused(true);
    } else if (command === "resume") {
      guildQueue.setPaused(false);
    } else if (command === "remove") {
      guildQueue.remove(parseInt(args[0]));
    } else if (command === "createProgressBar") {
      const ProgressBar = guildQueue.createProgressBar();

      // [======>              ][00:35/2:20]
      console.log(ProgressBar.prettier);
    } else if (command === "createFishData") {
      let queue = player.getQueue(message.guild.id);
      let initMessage = queue.data.queueInitMessage;
      player.createQueue(message.guild.id, {
        data: {
          queueInitMessage: message,
          myObject: "this will stay with the queue :)",
          more: "add more... there are no limitations...",
        },
      });
      // Or by using
      queue.setData({
        whatever: "you want :D",
      });
      await initMessage.channel.send(`This message object is hold in Queue :D`);
    } else {
      console.log(`Command ${command} is undefined`);
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(config.token);
