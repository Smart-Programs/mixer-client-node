import { Client } from '../index'

const client = new Client({
	clientid: process.env.clientid
})

const constellation = client.constellationService

client.subscribeTo('channel:32755539:update')

constellation.on('subscribe', console.log)

constellation.once('open', (data) => console.log('The socket is now open and connected', data))

constellation.on('event', (data, channel) => console.log(data, channel, new Date().toLocaleTimeString()))

constellation.on('reply', console.log)

constellation.on('error', console.error)

constellation.on('warning', console.warn)
