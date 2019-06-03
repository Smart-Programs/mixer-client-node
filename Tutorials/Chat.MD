# Chat Bot

## Prerequisites
1.  [Create a Mixer OAuth Application](https://mixer.com/lab/oauth)
2.  Get [NodeJS and NPM](https://nodejs.org/en/) for your platform.
3.  [Create a new project with npm.](https://docs.npmjs.com/cli/init)
4.  Run `npm i -s mixer-client-node`

## Writing the Code
Before you can connect to the chat you must first authenticate with Mixer. If you dont know how to do so Mixer has a good tutorial for using [Short-Code OAuth](https://dev.mixer.com/reference/oauth/shortcodeauth). If you prefer using a web flow check out the [OAuth Quick Details](https://dev.mixer.com/reference/oauth/quickdetails) and use an [NPM package for OAuth](https://www.npmjs.com/search?q=oauth) I recommend [Simple OAuth 2](https://www.npmjs.com/package/simple-oauth2).

Now that you have gotten an authenticated user you will be able to connect to a chat.

### Setup the Mixer Client
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx',
	secretid: 'xxxxxx',
	tokens: {
		access: 'xxxxxx',
		refresh: 'xxxxx'
	},
	user: {
		userid: 1,
		channelid: 1
	}
})
```
clientid and secretid are both gotten from the very first step you did in [Create a Mixer OAuth Application](https://mixer.com/lab/oauth) (Note: a secretid is not always given and you can omit that field if you dont have one).

The tokens object is what you will get with the [Short-Code OAuth](https://dev.mixer.com/reference/oauth/shortcodeauth) or WebFlow OAuth depending on which you picked to do.

The user object is not necessarily needed however it makes life easier when joining chats as we wont have to specify the userid later.

### Join a chat
Now we will add the code in order to actually join a chat.
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx',
	secretid: 'xxxxxx',
	tokens: {
		access: 'xxxxxx',
		refresh: 'xxxxx'
	},
	user: {
		userid: 1,
		channelid: 1
	}
})

let CHANNEL_ID = client.user.channelid // or any channelid you want
client.joinChat(CHANNEL_ID)

let chat = client.chatService

chat.on('error', (error, channelid) => {
	// an error happened normally this means there is an error with Mixer
  // or you did not give a correct userid / accessToken combo
	// channelid = the channelid this error is associated with
})

chat.on('warning', data => {
	// a warning means you did something wrong
	// forgot to include something necessary in a function
})
```

Note: When connecting to chat if you want to join the channelid you specified in the user object of the client you can omit the CHANNEL_ID argument. If you did not specify anything in the user object of the client you must provide 2-3 arguments (channelid, userid, autoReconnect) note that the userid you use must be the user that owns the tokens specified in the client.

Also note that when creating the user object in client channelid does not need to be that users channelid it can be any channelid you want. If you do want to connect to a channel thats not listed in the user object you can specify just the channelid in the function to join that channel.

The 3rd argument autoReconnect defaults to false, and when set to true anytime the socket closes (other than a force close using [client.closeChat()](https://www.npmjs.com/package/mixer-client-node#close-connection-to-chat)) it will reconnect the chat socket for you.

### Listen to Chat Events
Now that we are connected to chat lets listen to when someone sends a chat message in the channel.
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx',
	secretid: 'xxxxxx',
	tokens: {
		access: 'xxxxxx',
		refresh: 'xxxxx'
	},
	user: {
		userid: 1,
		channelid: 1
	}
})

let CHANNEL_ID = client.user.channelid // or any channelid you want
client.joinChat(CHANNEL_ID)

let chat = client.chatService

chat.on('error', (error, channelid) => {
	// an error happened normally this means there is an error with Mixer
  // or you did not give a correct userid / accessToken combo
	// channelid = the channelid this error is associated with
})

chat.on('warning', data => {
	// a warning means you did something wrong
	// forgot to include something necessary in a function
})

chat.on('ChatMessage', (data, channelid) => {
	// channelid = the channelid this message is associated with
	// data = the data object of the event see note*
	// the data object is also modified to add a few objects
	// data.command = { trigger: '!command', args: ["the", "arguments", "passed"]}
	// data.message = { hasLink: false, text: "This is the full text of the message"}
	// data.message.hasLink will be true if the message contains a link

	if(data.command.trigger === '!ping') {
		// someone ran the ping command
		// respond with Pong! @username
		client.sendChat("Pong! @" + data.user_name, channelid)
	}
})
```
Note: The data object can be found at the [ChatMessage Event Page on the Mixer Dev Site](https://dev.mixer.com/reference/chat/events/chatmessage)

#### Other Events
Now that you know how to listen to the ChatMessage Events you can easily apply the same logic you did with that event to listen to other events, all the events are listed on [the Mixer Dev Site in the Chat Reference](https://dev.mixer.com/reference/chat/events). Just click on the event you want to listen to in order to see the data that will send, and use the same chat.on(EventName, (data, channelid)) format for getting the data you want!
