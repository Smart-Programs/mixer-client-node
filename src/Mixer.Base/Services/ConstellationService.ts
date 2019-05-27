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
		if (typeof event === 'object') {
			event.forEach((eventName) => {
				if (this.socket.get(eventName)) this.unsubscribe(eventName)
				this.connect(eventName)
			})
		} else {
			if (this.socket.get(event)) this.unsubscribe(event)
			this.connect(event)
		}
	}

	private connect (event: string) {
		let socket = new WebSocket(this.CONSTELLATION_URL)
		this.socket.set(event, socket)
		this.socket.get(event).on('open', () => {
			this.emit('subscribe', 'Subscribing to event: ' + event)
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

	public unsubscribe (event?: string | Array<string>) {
		if (typeof event === 'object') {
			event.forEach((eventName) => {
				if (this.socket.get(eventName)) {
					this.sendPacket('liveunsubscribe', { events: [ eventName ] }, eventName)

					this.socket.get(eventName).terminate()
					this.socket.delete(eventName)
				}
			})
		} else {
			let id: string
			if (this.socket.size === 1) id = this.socket.keys().next().value
			else if (this.socket.size === 0)
				this.emit('error', 'You must subscribe to an event first using the subscribe() method', null)
			else id = event

			if (id && this.socket.get(id)) {
				this.sendPacket('liveunsubscribe', { events: [ event ] }, event)

				this.socket.get(id).terminate()
				this.socket.delete(id)
			} else {
				this.emit(
					'error',
					'You must provide an event to unsubscribe connection to when subscribed to more than one event',
					null
				)
			}
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
