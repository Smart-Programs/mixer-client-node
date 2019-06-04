import { EventEmitter } from 'events'
import * as WebSocket from 'ws'

class ConstellationService extends EventEmitter {
	private socket: WebSocket
	private events: string[] = []
	private subscribingTo: { number?: string[] } = {}
	private unsubscribingTo: { number?: string[] } = {}
	private currentId: number = 0

	constructor (private clientid: string) {
		super()

		this.createSocket()
	}

	/*
	 * Create the constellation socket
	 */
	private createSocket () {
		this.currentId = 0

		this.socket = new WebSocket('wss://constellation.mixer.com', 'cnstl-gzip', {
			headers: {
				'client-id': this.clientid,
				'x-is-bot': true
			} as any
		})

		this.eventListener()

		if (this.events.length > 0) {
			const subTo = this.events
			this.events = []

			this.subscribe(subTo)
		}
	}

	/*
	 * Get the event's that you are subscribed to
	 * Returns a string array
	 */
	public get subscribedEvents (): string[] {
		return [ ...this.events ]
	}

	/*
	 * Setup the socket event listener to emit events
	 */
	private eventListener () {
		this.socket.addEventListener('error', (err) => this.emit('error', err))
		this.socket.addEventListener('close', (data) => {
			this.emit('error', { socket: 'Closed', response: data })
			setTimeout(() => {
				this.createSocket()
			}, 500)
		})

		this.socket.addEventListener('message', (data: any) => {
			data = JSON.parse(data.data)

			if (data.event === 'hello') return this.emit('open', data.data)

			if (data.type === 'reply') {
				if (data.id in this.subscribingTo) {
					const events = this.subscribingTo[data.id]
					delete this.subscribingTo[data.id]
					if (data.error) this.emit(data.type, { result: data.result, error: data.error, events })
					else {
						// subscribe success
						this.events = [ ...this.events, ...events ]
						this.emit('subscribe', { events })
					}
				} else if (data.id in this.unsubscribingTo) {
					const events = this.unsubscribingTo[data.id]
					delete this.unsubscribingTo[data.id]
					if (data.error) this.emit(data.type, { result: data.result, error: data.error, events })
					else {
						// unsubscribe success
						this.events = this.events.filter((event) => !events.includes(event))
						this.emit('unsubscribe', { events })
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
	private sendPacket (method: string, params: IParams, id: number = 0) {
		const packet: IPacket = {
			id,
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
			event = event.filter((name) => {
				if (this.events.includes(name)) return false
				else {
					for (const id in this.subscribingTo) {
						if (this.subscribingTo.hasOwnProperty(id) && this.subscribingTo[id].includes(name)) return false
					}
					return true
				}
			})

			if (event.length > 0) {
				this.currentId += 1
				const id = this.currentId
				this.subscribingTo[id] = event
				this.sendPacket('livesubscribe', { events: event }, id)
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
	 * UbSubscribe to an event
	 * Emits an unsubscribe event if successful
	 */
	public unsubscribe (event: string | string[]) {
		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.includes(name))

		if (event.length > 0) {
			this.currentId += 1
			const id = this.currentId
			this.unsubscribingTo[id] = event
			this.sendPacket('liveunsubscribe', { events: event }, id)
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
