import { Client } from '../index'

const client = new Client({
	clientid: 'cdffa13a0b5535e44518c0076650cc12d0e464075f9194fb'
})

client.constellationService.on('subscribe', (data) => {
	console.log(`We are subscribing to ${data.events.join(', ')}`)
})

client.constellationService.on('event', (data, event) => {
	console.log(JSON.stringify(data), event)
})

client.constellationService.on('error', console.error)

client.constellationService.on('warning', console.warn)

client.subscribeTo('channel:529479:update')
client.subscribeTo([ 'channel:529479:update', 'channel:529479:followed' ])

setTimeout(() => {
	console.log('We are subscribed to ' + client.constellationService.getEvents().join(', '))
	if (client.constellationService.getEvents().length === 2) {
		process.exit(0)
	} else {
		process.exit(1)
	}
}, 500)
