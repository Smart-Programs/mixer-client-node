import { EventEmitter } from 'events'
import * as WebSocket from 'ws'

class ConstellationService extends EventEmitter {
	private socket: WebSocket
	private CONSTELLATION_URL: string
	private events: string[] = []
	private subscribingTo: string[] = []
	private unsubscribingTo: string[] = []

	constructor (clientid) {
		super()

		this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid

		this.socket = new WebSocket(this.CONSTELLATION_URL, 'cnstl-gzip', {
			headers: {
				'client-id': clientid,
				'x-is-bot': true
			} as any
		})

		this.eventListener()
	}

	/*
	 * Get the event's that you are subscribed to
	 * Returns a string array
	 */
	public get subscribedEvents (): string[] {
		return [ ...this.events ]
	}

	/*
	 * Subscribe to an event
	 * Emits a subscribe event if successful
	 */
	public subscribe (event: string | string[]) {
		if (this.socket.readyState !== 1) {
			this.once('open', () => {
				this.subscribe(event)
			})
		} else {
			event = typeof event === 'string' ? [ event ] : event
			const originalEvents = event
			event = event.filter((name) => this.events.indexOf(name) === -1 && this.subscribingTo.indexOf(name) === -1)

			if (event.length > 0) {
				this.subscribingTo = [ ...this.subscribingTo, ...event ]
				this.sendPacket('livesubscribe', { events: event }, 42)
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

	/*
	 * Setup the socket event listener to emit events
	 */
	private eventListener () {
		this.socket.addEventListener('error', (err) => this.emit('error', err))
		this.socket.addEventListener('closed', () => this.emit('closed'))

		this.socket.addEventListener('message', (data: any) => {
			data = JSON.parse(data.data)

			if (data.event === 'hello') return this.emit('open', data.data)

			if (data.type === 'reply') {
				if ([ 42, 43 ].includes(data.id)) {
					if (data.id === 42) {
						// subscribingTo
						const oldRecent = this.subscribingTo
						this.subscribingTo = []
						if (data.error) this.emit(data.type, { result: data.result, error: data.error, data })
						else {
							// subscribe success
							this.events = [ ...this.events, ...oldRecent ]
							this.emit('subscribe', { events: oldRecent })
						}
					} else {
						// unsubscribingTo
						const oldRecent = this.unsubscribingTo
						this.unsubscribingTo = []
						if (data.error) this.emit(data.type, { result: data.result, error: data.error, data })
						else {
							// unsubscribe success
							this.events = this.events.filter((event) => !oldRecent.includes(event))
							this.emit('unsubscribe', { events: oldRecent })
						}
					}
				} else {
					this.emit(data.type, { result: data.result, error: data.error, data })
				}
			} else if (data.data && data.data.payload) {
				this.emit(data.type, data.data.payload, data.data.channel)
			} else {
				this.emit(data.type, data)
			}
		})
	}

	/*
	 * Send the socket data
	 */
	private sendPacket (method: string, params: IParams, id?: number) {
		const packet: IPacket = {
			id: id || 0,
			method,
			params,
			type: 'method'
		}
		if (this.socket && this.socket.readyState === 1) this.socket.send(JSON.stringify(packet))
		else {
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

		this.unsubscribingTo = event

		if (event.length > 0) this.sendPacket('liveunsubscribe', { events: event }, 43)
		else {
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
