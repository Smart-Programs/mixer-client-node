import { EventEmitter } from 'events'
import * as WebSocket from 'ws'
import { toJSON } from '../Util/HelperFunctions'

class ConstellationService extends EventEmitter {
    private sockets: Map<number, WebSocket> = new Map()
    private events: Map<number, string[]> = new Map()
    private subscribingTo: Map<number, { number?: string[] }> = new Map()
    private unsubscribingTo: Map<number, { number?: string[] }> = new Map()
    private currentId: Map<number, number> = new Map()
    private subNumber = 0
    private splitCount = 100

    constructor(private clientid: string) {
        super()

        this.createSocket(0, 'constructor')
    }

    /*
     * Create the constellation socket
     */
    private createSocket(number: number, from?) {
        // console.log('Create Socket.', number, 'From:', from)
        this.currentId.set(number, 0)
        this.subscribingTo.set(number, {})
        this.unsubscribingTo.set(number, {})

        if (
            number &&
            this.sockets.has(number) &&
            this.sockets.get(number).readyState === 1
        )
            this.sockets.get(number).terminate()

        const num = number ? number : this.sockets.values.length

        this.sockets.set(
            num,
            new WebSocket('wss://constellation.mixer.com', 'cnstl-gzip', {
                headers: {
                    'client-id': this.clientid,
                    'x-is-bot': true
                } as any
            })
        )

        this.eventListener(num)

        if (this.events.has(num) && this.events.get(num).length > 0) {
            const subTo = this.events.get(num)
            this.events.set(num, [])

            this.subscribe(subTo, num)
        }
    }

    /*
     * Ping the chat to fix disconnect issues
     */
    private timeout: Map<number, NodeJS.Timeout> = new Map()
    private pingId: Map<number, number> = new Map()
    private ping(num: number) {
        // Send ping every 5 seconds to ensure the connection is solid
        setTimeout(() => this.sendPing(num), 1000 * 5)

        if (this.timeout.get(num)) clearTimeout(this.timeout.get(num))
    }

    private sendPing(num: number) {
        if (this.sockets.has(num) && this.sockets.get(num).readyState !== 1)
            return
        if (this.currentId.get(num) > 100000000) this.currentId.set(num, 0)
        this.pingId.set(num, this.currentId.get(num) + 1)
        this.currentId.set(num, this.pingId.get(num))
        this.sendPacket('ping', null, this.pingId.get(num), num)

        // If the ping does not get responded too in 1 second restart the socket
        this.timeout.set(
            num,
            setTimeout(() => this.createSocket(num, 'pingTimeout'), 1000)
        )
    }

    /*
     * Get the event's that you are subscribed to
     * Returns a string array
     */
    public get subscribedEvents(): string[] {
        let subscribed = []
        this.events.forEach((items) => {
            subscribed = [...subscribed, ...items]
        })
        return subscribed
    }

