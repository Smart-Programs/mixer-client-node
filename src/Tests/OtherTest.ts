import { Client } from '../index'

let client = new Client({
	clientid: ''
})

let x = client.chatService

x.join(755643, 529479)

x.on('error', (error, id) => {
	if (error.error === 'Not Authenticated') {
		client.setTokens({ access: process.env.access })
		x.join(755643, id)
	}
	console.error(JSON.stringify(error))
})

x.on('joined', console.log)
