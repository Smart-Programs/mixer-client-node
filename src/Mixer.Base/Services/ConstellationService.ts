import { EventEmitter } from 'events'
import * as WebSocket from 'ws'

class ConstellationService extends EventEmitter {
	private socket: WebSocket
	private events: string[] = []
	private subscribingTo: string[] = []
	private unsubscribingTo: string[] = []
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
				if (this.subIds.includes(data.id)) {
					this.subIds = this.subIds.slice(this.subIds.indexOf(data.id))
					const oldRecent = this.subscribingTo
					this.subscribingTo = []
					if (data.error) this.emit(data.type, { result: data.result, error: data.error, data })
					else {
						// subscribe success
						this.events = [ ...this.events, ...oldRecent ]
						this.emit('subscribe', { events: oldRecent })
					}
				} else if (this.unSubIds.includes(data.id)) {
					this.unSubIds = this.unSubIds.slice(this.unSubIds.indexOf(data.id))
					const oldRecent = this.unsubscribingTo
					this.unsubscribingTo = []
					if (data.error) this.emit(data.type, { result: data.result, error: data.error, data })
					else {
						// unsubscribe success
						this.events = this.events.filter((event) => !oldRecent.includes(event))
						this.emit('unsubscribe', { events: oldRecent })
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
	private subIds: number[] = []
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
				this.currentId += 1
				const id = this.currentId
				this.subIds.push(id)
				this.subscribingTo = [ ...this.subscribingTo, ...event ]
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
	private unSubIds: number[] = []
	public unsubscribe (event: string | string[]) {
		event = typeof event === 'string' ? [ event ] : event
		event = event.filter((name) => this.events.indexOf(name) !== -1)

		if (event.length > 0) {
			this.currentId += 1
			const id = this.currentId
			this.unSubIds.push(id)
			this.unsubscribingTo = [ ...this.unsubscribingTo, ...event ]
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
