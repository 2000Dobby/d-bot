//https://discord.com/api/oauth2/authorize?client_id=908296694758789131&permissions=399394470998&scope=bot%20applications.commands

// !poll Nachricht <:emoji1: - Wert1, :emoji2: - Wert2>


//  constants
const { Client, Intents, MessageEmbed, Permissions } = require('discord.js');
const { token, version, prefix, pollDuration } = require('./config.json');

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ] 
});

const activePolls = [];
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

    if(content.startsWith(prefix) && author.id != client.user.id && author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {

        let firstSpace = content.indexOf(' ');

        let command = content.slice(1, firstSpace);
        let args = content.slice(firstSpace + 1).trim();

        if(command in commands) {
            commands[command](message, args);
        }

        message.delete();
    }
});

client.login(token);


//  functions
function execute_poll(msg, args) {
    let startOfReactions = args.indexOf('<');

    let pollTitle = args.slice(0, startOfReactions).trim();
    let reactions = args.slice(startOfReactions + 1, args.length - 1).split(',');

    let emojis = [];
    let voteOptions = [];
    let messageRows = [];

    for(let i = 0; i < reactions.length; i++) {
        let reaction = getReaction(reactions[i], i);

        if(reaction) {
            emojis[i] = reaction.reaction;
            voteOptions[i] = reaction;
            messageRows.push(reaction.messageRow);
        } else {
            return;
        }
    }

    let botMsg = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(pollTitle)
                .setDescription('Reagiere mit dem entsprechenden Emoji, um für eine Option abzustimmen')
                .addFields(messageRows)
                .setTimestamp()
                .setFooter('Diese Abstimmung wurde von ' + msg.member.user.username + ' gestartet');

    msg.channel.send({ embeds: [botMsg] }).then(async pollMessage => {
        try {
            for(let element of voteOptions) {
                await pollMessage.react(element.reaction);
            }
        } catch (exception) {
            console.log('Could not attach Reactions to poll');
            pollMessage.delete();
            return;
        }

        activePolls[pollMessage.id] = {
            title: pollTitle,
            options: voteOptions,
            embed: botMsg,
            votes: {}
        };

        console.log(`${message.member.username} hat eine Umfrage "${pollTitle}" gestartet, die ${pollDuration} Minuten aktiv ist`)

        const filter = (reaction, user) => client.user.id !== user.id;
        const collector = pollMessage.createReactionCollector({ filter, time: 60000 * pollDuration });

        collector.on('collect', (reaction, user) => collectReaction(reaction, pollMessage, user));
        collector.on('end', () => stopCollection(pollMessage));
    });
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
    reaction.users.remove(user);

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
                let oldOption = pollObject.options[votedId];
                oldOption.messageRow.value = --oldOption.numVotes + ' Votes';

                pollOption.numVotes++;
                pollObject.votes[user.id] = pollOption.id;
            }
        } else {
            pollObject.votes[user.id] = pollOption.id;
            pollOption.numVotes++;
        }

        console.log(`Der Nutzer ${user.username} hat für die Option "${pollOption.text}" gestimmt`);

        pollOption.messageRow.value = pollOption.numVotes + ' Votes';
        displayChanges(pollObject, message);
    }
}

async function displayChanges(pollObject, message) {
    let rows = [];

    pollObject.options.forEach(element => {
        rows.push(element.messageRow);
    });

    pollObject.embed.setFields(rows);
    await message.edit({ embeds: [pollObject.embed] });
}

async function stopCollection(message) {
    let pollObject = activePolls[message.id];

    let tie = false;
    let highestVote = false;

    pollObject.options.forEach(element => {
        if(highestVote) {
            if(element.numVotes > highestVote.numVotes) {
                highestVote = element;
            } else if (element.numVotes === highestVote.numVotes) {
                tie = true;
            }
        } else {
            highestVote = element;
        }
    });

    let rows = [];
    pollObject.options.forEach(element => {
        if (element.numVotes !== highestVote.numVotes) {
            element.messageRow.name = `~~${element.messageRow.name}~~`;
            element.messageRow.value = `~~${element.messageRow.value}~~`;
        }

        rows.push(element.messageRow);
    });

    pollObject.embed.setFields(rows);
    if(tie) {
        pollObject.embed.setDescription('Es gab einen Gleichstand!');
        console.log(`Die Umfrage ${pollObject.title} wurde mit einem Gleichstand beendet`);
    } else {
        pollObject.embed.setDescription(`Der Gewinner der Abstimmung ist "${highestVote.text}" mit ${highestVote.numVotes} Stimmen`);
        console.log(`Die Umfrage ${pollObject.title} wurde mit beendet. Die Option "${highestVote.text}" hat mit ${highestVote.numVotes} Stimmen gewonnen`);
    }

    await message.reactions.removeAll();
    await message.edit({ embeds: [pollObject.embed] });

    delete activePolls[message.id];
}