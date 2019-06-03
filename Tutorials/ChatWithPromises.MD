# Chat Bot using Promises

## Prerequisites
1. [Create a Mixer OAuth Application](https://mixer.com/lab/oauth)
2. Get [NodeJS and NPM](https://nodejs.org/en/) for your platform.
3. [Create a new project with npm.](https://docs.npmjs.com/cli/init)
4. Run `npm i -s mixer-client-node`

## Writing the Code
Before you can connect to the chat you must first authenticate with Mixer. If you dont know how to do so Mixer has a good tutorial for using [Short-Code OAuth](https://dev.mixer.com/reference/oauth/shortcodeauth). If you prefer using a web flow check out the [OAuth Quick Details](https://dev.mixer.com/reference/oauth/quickdetails) and use an [NPM package for OAuth](https://www.npmjs.com/search?q=oauth) I recommend [Simple OAuth 2](https://www.npmjs.com/package/simple-oauth2).

Now that you have gotten an authenticated user you will be able to connect to a chat.

#### Setup the Mixer Client.
```
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

#### Join a chat
Now we will add the code in order to actually join a chat.
```
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
client.joinChat(CHANNEL_ID).then(socket => {
  // socket -> The WS* socket connection for the chat
}).catch(error => {
  // an error happened normally this means there is an error with Mixer
  // or you did not give a correct userid / accessToken combo
})
```
*[WS](https://www.npmjs.com/package/ws) is a Node.js WebSocket library that allows us to create a connection with the Mixer chat.

Note: When connecting to chat if you want to join the channelid you specified in the user object of the client you can omit the CHANNEL_ID argument. If you did not specify anything in the user object of the client you must provide 2 arguments (channelid, userid) note that the userid you use must be the user that owns the tokens specified in the client. Also note that when creating the user object in client channelid does not need to be that users channelid it can be any channelid you want. If you do want to connect to a channel thats not listed in the user object you can specify just the channelid in the function to join that channel.

#### Listen to Chat Events
Now that we are connected to chat lets listen to when someone sends a chat message in the channel.
```
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
client.joinChat(CHANNEL_ID).then(socket => {
  // socket -> The WS socket connection for the chat

  client.chatService.unlisten(CHANNEL_ID) // See note*

  socket.on('message', data => {
    // the server sent us a message!

    if(data.event === 'ChatMessage') {
        // We got a chat message event
        // Read more on the event here: https://dev.mixer.com/reference/chat/events/chatmessage

      if(data.data.messages.messages[0].text === '!ping') {
        client.sendChat("Pong! @" + data.data.user_name, CHANNEL_ID) // See note2*
      }
    }
  })
}).catch(error => {
  // an error happened normally this means there is an error with Mixer
  // or you did not give a correct userid / accessToken combo
})
```
Note: Since we are asking for the client to send us the socket connection we dont need the client to emit us data when something happens on the chat socket. If we didn't ask for the socket we would listen to the chatService sending us events instead of the socket itself.

Note 2: client.sendChat() is a function built directly in the client normally you would use socket.send() to send a message to the socket, the CHANNEL_ID is only needed if you are connected to more than one chat but its highly recommended to provide even if you are only connected to one chat.

#### Other Events
Now that you know how to listen to the ChatMessage Events you can easily apply the same logic you did with that event to listen to other events, all the events are listed on [the Mixer Dev Site in the Chat Reference](https://dev.mixer.com/reference/chat/events). Just click on the event you want to listen to in order to see the data that will send, and use the same if(data.event === EventName) format for getting the data you want!
