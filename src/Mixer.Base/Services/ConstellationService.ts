import { EventEmitter } from 'events'
import WebSocket = require('ws')
import { isRegExp } from 'util'

class ConstellationService extends EventEmitter {
	private socket: any
	private CONSTELLATION_URL: string
	private events: string[] = []
	private mostRecent: string[] = []

	constructor (clientid) {
		super()

		this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid

		this.socket = new WebSocket(this.CONSTELLATION_URL)
		this.socket.on('open', () => {
			this.eventListener()
		})
	}

	public get subscribedEvents (): string[] {
		return [ ...this.events ]
	}

	public subscribe (event: string | string[]) {
		if (this.socket.readyState !== 1) {
			this.socket.on('open', () => {
				this.subscribe(event)
			})
		} else {
			event = typeof event === 'string' ? [ event ] : event
			const originalEvents = event
			event = event.filter((name) => this.events.indexOf(name) === -1 && this.mostRecent.indexOf(name) === -1)

			if (event.length > 0) {
				this.mostRecent = this.mostRecent ? [ ...this.mostRecent, ...event ] : event
				this.connect(event)
			} else {
				this.emit('warning', {
					code: 2001,
					events: originalEvents,
					id: 1,
					reason: 'You are already subscribed to the event(s) you said to subscribe to',
					warning: "Can't Subscribe"
				})
			}
		}
	}

	private connect (event: string[]) {
		this.sendPacket('livesubscribe', { events: event }, 42)
	}

	private eventListener () {
		this.socket.on('message', (data) => {
			data = JSON.parse(data)
			if (data.type === 'reply') {
				if (data.error && data.error.code === 4106) {
					this.mostRecent = []
					this.emit('error', {
						code: 404,
						id: 1,
						message: data.error.message
					})
				} else {
					if (data.id === 42) {
						const oldRecent = this.mostRecent
						this.mostRecent = []
						this.events = [ ...this.events, ...oldRecent ]
						this.emit('subscribe', { events: oldRecent })
					} else {
						this.emit(data.type, { result: data.result, error: data.error, data })
					}
				}
			} else {
				if (data.data.payload) {
					this.emit(data.type, data.data.payload, data.data.channel)
				} else {
					this.emit(data.type, data)
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

	private sendPacket (method: string, params: IParams, id?: number) {
		const packet: IPacket = {
			id: id || 0,
			method,
			params,
			type: 'method'
		}
		if (this.socket && this.socket.readyState === 1) {
			this.socket.send(JSON.stringify(packet))
		} else {
			this.emit('warning', {
				code: 2000,
				events: params,
				id: 1,
				method,
				reason: 'Socket Closed or No Socket Found',
				warning: "Can't Send Packet"
			})
		}
	}

	public unsubscribe (event: string | string[]) {
		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.indexOf(name) !== -1)

		if (event.length > 0) {
			this.sendPacket('liveunsubscribe', { events: event })
			this.events = this.events.filter((name) => event.indexOf(name) !== -1)
		} else {
			this.emit('warning', {
				code: 2000,
				events: event,
				id: 2,
				reason: 'You are not subscribed to any of the events you listed to unsubscribe to',
				warning: "Can't Send Packet"
			})
		}
	}
}

export default ConstellationService

interface IPacket {
	id: number
	type: string
	method: string
	params: IParams
}

interface IParams {
	events: string[]
}
