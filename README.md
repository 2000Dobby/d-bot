# d-bot

<p>DISCLAIMER: This application is currently unstable and does not handle many edge-cases, but should still be
usable</p>

To create a poll, the creator needs the MANAGE_MESSAGES permission<br>
Syntax is: `!poll Name <:emoji: - Option1, :emoji: - Option2>`. More than 2 options are possible  

A simple discord.js bot used to create polls.  
Will maybe receive more functionality in the future, this is just a test.  

You need to have node.js installed to run this bot  
To get the dependencies used by the bot cd into the directory where the files are  located and run `npm install`  
Create a config.json in the main directory that looks like this:  

>{  
>&emsp;"token": "123456789abcdef",  
>&emsp;"version": "0.0.1",  
>&emsp;"prefix": "!",  
>&emsp;"pollDuration": "1"  
>}  

Then to start the bot use `node .` or `node main.js`
