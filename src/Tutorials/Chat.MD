### Basic Ping Bot
```
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx',
	secretid: 'xxxxxx', // Only needed if you have a secret id
	tokens: {
		// Tokens only needed for chat functionality if you only need constellation you don't need this
		access: 'xxxxxx',
		refresh: 'xxxxx' // Only needed if you have a refresh token or want to use the built in refresh features
	},
	user: {
		// User object not needed but if connecting to chats this is highly recommended
		userid: 1,
		channelid: 1
	}
})

client.joinChat() // Joining channelid with userid as specified in the user object (the user must own the tokens specified)
client.joinChat(2) // Join channelid 2 with user specified in user object (the user must own the tokens specified)
client.joinChat(3, 1) // Join channelid 3 with userid 1 (userid must be the owner of the tokens listed in the tokens object)
// You can put true as the last variable (or only variable) in each situation to auto reconnect to chat Default: false
// NO ANONYMOUS CHATS

// Now we are connected to 3 chats, the channelids being 1, 2, and 3

client.chatService.on('join', (data) => {
	console.log(`We are connecting to channel ${data.connectingTo}, with the user ${data.userConnecting}`)
	// This is called 3 times for each channel we are connecting to
})

client.chatService.on('ChatMessage', (data, channelid) => {
	console.log(`${data.user_name} sent us a message in the channel ${channelid}`)
	// channelid is the chat this message was sent in
	// For our case this would either be channelid: 1, 2, or 3

	if (data.message.message[0].toLowerCase() === '!ping')
		client.chatService.sendMessage(`Pong! @${data.user_name}`, channelid) // Send a message back
	// Sine we are connecting to 3 chats we must give the 2nd paramter of channelid so it knows which chat to send the message to
})

client.chatService.on('closed', (channelid) => {
	// Socket for channelid was closed (Not sent if auto reconnect set to true)
	// Also not sent if you force close the chat using client.chatService.close(channelid)
})

// When you are done with a certain chat you can close it:
client.chatService.close(1) // Close channel with channelid 1
client.chatService.close(2) // Close channel with channelid 2
client.chatService.close() // Close channel with channelid 3

// The last one works without the channelid specified because it is the only chat you are connected to
// It is always recommended to put in the channelid to close if you connect to multiple chats

```
