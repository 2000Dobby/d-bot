//https://discord.com/api/oauth2/authorize?client_id=908296694758789131&permissions=399394470998&scope=bot%20applications.commands

//Poll creation: "Poll: Nachricht des Polls [{:thumbsup:, Ja}{:thumbsdown:, Nein}]"
// !poll Nachricht <:emoji1: - Wert1, :emoji2: - Wert2>


//  constants
const { Client, Intents, MessageEmbed } = require('discord.js');
const { token, version, prefix, pollDuration } = require('./config.json');

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ] 
});

const activePolls = {};
const commands = {
    poll: execute_poll
};


//  listeners
client.once('ready', () => {
    console.log(`D-Bot v${version} started and logged into the Discord API`);
});

client.on('messageCreate', message => {
    let author = message.member;
    let content = message.content.trim();

    if(author.id != client.user.id && content.startsWith(prefix)) {
        let firstSpace = content.indexOf(' ');

        let command = content.slice(1, firstSpace);
        let args = content.slice(firstSpace + 1).trim();

        if(command in commands) {
            commands[command](message, args);
        }
    }
});

client.login(token);


//  functions
function execute_poll(msg, args) {
    let startOfReactions = args.indexOf('<');

    let pollTitle = args.slice(0, startOfReactions);
    let reactions = args.slice(startOfReactions + 1, args.length - 1).split(',');

    let voteOptions = [];
    let messageRows = [];

    for(let i = 0; i < reactions.length; i++) {
        let reaction = getReaction(reactions[i], i);

        if(reaction) {
            voteOptions[i] = reaction;
            messageRows.push(reaction.messageRow);
        } else {
            return;
        }
    }

    activePolls[msg.id] = {
        title: pollTitle,
        options: voteOptions,
        votes: {}
    };

    let botMsg = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(pollTitle)
                .setDescription('Reagiere mit dem entsprechenden Emoji, um für eine Option abzustimmen')
                .addFields(messageRows)
                .setTimestamp()
                .setFooter('Diese Abstimmung wurde automatisch generiert');

    msg.channel.send({ embeds: [botMsg] }).then(async msg => {

        try {
            for(let element of voteOptions) {
                await msg.react(element.reaction);
            }
        } catch (exception) {
            console.log('Could not attach Reactions to poll');
            delete activePolls[msg.id];
        }

    });

    console.log('Created poll');

    let filter = (reaction, user) => user.id !== client.user.id;

    let collector = msg.createReactionCollector({ filter, time: 60000 * pollDuration });
    collector.on('collect', (reaction, user) => { /*collectReaction(reaction, msg, user)*/ console.log('collected reaction') });
    collector.on('end', () => { stopCollection(msg) });
}

function getReaction(msg, id) {
    parts = msg.split('-');

    if(parts.length == 2) {
        let reaction = parts[0].trim();
        let option = parts[1].trim();

        return {
            id: id,
            reaction: reaction,
            text: option,
            numVotes: 0,
            messageRow: {
                name: `${option}: ${reaction}`,
                value: '0 Votes'
            }
        };
    } else {
        return false;
    }
}

function collectReaction(reaction, message, user) {
    reaction.users.removeAll(user);

    let pollObject = activePolls[message.id];
    let pollOption = false;

    pollObject.options.forEach(element => {
        if(element.reaction === reaction.emoji.toString()) {
            pollOption = element;
            return;
        }
    });

    if(pollOption) {
        if(user.id in pollObject.votes) {
            let votedId = pollObject.votes[user.id];

            if(votedId === -1) {
                pollOption.numVotes++;
                pollObject.votes[user.id] = pollOption.id;
            } else if(votedId === pollOption.id) {
                pollOption.numVotes--;
                pollObject.votes[user.id] = -1;
            } else {
                pollObject.options[votedId].numVotes--;
                pollOption.numVotes++;

                pollObject.votes[user.id] = pollOption.id;
            }
        } else {
            pollObject.votes[user.id] = pollOption.id;

            pollOption.numVotes++;
        }

        pollOption.messageRow.value = pollOption.numVotes + ' Votes';
        displayChanges();
    }
}

function displayChanges(pollObject, message) {
    let rows = [];

    pollObject.options.forEach(element => {
        rows.push(element.messageRow);
    });

    let embed = new MessageEmbed()
                .setFields(rows);

    message.edit(embed);
}

function stopCollection(message) {
    let pollObject = activePolls[message.id];

    let tie = true;
    let highestVote = false;

    pollObject.options.forEach(element => {
        if(highestVote) {
            if(element.numVotes > highestVote.numVotes) {
                highestVote = element;
                tie = false;
            } else if (element.numVotes === highestVote.numVotes) {
                tie = true;
            }
        }
    });

    delete activePolls[message.id];

    let embed = new MessageEmbed();

    if(tie) {
        embed.setDescription('Es gab einen Gleichstand!');
    } else {
        embed.setDescription(`${highestVote.text} hat die Abstimmung gewonnen!`);
    }

    message.reactions.removeAll();
    message.edit(embed);
}