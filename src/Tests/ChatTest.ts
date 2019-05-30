import { Client } from '../index'

let client = new Client({
	clientid: process.env.clientid,
	secretid: process.env.secretid,
	tokens: {
		access: process.env.access
	},
	user: {
		userid: 755643,
		channelid: 529479
	}
})

client.chatService.on('join', (data) => {
	console.log(`We are connecting to channel ${data.connectingTo}, with the user ${data.userConnecting}`)
})

client.chatService.on('ChatMessage', (data, channelid) => {
	console.log(`${data.user_name} sent us a message in the channel ${channelid}`)

	if (data.message.message[0].text.toLowerCase() === '!ping')
		client.chatService.sendMessage(`Pong! @${data.user_name}`, channelid)
})

client.chatService.on('error', (error, id) => {
	console.error(error, id)
})

client.chatService.on('warning', (data) => {
	console.warn(data)
})

client.joinChat()
