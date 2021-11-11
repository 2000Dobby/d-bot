//https://discord.com/api/oauth2/authorize?client_id=908296694758789131&permissions=399394470998&scope=bot%20applications.commands

//Poll creation: "Poll: Nachricht des Polls [{:thumbsup:, Ja}{:thumbsdown:, Nein}]"
//Poll: Nachricht :thumbsup: Ja :thumbsdown: Nein

const { Client, Intents, MessageEmbed } = require('discord.js');
const { token, version } = require('./config.json');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log(`D-Bot v${version} started and logged into the Discord API`);
});

client.on('messageCreate', (message) => {
    let pollObject = {
        guildId: 0,
        channelId: 0,
        messageId: 0,
        name: '',
        reaction: '',
        votes: [],
    }

    let voteObject = {
        userId: 0,
        votedId: 0
    }

    let colonIndex = message.content.indexOf(':');

    let command = message.content.slice(0, colonIndex);
    let body = message.content.slice(colonIndex + 1);

    if(command === 'Poll' && command.length >= 1) {
        let nameOfPoll = body.slice(0, body.indexOf('[')).trim();
        let reactions = body.slice(body.indexOf('[') + 1, body.length - 1);

        let reactionList = [];
        let messageRows = [];

        do {
            let currentPart = reactions.slice(reactions.indexOf('{') + 1, reactions.indexOf('}')).trim();
            reactions = reactions.slice(reactions.indexOf('}') + 1).trim();

            if (currentPart !== '') {
                let re = getReaction(currentPart)
                reactionList.push(re);

                messageRows.push({
                    name: re.title,
                    value: '0 Abstimmungen'
                });
            }
        } while (reactions !== '');

        let botMsg = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(nameOfPoll)
            .setDescription('Reagiere mit dem entsprechenden Emoji, um abzustimmen')
            .addFields(messageRows)
            .setTimestamp()
            .setFooter('Diese Umfrage wurde automatisch generiert');

        message.channel.send({ embeds: [botMsg] }).then((msg) => {
            reactionList.forEach(element => {
                msg.react(element.emoji);
                
            });
        });
    
    }
});

client.login(token);

function getReaction(msg) {
    parts = msg.split(',');

    reaction = parts[0].trim();
    value = parts[1].trim();

    return {
        title: `${value}: ${reaction}`, 
        emoji: reaction
    };
}