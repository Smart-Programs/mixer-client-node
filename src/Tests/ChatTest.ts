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

client.chatService.on('joined', (data) => {
	console.log(`We are connected to channel ${data.connectedTo}, with the user ${data.userConnected}`)
})

client.chatService.on('ChatMessage', (data, channelid) => {
	console.log(`${data.user_name} sent us a message in the channel ${channelid}`)

	if (data.message.message[0].text.toLowerCase() === '!ping')
		client.chatService.sendMessage(`Pong! @${data.user_name}`, channelid)
})

client.chatService.on('reply', (error, data, id) => {
	if (error) console.error(error, id)
	else console.log(data, id)
})

client.chatService.on('error', (error, id) => {
	console.error(error, id)
})

client.chatService.on('warning', (data) => {
	console.warn(data)
})

client.joinChat()
