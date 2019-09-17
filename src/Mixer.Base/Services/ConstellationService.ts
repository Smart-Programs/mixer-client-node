import { EventEmitter } from 'events'
import * as WebSocket from 'ws'
import { toJSON } from '../Util/HelperFunctions'

class ConstellationService extends EventEmitter {
	private socket: WebSocket
	private events: string[] = []
	private subscribingTo: { number?: string[] } = {}
	private unsubscribingTo: { number?: string[] } = {}
	private currentId = 0

	constructor (private clientid: string) {
		super()

		this.createSocket()
	}

	/*
	 * Create the constellation socket
	 */
	private createSocket () {
		this.currentId = 0

		if (this.socket && this.socket.readyState === 1) this.socket.terminate()

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
	 * Ping the chat to fix disconnect issues
	 */
	private timeout: NodeJS.Timeout
	private pingId = 0
	private ping () {
		// Send ping every 5 minutes to ensure the connection is solid
		setTimeout(() => this.sendPing, 1000 * 5)

		if (this.timeout) clearTimeout(this.timeout)
		// If the ping does not get responded too in 1 second restart the socket
		this.timeout = setTimeout(() => this.createSocket, 1000)
	}

	private sendPing () {
		if (this.socket.readyState !== 1) return
		if (this.currentId > 100000000) this.currentId = 0
		this.pingId = ++this.currentId
		this.sendPacket('ping', null, this.pingId)
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
		this.socket.once('open', this.ping)

		this.socket.addEventListener('error', ({ error, message }) => this.emit('error', { error, message }))

		this.socket.addEventListener('close', () => setTimeout(() => this.createSocket(), 500))

		this.socket.addEventListener('message', ({ data: response }) => {
			const data: {
				data: any
				event?: string
				type: 'reply' | 'event'
				id: number
				error?: any
				result?: any
			} = toJSON(response) as any

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
				} else if (data.id === this.pingId) {
					if (data.error) this.createSocket()
					else this.ping()
				} else this.emit(data.type, data)
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
				const id = ++this.currentId
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

		if (event.length > 0 && this.socket.readyState !== 1) {
			this.createSocket()
			this.emit('error', {
				code: 404,
				events: event,
				id: 1,
				reason: 'The socket was closed',
				warning: "Can't Send Packet"
			})
		} else if (event.length === 0) {
			this.emit('warning', {
				code: 2000,
				events: event,
				id: 2,
				reason: 'You are not subscribed to any of the events you listed to unsubscribe to',
				warning: "Can't Send Packet"
			})
		} else {
			const id = ++this.currentId
			this.unsubscribingTo[id] = event
			this.sendPacket('liveunsubscribe', { events: event }, id)
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
