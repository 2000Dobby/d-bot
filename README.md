# d-bot

A simple discord.js bot used to create simple polls.  
It might receive more functionality in the future but for now this is just a test.  

## Setup
First make sure that you have node.js installed.
After that clone this repository and run `npm install`.

In the config folder create a fille called config.json containing the following:
>{  
>&emsp;"token": "123456789abcdef",<br>
>&emsp;"prefix": "!"<br>
>}  

Replace the value of 'token' with your discord bot token

To start the bot use `npx ts-node main.ts`

## Creating a poll
To create a poll the creator needs to have the MANAGE_MESSAGES permission<br>
the syntax is as follows: `!poll time, "title", ["emoji", "name"(, "description")] (, more options)`.
