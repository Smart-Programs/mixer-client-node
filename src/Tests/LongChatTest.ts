import { Client } from '../index'
import { log } from './Logger'

const client = new Client({
	clientid: process.env.clientid,
	tokens: {
		access: process.env.access
	},
	user: {
		channelid: 90231,
		userid: 755643
	}
})

const chat = client.chatService

client.joinChat(true)

chat.on('joined', console.log)

chat.on('ChatMessage', (data) => {
	if (data.command) {
		const argsMsg = data.command.args.length > 0 ? `, args: [ ${data.command.args.join(', ')} ]` : ''
		log(`${data.user_name} > COMMAND { trigger: ${data.command.trigger}${argsMsg} }`, 'info', 'Chat Service')
	} else if (data.skill) {
		const skillMsg = data.skill.message ? ` >>> ${data.skill.message}` : ''
		log(`${data.user_name} gave ${data.skill.cost} ${data.skill.type}${skillMsg}`, 'info', 'Chat Service')
	} else {
		log(`${data.user_name} >>> ${data.message.text}`, 'info', 'Chat Service')
	}
})

chat.on('reply', console.log)
chat.on('error', console.error)
chat.on('warning', console.warn)
chat.on('closed', console.error)
