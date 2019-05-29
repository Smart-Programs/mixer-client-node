import { RequestOptions } from '../Util/RequestHandler'
import { EventEmitter } from 'events'
import WebSocket = require('ws')
import { Client } from '../Clients/Client'

class ChatService extends EventEmitter {
	private userid: number

	private autoReconnect = new Map<number, boolean>()
	private socket = new Map<number, any>()
	private listener = new Map<number, any>()

	private client: Client

	constructor (client: Client) {
		super()
		this.client = client
	}

	public join (userid: number, channelid: number, autoReconnect?: boolean) {
		if (this.socket.get(channelid)) this.close(channelid)

		this.userid = userid
		this.autoReconnect.set(channelid, autoReconnect || false)

		this.getChat(channelid)
			.then((response: ChatResponse) => {
				this.connect(channelid, userid, response.endpoints[0], response.authkey)
			})
			.catch((error) => {
				this.emit('error', error, channelid)
			})
	}

	private getChat (channelid: number) {
		return new Promise((resolve, reject) => {
			var opts: RequestOptions = {
				method: 'GET',
				uri: 'https://mixer.com/api/v1/chats/' + channelid,
				auth: true
			}

			this.client.request(opts).then(resolve).catch(reject)
		})
	}

	private connect (channelid: number, userid: number, endpoint: string, authkey: string) {
		let socket = new WebSocket(endpoint)
		this.socket.set(channelid, socket)
		this.socket.get(channelid).on('open', () => {
			this.hookEventListeners(channelid)
			this.emit('join', { connectingTo: channelid, userConnecting: userid })
			this.sendPacket('auth', [ channelid, userid, authkey ], channelid)
		})
	}

	private hookEventListeners (channelid: number) {
		this.listener.set(channelid, true)
		this.socket.get(channelid).on('message', (response) => {
			if (!this.listener) return
			response = JSON.parse(response)
			if (response.type == 'reply') {
				this.emit(response.type, response.error, response.data, channelid)
			} else {
				this.emit(response.event, response.data, channelid)
			}
		})

		this.socket.get(channelid).on('error', (error) => {
			if (!this.listener) return
			this.emit('error', error, channelid)
		})

		this.socket.get(channelid).on('close', () => {
			if (!this.listener.get(channelid)) return
			if (this.autoReconnect.get(channelid)) this.reconnect(channelid)
			else this.emit('closed', channelid)
		})
	}

	private sendPacket (method: string, args: Array<any>, channelid: number) {
		let packet: Packet = {
			type: 'method',
			method,
			arguments: args
		}
		if (this.socket.get(channelid) && this.socket.get(channelid).readyState === 1) {
			this.socket.get(channelid).send(JSON.stringify(packet))
		} else {
			this.emit('warning', {
				warning: "Can't Send Packet",
				reason: 'Socket Closed or No Socket Found',
				channelid,
				code: 1000,
				id: 1
			})
		}
	}

	public sendMessage (message: string, channelid?: number) {
		let id: number
		if (this.socket.size === 1) id = this.socket.keys().next().value
		else id = channelid
		if (id) {
			this.sendPacket('msg', [ message ], id)
		} else {
			this.emit('warning', {
				warning: "Can't Send Packet",
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				code: 1000,
				id: 2
			})
		}
	}

	public reconnect (channelid?: number) {
		let id: number
		if (this.socket.size === 1) id = this.socket.keys().next().value
		else id = channelid

		if (id) {
			if (this.userid) {
				this.close(id, this.autoReconnect.get(id))
			} else {
				this.emit('warning', {
					warning: 'Not Connected To A Channel',
					reason: 'You MUST first connect to a channel before you can reconnect',
					code: 1001,
					id: 1
				})
			}
		} else {
			this.emit('warning', {
				warning: 'ChannelID to Reconnect to Not Specified',
				reason: 'You MUST provide a channelid to reconnect to when connected to multiple channels',
				code: 1001,
				id: 2
			})
		}
	}

	public close (channelid?: number, rejoin?: boolean) {
		let id: number
		if (this.socket.size === 1) id = this.socket.keys().next().value
		else if (this.socket.size === 0)
			this.emit('warning', {
				warning: 'Not Connected To A Channel',
				reason: 'You MUST first connect to a channel before you can close a connection',
				code: 1002,
				id: 1
			})
		else id = channelid

		if (id && this.socket.get(id)) {
			this.listener.set(id, false)
			this.socket.get(id).terminate()

			this.autoReconnect.delete(id)
			this.listener.delete(id)
			this.socket.delete(id)
			if (rejoin) this.join(this.userid, id, true)
		} else {
			this.emit('warning', {
				warning: 'ChannelID to Close to Not Specified',
				reason: 'You MUST provide a channelid to close connection to when connected to multiple channels',
				code: 1002,
				id: 2
			})
		}
	}
}

export default ChatService

interface ChatResponse {
	endpoints: Array<string>
	authkey: string
}

interface Packet {
	type: string
	method: string
	arguments: Array<any>
}
