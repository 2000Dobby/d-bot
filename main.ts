import { Client, Intents, Message, Permissions } from "discord.js"
import { token, version, commandPrefix } from "./config/config.json"
import { PollManager } from "./modules/poll"

const actions = {
    poll: PollManager.startNewPoll
}

const client: Client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ] 
})

client.once('ready', printStartupMessage)
client.on('messageCreate', parseMessage)
client.login(token)


function printStartupMessage() {
    console.log(`D-Bot v${version} started and logged into the Discord API`)
}

function parseMessage(message: Message) {
    let author = message.member
    let content = message.content.trim()

    if (author.id !== client.user.id && author.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES) 
                                     && content.startsWith(commandPrefix)) {
        let indexOfFirstSpace = content.indexOf(' ')

        let command = content.substring(1, indexOfFirstSpace).toLowerCase()
        let argument = content.substring(indexOfFirstSpace + 1).trim()

        if (command in actions) {
            actions[command](message, argument, client.user.id)
        }
    }
}