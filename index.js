const {
  Client,
  GatewayIntentBits,
  IntentsBitField,
  EmbedBuilder,
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
  leaveOnEmpty: true,
  volume: 100,
  quality: "high",
});
// You can define the Player as *client.player* to easily access it.
client.player = player;

// Init the event listener only once (at the top of your code).
client.player
  // Emitted when channel was empty.
  .on("channelEmpty", (queue) =>
    console.log(`Everyone left the Voice Channel, queue ended.`)
  )
  // Emitted when a song was added to the queue.
  .on("songAdd", (queue, song) =>
    console.log(`Song ${song} was added to the queue.`)
  )
  // Emitted when a playlist was added to the queue.
  .on("playlistAdd", (queue, playlist) =>
    console.log(
      `Playlist ${playlist} with ${playlist.songs.length} was added to the queue.`
    )
  )
  // Emitted when there was no more music to play.
  .on("queueDestroyed", (queue) => console.log(`The queue was destroyed.`))
  // Emitted when the queue was destroyed (either by ending or stopping).
  .on("queueEnd", (queue) => console.log(`The queue has ended.`))
  // Emitted when a song changed.
  .on("songChanged", (queue, newSong, oldSong) =>
    console.log(`${newSong} is now playing.`)
  )
  // Emitted when a first song in the queue started playing.
  .on("songFirst", (queue, song) => console.log(`Started playing ${song}.`))
  // Emitted when someone disconnected the bot from the channel.
  .on("clientDisconnect", (queue) =>
    console.log(`I was kicked from the Voice Channel, queue ended.`)
  )
  // Emitted when deafenOnJoin is true and the bot was undeafened
  .on("clientUndeafen", (queue) => console.log(`I got undefeanded.`))
  // Emitted when there was an error in runtime
  .on("error", (error, queue) => {
    console.log(`Error: ${error} in ${queue.guild.name}`);
  });

client.on("ready", () => {
  console.log("I am ready to Play with DMP 🎶");
});

client.on("messageCreate", async (message) => {
  try {
    const validURL = (str) => {
      const regex =
        /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
      if (!regex.test(str)) {
        return false;
      } else {
        return true;
      }
    };
    const validURLPlaylist = (str) => {
      const regex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
      if (!regex.test(str)) {
        return false;
      } else {
        return true;
      }
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
      let queue = client.player.createQueue(message.guild.id);
      console.log(args, validURL(args[0]), validURLPlaylist(args[0]));
      if (validURL(args[0]) && validURLPlaylist(args[0])) {
        await queue.join(message.member.voice.channel);
        let song = await queue
          .playlist(args.join(" "), { requestedBy: message.member })
          .catch((err) => {
            console.log(err);
            if (!guildQueue) queue.stop();
          });
      } else if (validURL(args[0])) {
        await queue.join(message.member.voice.channel);
        let song = await queue
          .play(args.join(" "), { requestedBy: message.member })
          .catch((err) => {
            console.log(err);
            if (!guildQueue) queue.stop();
          });
      }
    } else if (command === "defPlay" || command === "dp") {
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
        });
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
