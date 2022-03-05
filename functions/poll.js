const { MessageEmbed } = require('discord.js');

class PollManager {
    getNewPoll(title, creator, duration) {
        return new Poll(title, creator, duration);
    }

    startPoll(poll, channel, clientId) {
        channel.send({ embeds: [poll.getAsEmbed()] }).then(async message => {
            if (! await this.attachReactions(message, poll.pollOptions)) {
                return false;
            }

            poll.message = message;

            const filter = (reaction, user) => clientId !== user.id;
            const collector = message.createReactionCollector({ filter, time: 60000 * poll.duration });

            collector.on('collect', (reaction, user) => this.onReact(user, reaction, poll, message));
            collector.on('end', () => this.endPoll(poll));
        });
    }

    onReact(user, reaction, poll, message) {
        reaction.users.remove(user);

        poll.voteFor(reaction.emoji.toString(), user.id);
        poll.embed.setFields(poll.getEmbedRows());

        message.edit({ embeds: [poll.embed] });
    } 

    async endPoll(poll) {
        let highestVoteCount = 0;
        let tie = false;
        for (let pollOption in poll.pollOptions) {
            pollOption = poll.pollOptions[pollOption];
            if (pollOption.numVotes > highestVoteCount) {
                highestVoteCount = pollOption.numVotes;
                tie = false;
            } else if (pollOption.numVotes == highestVoteCount) {
                tie = true;
            }
        }

        let rows = [];
        let mostVoted = null;
        for (let pollOption in poll.pollOptions) {
            pollOption = poll.pollOptions[pollOption];
            if (pollOption.numVotes == highestVoteCount) {
                if (!tie) {
                    mostVoted = pollOption;
                }
                rows.push(pollOption.getAsRow());
            } else {
                rows.push(pollOption.getAsRowStrikethrough());
            }
        }

        poll.embed.setFields(rows);
        if (tie) {
            poll.embed.setDescription('Es gab einen Gleichstand');
        } else {
            poll.embed.setDescription(`Gewonnen hat "${mostVoted.title}" mit ${mostVoted.numVotes} ${mostVoted.numVotes == 1 ? 'Stimme' : 'Stimmen'}`);
        }

        await poll.message.reactions.removeAll();
        await poll.message.edit({ embeds: [poll.embed] });
    }

    async attachReactions(message, reactions) {
        try {
            for (let reaction in reactions) {
                await message.react(reactions[reaction].emoji);
            }
        } catch (exception) {
            //ToDo: Handle error
            return false;;
        }
        return true;
    }
}

class Poll {
    constructor(title, creator, duration) {
        this.title = title;
        this.creator = creator;
        this.duration = duration;

        this.pollOptions = {};
        this.votes = {};
    }

    getPollOption(emoji) {
        return this.pollOptions[emoji];
    }

    addPollOption(title, emoji) {
        if (emoji in this.pollOptions) {
            console.log(`Trying to add an invalid poll option: emoji already in use`);
            return false;
        }

        this.pollOptions[emoji] = new PollOption(title, emoji);
        return true;
    }

    voteFor(emoji, userId) {
        let votedOption = emoji in this.pollOptions ? this.pollOptions[emoji] : null;
        if (votedOption === null) {
            console.log(`User voted for an undefined poll option`);
            return false;
        }

        if (userId in this.votes) {
            let vote = this.votes[userId];
            vote.voteFor(votedOption);
        } else {
            let vote = this.votes[userId] = new Vote();
            vote.voteFor(votedOption);
        }
        return true;
    }

    getEmbedRows() {
        let rows = [];
        for (let pollOption in this.pollOptions) {
            rows.push(this.pollOptions[pollOption].getAsRow());
        }
        return rows;
    }

    getAsEmbed() {
        return this.embed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle(this.title)
                            .setDescription('Reagiere mit dem entsprechenden Emoji, um für eine Option abzustimmen')
                            .addFields(this.getEmbedRows())
                            .setTimestamp()
                            .setFooter(`Diese Abstimmung wurde von ${this.creator} gestartet`);
    }
}

class PollOption {
    constructor(title, emoji) {
        this.title = title;
        this.emoji = emoji;
        this.numVotes = 0;
    }

    getAsRow() {
        return {
            name: `${this.title} (${this.emoji})`, 
            value: this.numVotes == 1 ? '1 Vote' : `${this.numVotes} Votes`
        };
    }

    getAsRowStrikethrough() {
        return {
            name: `~~${this.title} (${this.emoji})~~`, 
            value: this.numVotes == 1 ? '~~1 Vote~~' : `~~${this.numVotes} Votes~~`
        };
    }
}

class Vote {
    constructor() {
        this.currentVote = undefined;
    }

    voteFor(newVote) {
        if (newVote === this.currentVote) {
            this.currentVote.numVotes--;
            this.currentVote = undefined;
            return;
        } else if (typeof this.currentVote !== 'undefined') {
            this.currentVote.numVotes--;
        }

        newVote.numVotes++;
        this.currentVote = newVote;
    }
}

module.exports = PollManager;