    /*
     * Setup the socket event listener to emit events
     */
    private eventListener(number: number) {
        this.sockets.get(number).once('open', () => this.ping(number))

        this.sockets
            .get(number)
            .addEventListener('error', ({ error, message }) => {
                if (this.listenerCount('error') > 0)
                    this.emit('error', { error, message })
            })

        this.sockets
            .get(number)
            .addEventListener('close', () =>
                setTimeout(() => this.createSocket(number, 'socketClose'), 500)
            )

        this.sockets
            .get(number)
            .addEventListener('message', ({ data: response }) => {
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
                    if (this.subscribingTo.get(number)[data.id]) {
                        const events = this.subscribingTo.get(number)[data.id]

                        const newEvents = this.subscribingTo.get(number)
                        delete newEvents[data.id]
                        this.subscribingTo.set(number, newEvents)

                        if (data.error)
                            this.emit(data.type, {
                                result: data.result,
                                error: data.error,
                                events
                            })
                        else {
                            // subscribe success
                            const old = this.events.has(number)
                                ? this.events.get(number)
                                : []
                            this.events.set(number, [...old, ...events])
                            this.emit('subscribe', { events })
                        }
                    } else if (this.unsubscribingTo.get(number)[data.id]) {
                        const events = this.unsubscribingTo.get(number)[data.id]

                        const newEvents = this.unsubscribingTo.get(number)
                        delete newEvents[data.id]
                        this.unsubscribingTo.set(number, newEvents)

                        if (data.error)
                            this.emit(data.type, {
                                result: data.result,
                                error: data.error,
                                events
                            })
                        else {
                            // unsubscribe success
                            this.events.set(
                                number,
                                this.events
                                    .get(number)
                                    .filter((event) => !events.includes(event))
                            )
                            this.emit('unsubscribe', { events })
                        }
                    } else if (data.id === this.pingId.get(number)) {
                        if (data.error) this.createSocket(number, 'pingError')
                        else this.ping(number)
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
    private sendPacket(
        method: string,
        params: IParams,
        id: number = 0,
        num: number
    ) {
        const packet: IPacket = {
            id,
            method,
            params,
            type: 'method'
        }
        if (this.sockets.has(num) && this.sockets.get(num).readyState === 1) {
            this.sockets.get(num).send(JSON.stringify(packet))
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

    private resetSubNumber() {
        this.events.forEach((val, key) => {
            if (this.subNumber < key) return
            else if (val.length < this.splitCount) this.subNumber = key
        })
    }

    /*
     * Subscribe to an event
     * Emits a subscribe event if successful
     */
    public subscribe(event: string | string[], num?: number) {
        const number = num ? num : this.subNumber

        if (this.sockets.get(number).readyState !== 1) {
            this.once('open', () => {
                this.subscribe(event, num)
            })
        } else {
            event = typeof event === 'string' ? [event] : event
            const originalEvents = event
            event = event.filter((name) => {
                for (const event in this.events) {
                    if (event.includes(name)) return false
                }

                for (const id in this.subscribingTo) {
                    if (
                        this.subscribingTo.hasOwnProperty(id) &&
                        this.subscribingTo[id].includes(name)
                    )
                        return false
                }

                return true
            })

            if (event.length > 0) {
                let subbingToCount = 0

                for (let i in this.subscribingTo.get(number)) {
                    subbingToCount += this.subscribingTo.get(number)[i].length
                }

                const c = this.events.has(number)
                    ? this.events.get(number).length +
                      event.length +
                      subbingToCount
                    : event.length + subbingToCount

                if (!num && c >= this.splitCount) {
                    this.createSocket(++this.subNumber, 'subCountHigher')
                }

                const threshold = Math.floor(
                    (this.subNumber - 1) * this.splitCount * 0.6
                )
                if (
                    this.subNumber > 10 &&
                    this.subscribedEvents.length < threshold
                )
                    this.resetSubNumber()

                const id = this.currentId.get(number) + 1
                this.currentId.set(number, id)

                const newEvents = this.subscribingTo.get(number)
                newEvents[id] = event
                this.subscribingTo.set(number, newEvents)

                this.sendPacket('livesubscribe', { events: event }, id, number)
            } else {
                this.emit('warning', {
                    code: 2001,
                    events: originalEvents,
                    id: 1,
                    reason:
                        'You are already subscribed to the event(s) you said to subscribe to',
                    warning: "Can't Subscribe"
                })
            }
        }
    }

    /*
     * UbSubscribe to an event
     * Emits an unsubscribe event if successful
     */
    public unsubscribe(event: string | string[]) {
        let events: Map<number, string[]> = new Map()
        let hasSome = false
        event = typeof event === 'string' ? [event] : event
        event = event.filter((name) => {
            this.events.forEach((values, num) => {
                values.forEach((val) => {
                    if (name === val) {
                        const old = events.get(num) || []
                        events.set(num, [...old, val])
                        hasSome = true
                    }
                })
            })
        })

        this.events.forEach((val, key) => {
            if (this.sockets.get(key).readyState !== 1) {
                this.createSocket(key, 'socketNotReadyUnsub')
            }
        })

        if (!hasSome) {
            this.emit('warning', {
                code: 2000,
                events: event,
                id: 2,
                reason:
                    'You are not subscribed to any of the events you listed to unsubscribe to',
                warning: "Can't Send Packet"
            })
        } else {
            events.forEach((items, num) => {
                const id = this.currentId.get(num) + 1
                this.currentId.set(num, id)

                const newEvents = this.unsubscribingTo.get(num)
                newEvents[id] = items
                this.unsubscribingTo.set(num, newEvents)

                this.sendPacket('liveunsubscribe', { events: items }, id, num)
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
