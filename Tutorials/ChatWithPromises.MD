### Basic Ping Bot With Promises
```
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx',
	secretid: 'xxxxxx', // Only needed if you have a secret id
	tokens: {
		access: 'xxxxxx',
		refresh: 'xxxxx' // Only needed if you have a refresh token or want to use the built in refresh features
	},
	user: {
		// User object not needed but if connecting to chats this is highly recommended
		userid: 1,
		channelid: 1
	}
})

client.joinChat().then(socket => {
  client.chatService.unlisten() // must provide a channelid argument if connected to more than one channel
  // this makes it so the chatService wont emit any events for the specific channel
  // client.chatService.on() will no long be available for channelid sent (in this case it wont ever send anything)
  socket.on('message', data => {
    // the server sent us data
    if(data.type === 'reply') {
      // the server replied to something we sent!
    } else {
      // an event happened on the server
      if(data.event === 'ChatMessage') {
        // We got a chat message event
        // Read more on the event here: https://dev.mixer.com/reference/chat/events/chatmessage

        if(data.data.messages.messages[0].text === '!ping') {
          let messagePacket = {
            type: 'method',
            method: 'msg',
            arguments: ["Pong! @" + data.data.user_name],
            id: 100 // id can be any number you want to identify the servers reply event
          }
          socket.send(JSON.stringify(messagePacket)) // send the message packet
        }
      }
    }
  })
}).catch(error => {
  // an error happened
})
```
