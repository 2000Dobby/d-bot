import { Message, MessageEmbed, EmbedFieldData, User, MessageReaction } from "discord.js"
const formatException = 'Das Format für Polls ist `!poll Zeit, "Titel", ["Emoji", "Name"(, "Beschreibung")] (, weitere Optionen)`'
//!poll 1, "Test Poll", ["👍 ", "Ja", "Sehr gute Entscheidung"], ["👎 ", "Nein", "Keine gute Entscheidung"]

export class PollManager {
    static startNewPoll(message: Message, content: string, clientId: string) {
        try {
            let args = JSON.parse(`[${ content }]`)
            if (args.length < 3) {
                PollManager.respondError(message, formatException)
                return
            }
    
            let time = parseInt(args[0])
            if (isNaN(time) || time <= 0) {
                PollManager.respondError(message, 'Das erste Argument ist keine valide Zeit')
                return
            }
    
            let title = args[1].trim()
            if (title.length < 1 || title.length > 30) {
                PollManager.respondError(message, 'Der Titel muss zwischen einem und 30 Zeichen lang sein')
                return
            }
    
            let options = PollManager.parseOptions(message, args.slice(2))
            if (!options) {
                return
            }

            new Poll(title, message.member.user.username, time, options).start(message, clientId)
        } catch(e) {
            PollManager.respondError(message, formatException)
            console.log(e)
        }
    }

    static parseOptions(message: Message, args: string[][]): {} | false {
        let options = {}

        for (let option of args) {
            let pollOption = PollOption.parse(message, option)
            if (!pollOption) {
                return false
            } else if (!(pollOption.emoji in options)) {
                options[pollOption.emoji] = pollOption
            } else {
                PollManager.respondError(message, 'Jede Option muss ein einzigartiges Emoji haben')
                return false
            }
        }

        return options
    }

    static respondError(message: Message, errorMessage: string) {
        message.channel.send(errorMessage)
    }
}

class Poll {
    title: string
    creator: string
    duration: number
    embed: MessageEmbed
    message: Message<boolean>
    options: object
    votes: object

    constructor(title: string, creator: string, duration: number, options: object) {
        this.title = title
        this.creator = creator
        this.duration = duration
        this.options = options

        this.embed = null
        this.message = null
        this.votes = {}
    }

    start(originalMessage: Message, clientId: string) {
        this.createEmbed()
        originalMessage.channel.send({ embeds: [this.embed] }).then(async message => {
            try {
                for (let emoji in this.options) {
                    await message.react(emoji)
                }
            } catch (exception) {
                PollManager.respondError(originalMessage, 'Ein unerwarteter Fehler ist aufgetreten: Konnte keine Reaktionen hinzufügen')
                message.delete()
                return
            }

            this.message = message

            const filter = (reaction, user) => clientId !== user.id
            const collector = message.createReactionCollector({ filter, time: 60000 * this.duration })

            collector.on('collect', (reaction, user) => this.onReact(user, reaction))
            collector.on('end', () => this.end())

            if (originalMessage.deletable) {
                originalMessage.delete()
            }
        })
    }

    onReact(user: User, reaction: MessageReaction) {
        reaction.users.remove(user)
        if (this.voteFor(reaction.emoji.toString(), user.id)) {
            this.embed.setFields(this.getOptionRows())
            this.message.edit({ embeds: [this.embed] })
        }
    } 

    voteFor(emoji: string, userId: string): boolean {
        if (!(emoji in this.options)) {
            return false
        }

        let votedOption = this.options[emoji] 
        if (userId in this.votes) {
            let vote = this.votes[userId]
            vote.voteFor(votedOption)
        } else {
            let vote = this.votes[userId] = new PollVote()
            vote.voteFor(votedOption)
        }

        return true
    }

    async end() {
        let highestVoteCount = 0
        let tie = false
        for (let emoji in this.options) {
            let pollOption: PollOption = this.options[emoji]
            if (pollOption.voteCount > highestVoteCount) {
                highestVoteCount = pollOption.voteCount
                tie = false
            } else if (pollOption.voteCount == highestVoteCount) {
                tie = true
            }
        }

        let rows = []
        let mostVoted: PollOption = null
        for (let emoji in this.options) {
            let pollOption: PollOption = this.options[emoji]
            if (pollOption.voteCount == highestVoteCount) {
                if (!tie) {
                    mostVoted = pollOption
                }
                rows.push(pollOption.asRow())
            } else {
                rows.push(pollOption.asCrossedRow())
            }
        }

        this.embed.setFields(rows)
        if (tie) {
            this.embed.setDescription('Es gab einen Gleichstand')
        } else {
            this.embed.setDescription(`Gewonnen hat "${mostVoted.name}" mit ${mostVoted.voteCount} ${mostVoted.voteCount == 1 ? 'Stimme' : 'Stimmen'}`)
        }

        await this.message.reactions.removeAll()
        await this.message.edit({ embeds: [this.embed] })
    }

    getOptionRows(): EmbedFieldData[] {
        let rows: EmbedFieldData[] = []
        for (let emoji in this.options) {
            rows.push(this.options[emoji].asRow())
        }
        return rows
    }

    createEmbed() {
        this.embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(this.title)
                        .setDescription('Reagiere mit dem entsprechenden Emoji, um für eine Option abzustimmen')
                        .addFields(this.getOptionRows())
                        .setTimestamp()
                        .setFooter({ text: `Diese Abstimmung wurde von ${this.creator} gestartet` })
    }
}

class PollOption {
    name: string
    emoji: string
    description: string
    voteCount: number

    constructor(name: string, emoji: string, description: string = null) {
        this.name = name
        this.emoji = emoji
        this.description = description
        this.voteCount = 0
    }

    asRow() {
        if (this.description === null) {
            return {
                name: `${ this.name } (${ this.emoji })`,
                value: `${ this.voteCount } ${ this.voteCount === 1 ? 'Vote' : 'Votes' }`
            }
        } else {
            return {
                name: `${ this.name } (${ this.emoji }): ${ this.voteCount } ${ this.voteCount === 1 ? 'Vote' : 'Votes' }`,
                value: `${ this.description }`
            }
        }
    }

    asCrossedRow() {
        let row = this.asRow()
        row.name = `~~${ row.name }~~`
        row.value = `~~${ row.value }~~`

        return row
    }

    static parse(message: Message, option: string[]): PollOption | false {
        if (option.length !== 2 && option.length !== 3) {
            PollManager.respondError(message, 'Eine Option muss aus mindestens 2 Teilen bestehen: `[Emoji, Name(, Beschreibung)]`')
            return false
        }

        let emoji = option[0].trim()

        let name = option[1].trim()
        if (name.length < 1 || name.length > 30) {
            PollManager.respondError(message, 'Der Name einer Option muss zwischen einem und 30 Zeichen lang sein')
            return false
        }

        if (option.length == 3) {
            let description = option[2].trim()
            if (description.length > 45) {
                PollManager.respondError(message, 'Die Beschreibung einer Option darf maximal 45 Zeichen lang sein')
                return false
            }   

            return new PollOption(name, emoji, description)
        }

        return new PollOption(name, emoji)
    }
}

class PollVote {
    currentVote: PollOption = null

    voteFor(newVote: PollOption) {
        if (newVote === this.currentVote) {
            this.currentVote.voteCount--
            this.currentVote = null
            return
        } else if (this.currentVote !== null) {
            this.currentVote.voteCount--
        }

        newVote.voteCount++
        this.currentVote = newVote
    }
}