import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid,
	tokens: {
		access: process.env.access
	},
	user: {
		channelid: 21025112,
		userid: 755643
	}
})

const chat = client.chatService

client.joinChat(true)

chat.on('joined', () => console.log('We successfully connected to chat'))

chat.on('ChatMessage', (data) => {
	if (data.command) {
		console.log(`${data.user_name} ran command ${data.command.trigger} with args: [${data.command.args}]`)
	} else {
		console.log(`${data.user_name}: ${data.message.text}`)
	}
})

chat.on('reply', console.log)
chat.on('error', console.error)
chat.on('warning', console.warn)
