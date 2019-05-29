import { EventEmitter } from 'events'
import WebSocket = require('ws')

class ConstellationService extends EventEmitter {
	private socket: any
	private CONSTELLATION_URL: string
	private events: Array<string>

	constructor (clientid) {
		super()

		this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid
	}

	public subscribe (event: string | Array<string>) {
		if (!this.socket) this.socket = new WebSocket(this.CONSTELLATION_URL)

		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.indexOf(name) !== -1)

		if (event.length > 0) {
			this.connect(event)
		} else {
			this.emit('warning', 'You are already subscribed to all the events you listed to subscribe to')
		}
	}

	private connect (event: Array<string>) {
		this.socket.on('open', () => {
			this.emit('subscribe', 'Subscribing to an event', event)
			this.sendPacket('livesubscribe', { events: event })
			this.eventListener(event)
		})
	}

	private eventListener (event: Array<string>) {
		this.socket.on('message', (data) => {
			data = JSON.parse(data)
			if (data.type === 'reply') {
				this.emit(data.type, { result: data.result, error: data.error }, event)
			} else {
				if (data.data.payload) {
					this.emit(data.type, data.data.payload, data.data.channel)
				}
			}
		})

		this.socket.on('error', (error) => {
			this.emit('error', error)
		})

		this.socket.on('closed', () => {
			this.emit('closed')
		})
	}

	private sendPacket (method: string, params: Params) {
		let packet: Packet = {
			type: 'method',
			method,
			params
		}
		if (this.socket && this.socket.readyState === 1) {
			this.socket.send(JSON.stringify(packet), (error) => {
				if (error) this.emit('error', error)
			})
		} else {
			this.emit('error', 'Socket is not open cant send packet')
		}
	}

	public unsubscribe (event: string | Array<string>) {
		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.indexOf(name) !== -1)

		if (event.length > 0) {
			this.sendPacket('liveunsubscribe', { events: event })
		} else {
			this.emit('warning', 'You are not subscribed to any of events you listed to unsubscribe to')
		}
	}
}

export default ConstellationService

interface Packet {
	type: string
	method: string
	params: Params
}

interface Params {
	events: Array<string>
}
