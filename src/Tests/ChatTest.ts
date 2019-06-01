import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid,
	tokens: {
		access: process.env.access
	},
	user: {
		channelid: 529479,
		userid: 755643
	}
})

client.chatService.on('joined', (data) => {
	setTimeout(() => {
		client.sendChat('!ping', data.connectedTo)
	}, 1000)
})

client.chatService.on('ChatMessage', (data, channelid) => {
	console.log(`${data.user_name} sent us a message in the channel ${channelid}`)

	if (data.message.message[0].text.toLowerCase() === '!ping') {
		client.sendChat(`Pong! @${data.user_name}`, channelid)

		process.exit(0)
	}
})

client.chatService.on('reply', (error, data, id) => {
	if (error) console.error(error, id)
	else console.log(data, id)
})

client.chatService.on('error', console.error)

client.chatService.on('warning', console.warn)

client.joinChat()
