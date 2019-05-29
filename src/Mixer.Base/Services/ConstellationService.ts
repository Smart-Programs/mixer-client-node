import { EventEmitter } from 'events'
import WebSocket = require('ws')

class ConstellationService extends EventEmitter {
	private socket = new Map<string, any>()
	private CONSTELLATION_URL: string

	constructor (clientid) {
		super()

		this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid
	}

	public subscribe (event: string | Array<string>) {
		event = typeof event === 'string' ? [ event ] : event

		event.forEach((eventName) => {
			if (this.socket.get(eventName)) this.unsubscribe(eventName)
			this.connect(eventName)
		})
	}

	private connect (event: string) {
		let socket = new WebSocket(this.CONSTELLATION_URL)
		this.socket.set(event, socket)
		this.socket.get(event).on('open', () => {
			this.emit('subscribe', 'Subscribing to an event', event)
			this.sendPacket('livesubscribe', { events: [ event ] }, event)
			this.eventListener(event)
		})
	}

	private eventListener (event: string) {
		this.socket.get(event).on('message', (data) => {
			data = JSON.parse(data)
			if (data.type === 'reply') {
				this.emit(data.type, { result: data.result, error: data.error }, event)
			} else {
				if (data.data.payload) {
					this.emit(data.type, data.data.payload, event)
				}
			}
		})

		this.socket.get(event).on('error', (error) => {
			this.emit('error', error, event)
		})

		this.socket.get(event).on('closed', () => {
			this.emit('closed', event)
		})
	}

	private sendPacket (method: string, params: Params, event: string) {
		let packet: Packet = {
			type: 'method',
			method,
			params
		}
		if (this.socket.get(event) && this.socket.get(event).readyState === 1) {
			this.socket.get(event).send(JSON.stringify(packet), (error) => {
				if (error) this.emit('reply', error, {}, event)
			})
		} else {
			this.emit('error', 'Socket is not open cant send packet', event)
		}
	}

	public unsubscribe (event: string | Array<string>) {
		event = typeof event === 'string' ? [ event ] : event
		event.forEach((eventName) => {
			if (this.socket.get(eventName)) {
				this.sendPacket('liveunsubscribe', { events: [ eventName ] }, eventName)

				this.socket.get(eventName).terminate()
				this.socket.delete(eventName)
			} else {
				this.emit('error', "Can't unsubscribe to an event you aren't subscribed to.", eventName)
			}
		})
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
