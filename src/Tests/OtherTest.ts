import { Client } from '../index'

let client = new Client({
	clientid: process.env.clientid
})

let x = client.chatService

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

x.on('joined', console.log)
