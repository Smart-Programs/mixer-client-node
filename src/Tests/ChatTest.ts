import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid
})

const chat = client.chatService

console.log('Trying to chat a chat... should expect an error')
client.joinChat(0, 755643) // Should send not authenticated error to the client.chatService (or chat)

chat.on('joined', (data) => {
	console.log('We successfully connected to chat, channel: ' + data.connectedTo + ' as user: ' + data.userConnected)
	if (data.connectedTo === 529479) {
		console.log('Sending a chat message to trigger a command setup... message should send and should be replied too')
		client.sendChat('!ping', data.connectedTo)
	} else {
		if (client.connectedChannels.length === 2) {
			console.log('We successfully connected to both chats...')

			console.log('Sending a chat message without specifying channelid... expect a warning')
			client.sendChat('Hello!')
		} else {
			console.log('We did not connect to both chats correctly...')
			console.log(client.connectedChannels)

			process.exit(1)
		}
	}
})

let sentToUser: string

chat.on('ChatMessage', (data, channelid) => {
	if (data.command.trigger === '!ping' && channelid === 529479) {
		sentToUser = data.user_name
		console.log("We successfully received the ping command now replying with 'Pong! @" + sentToUser + "'...")
		client.sendChat(`Pong! @${sentToUser}`, channelid)
	} else if (data.message.text === 'Pong! @' + sentToUser && channelid === 529479) {
		console.log('We successfully received the pong message we sent to the user...')

		client.joinChat(22984210)
	} else if (longMessage.endsWith(data.message.text)) {
		console.log('We successfully sent the long message over the limit...')

		console.log('Attempting to clear the chat...')

		chat.clearChat(529479)
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

			console.log('We successfully sent a message saying: "' + msg + '" In the channel ' + id + '...')
		} else if (data.id === 103) {
			console.log('We successfully cleared the chat...')

			console.log('Attempting to leave all the chats...')
			client.closeChat(529479)
			client.closeChat(22984210)

			if (client.connectedChannels.length === 0) {
				console.log('We successfully left all chats...')

				console.log('All test were completed successfully...')
				process.exit(0)
			} else {
				console.log('We did not close the chats correctly...')
				process.exit(1)
			}
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
		console.log('Now reconnecting to chat... expect no errors')

		client.joinChat(529479)
		// Connect to chat (Userid should not be needed because we already tried to join once and provided it)
	} else {
		console.log('An unexpected error occurred... @ chat.on error')
		console.error(data, channelid)
		process.exit(1)
	}
})

const longMessage =
	// tslint:disable-next-line: max-line-length
	'Now I will send a very long message that should exceed the limit of the 360 character limit to ensure that the bot will correctly split up the messages and send them in order and without error hopefully. I ran out of ideas for this message but its a test so I guess it dont really matter. Hello how are you doing there? Oh well ima be doing fantastic if this works the way I want it too!'

chat.on('warning', (warning) => {
	if (warning.code === 1000 && warning.id === 2) {
		console.log('An expected warning occurred... (Must Specify ChannelID for message)')

		console.log(
			'Attempt to send a message over the character limit and it should send the message split up and not send an error...'
		)
		client.sendChat(longMessage, 529479)
	} else {
		console.log('An unexpected warning occurred... @ chat.on warning')
		console.warn(warning)
		process.exit(1)
	}
})
