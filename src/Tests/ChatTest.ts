import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid
})

const chat = client.chatService

console.log('Trying to chat a chat... should expect an error')
client.joinChat(0, 755643) // Should send not authenticated error to the client.chatService (or chat)

chat.on('joined', (data) => {
	console.log('We successfully connected to chat, channel: ' + data.connectedTo + ' as user: ' + data.userConnected)
	setTimeout(() => {
		console.log('Sending a chat message to trigger a command setup... message should send and should be replied too')
		client.sendChat('!ping', data.connectedTo)
	}, 1000)
})

let sentToUser: string

chat.on('ChatMessage', (data, channelid) => {
	const command = data.message.message[0].text.toLowerCase()
	const msg: string = data.message.message.map((part) => part.text).join('')

	if (command === '!ping') {
		sentToUser = data.user_name
		console.log("We successfully received the ping command now replying with 'Pong! @" + sentToUser + "'")
		client.sendChat(`Pong! @${sentToUser}`, channelid)
	}

	if (msg === 'Pong! @' + sentToUser) {
		console.log('We successfully received the pong message we sent to the user')
		process.exit(0)
	}
})

chat.on('reply', (error, data, id) => {
	if (error) {
		console.log('An unexpected error occurred... @ chat.on reply')
		console.error(error, id)
		process.exit(1)
	} else {
		if (data.message) {
			const msg = data.message.message.map((part) => part.text).join('')

			console.log('We successfully sent a message saying: "' + msg + '" In the channel ' + id)
		} else {
			console.log(data, id)
		}
	}
})

chat.on('error', (data, channelid) => {
	if (data.code === 401 && data.id === 1) {
		client.tokens = {
			access: process.env.access
		}
		console.log('An expected error occurred...')
		setTimeout(() => {
			console.log('Now reconnecting to chat... expect no errors')
			client.joinChat(529479)
			// Connect to chat (Userid should not be needed because we already tried to join once and provided it)
		}, 500)
	} else {
		console.log('An unexpected error occurred... @ chat.on error')
		console.error(data, channelid)
		process.exit(1)
	}
})

chat.on('warning', (warning) => {
	console.log('An unexpected warning occurred... @ chat.on warning')
	console.warn(warning)
	process.exit(1)
})
