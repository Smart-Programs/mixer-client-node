import { IRequestOptions } from '../Util/RequestHandler'
import { EventEmitter } from 'events'
import WebSocket = require('ws')
import { Client } from '../Clients/Client'

class ChatService extends EventEmitter {
	private autoReconnect = new Map<number, boolean>()
	private socket = new Map<number, any>()
	private listener = new Map<number, any>()

	private client: Client

	constructor (client: Client) {
		super()
		this.client = client
	}

	public join (userid: number, channelid: number, autoReconnect?: boolean) {
		if (!this.client.user || userid !== this.client.user.userid) {
			let id: number
			if (this.client.user) id = this.client.user.channelid
			this.client.user = {
				channelid: id || channelid,
				userid
			}
		}
		this.autoReconnect.set(channelid, autoReconnect || false)

		if (this.socket.get(channelid)) {
			this.close(channelid, true)
		} else {
			this.getChat(channelid)
				.then((response: IChatResponse) => {
					if (!response.authkey) {
						this.emit(
							'error',
							{
								code: 401,
								error: 'Not Authenticated',
								id: 1,
								message: 'You must be authenticated to connect to a chat!'
							},
							channelid
						)
					} else {
						this.connect(channelid, response.endpoints[0], response.authkey)
					}
				})
				.catch((error) => {
					this.emit('error', error, channelid)
				})
		}
	}

	public getChats (): number[] {
		const array: number[] = []
		this.socket.forEach((_, key) => {
			array.push(key)
		})

		return array
	}

	private getChat (channelid: number) {
		return new Promise((resolve, reject) => {
			const opts: IRequestOptions = {
				auth: true,
				method: 'GET',
				uri: 'https://mixer.com/api/v1/chats/' + channelid
			}

			this.client.request(opts).then(resolve).catch(reject)
		})
	}

	private connect (channelid: number, endpoint: string, authkey: string) {
		this.socket.set(channelid, new WebSocket(endpoint))

		this.socket.get(channelid).on('open', () => {
			this.hookEventListeners(channelid)
			this.sendPacket('auth', [ channelid, this.client.user.userid, authkey ], channelid)
		})
	}

	private hookEventListeners (channelid: number) {
		this.listener.set(channelid, true)

		this.socket.get(channelid).on('message', (response) => {
			if (!this.listener) return
			response = JSON.parse(response)
			if (response.type === 'reply') {
				if (response.data.authenticated === false) {
					this.close(channelid, false)
					this.emit(
						'error',
						{
							code: 401,
							error: 'Not Authenticated',
							id: 2,
							message: 'You must be authenticated to connect to a chat!'
						},
						channelid
					)
				} else {
					if (response.data && response.data.authenticated)
						this.emit('joined', { connectedTo: channelid, userConnected: this.client.user.userid })
					else this.emit(response.type, response.error, response.data, channelid)
				}
			} else {
				this.emit(response.event, response.data, channelid)
			}
		})

		this.socket.get(channelid).on('error', (error) => {
			if (!this.listener) return
			this.emit('error', error, channelid)
		})

		this.socket.get(channelid).on('close', () => {
			this.close(channelid, this.autoReconnect.get(channelid))

			if (!this.listener.get(channelid) || this.autoReconnect.get(channelid)) return
			else this.emit('closed', channelid)
		})
	}

	private sendPacket (method: string, args: any[], channelid: number) {
		const packet: IPacket = {
			arguments: args,
			method,
			type: 'method'
		}
		if (this.socket.get(channelid) && this.socket.get(channelid).readyState === 1) {
			this.socket.get(channelid).send(JSON.stringify(packet))
		} else {
			this.emit('warning', {
				channelid,
				code: 1000,
				id: 1,
				reason: 'Socket Closed or No Socket Found',
				warning: "Can't Send Packet"
			})
		}
	}

	public sendMessage (message: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			this.sendPacket('msg', [ message ], id)
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	public close (channelid?: number, rejoin?: boolean) {
		let id: number
		if (this.socket.size === 1) id = this.socket.keys().next().value
		else if (this.socket.size === 0)
			this.emit('warning', {
				code: 1002,
				id: 1,
				reason: 'You MUST first connect to a channel before you can close a connection',
				warning: 'Not Connected To A Channel'
			})
		else id = channelid

		if (id && this.socket.get(id)) {
			const reconnectSetting = this.autoReconnect.get(id)
			this.listener.set(id, false)
			this.socket.get(id).terminate()

			this.autoReconnect.delete(id)
			this.listener.delete(id)
			this.socket.delete(id)
			if (rejoin) this.join(this.client.user.userid, id, reconnectSetting)
		} else {
			this.emit('warning', {
				code: 1002,
				id: 2,
				reason: 'You MUST provide a channelid to close connection to when connected to multiple channels',
				warning: 'ChannelID to Close to Not Specified'
			})
		}
	}
}

export default ChatService

interface IChatResponse {
	endpoints: string[]
	authkey: string
}

interface IPacket {
	type: string
	method: string
	arguments: any[]
}
