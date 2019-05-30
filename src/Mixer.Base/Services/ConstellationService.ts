import { EventEmitter } from 'events'
import WebSocket = require('ws')

class ConstellationService extends EventEmitter {
	private socket: any
	private CONSTELLATION_URL: string
	private events: Array<string> = []

	constructor (clientid) {
		super()

		this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid

		this.socket = new WebSocket(this.CONSTELLATION_URL)
		this.socket.on('open', () => {
			this.eventListener()
		})
	}

	public getEvents (): Array<string> {
		return [ ...this.events ]
	}

	public subscribe (event: string | Array<string>) {
		if (this.socket.readyState !== 1) {
			this.socket.on('open', () => {
				this.subscribe(event)
			})
		} else {
			event = typeof event === 'string' ? [ event ] : event
			event = event.filter((name) => this.events.indexOf(name) === -1)
			if (event.length > 0) {
				this.connect(event)
			} else {
				this.emit('warning', {
					warning: "Can't Subscribe",
					reason: 'You are already subscribed to the event(s) you said to subscribe to',
					events: event,
					code: 2001,
					id: 1
				})
			}
		}
	}

	private connect (event: Array<string>) {
		this.emit('subscribe', { events: event })
		this.sendPacket('livesubscribe', { events: event })
		this.events = [ ...event, ...this.events ]
	}

	private eventListener () {
		this.socket.on('message', (data) => {
			data = JSON.parse(data)
			if (data.type === 'reply') {
				this.emit(data.type, { result: data.result, error: data.error, data })
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
			this.socket.send(JSON.stringify(packet))
		} else {
			this.emit('warning', {
				warning: "Can't Send Packet",
				reason: 'Socket Closed or No Socket Found',
				method,
				events: params,
				code: 2000,
				id: 1
			})
		}
	}

	public unsubscribe (event: string | Array<string>) {
		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.indexOf(name) !== -1)

		if (event.length > 0) {
			this.sendPacket('liveunsubscribe', { events: event })
			this.events = this.events.filter((name) => event.indexOf(name) !== -1)
		} else {
			this.emit('warning', {
				warning: "Can't Send Packet",
				reason: 'You are not subscribed to any of the events you listed to unsubscribe to',
				events: event,
				code: 2000,
				id: 2
			})
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
