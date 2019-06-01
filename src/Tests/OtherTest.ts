import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid
})

const x = client.chatService

client.joinChat(529479, 755643)

x.on('error', (error, id) => {
	console.error(JSON.stringify(error))
	if (error.code === 401) {
		client.tokens = { access: process.env.access }
		setTimeout(() => {
			client.joinChat(id, 755643)
		}, 500)
	}
})

x.on('reply', (error, data, id) => {
	if (error) console.error(error, data, id)
	else console.log(data, id)
})

let didReconnectAfterSuccess = false
x.on('joined', (data) => {
	console.log(data)
	if (!didReconnectAfterSuccess) {
		didReconnectAfterSuccess = true
		setTimeout(() => {
			client.closeChat(data.connectedTo)
			client.joinChat()
		}, 500)
	}
})
