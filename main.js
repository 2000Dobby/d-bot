//https://discord.com/api/oauth2/authorize?client_id=908296694758789131&permissions=399394470998&scope=bot%20applications.commands
// !poll Nachricht <:emoji1: - Wert1, :emoji2: - Wert2>

const { Client, Intents, MessageEmbed, Permissions } = require('discord.js');
const { token, version, prefix, pollDuration } = require('./config.json');
const PollManager = require('./functions/poll');

const pollManager = new PollManager();

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ] 
});

const commands = {
    poll: execute_poll
};


client.once('ready', () => {
    console.log(`D-Bot v${version} started and logged into the Discord API`);
});

client.on('messageCreate', message => {
    let author = message.member;
    let content = message.content.trim();

    if(content.startsWith(prefix) && author.id != client.user.id && author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {

        let firstSpace = content.indexOf(' ');

        let command = content.slice(1, firstSpace);
        let args = content.slice(firstSpace + 1).trim();

        if (command in commands) {
            commands[command](message, args);
        }
    }
});

client.login(token);


function execute_poll(msg, args) {
    let startOfReactions = args.indexOf('<');
    let pollTitle = args.slice(0, startOfReactions).trim();
    let reactions = args.slice(startOfReactions + 1, args.length - 1).split(',');

    let poll = pollManager.getNewPoll(pollTitle, msg.member.user.username, pollDuration);
    for (let reaction of reactions) {
        let parts = reaction.split('-');
        if (!poll.addPollOption(parts[1].trim(), parts[0].trim())) {
            //ToDo: Handle error
            return;
        }
    }

    msg.delete();
    pollManager.startPoll(poll, msg.channel, client.user.id);
}