import { IRequestOptions } from '../Util/RequestHandler'
import { EventEmitter } from 'events'
import { Client } from '../Clients/Client'
import WebSocket = require('ws')

class ChatService extends EventEmitter {
	private autoReconnect = new Map<number, boolean>()
	private socket = new Map<number, any>()
	private listener = new Map<number, any>()

	private client: Client

	constructor (client: Client) {
		super()
		this.client = client
	}

	/*
	 * Join a chat
	 */
	public join (userid: number, channelid: number, autoReconnect?: boolean): Promise<any> {
		return new Promise((resolve, deny) => {
			if (!this.client.user || userid !== this.client.user.userid) {
				let id: number
				if (this.client.user) id = this.client.user.channelid
				this.client.user = {
					channelid: id || channelid,
					userid
				}
			}

			if (this.socket.get(channelid)) this.close(channelid, false)

			this.connectTheChat(channelid, autoReconnect).then(resolve).catch((err) => {
				if (this.listenerCount('error') === 0) deny(err)
				else this.emit('error', err, channelid)
			})
		})
	}

	private connectTheChat (channelid: number, autoReconnect: boolean) {
		return new Promise((resolve, deny) => {
			const chatRequest: IRequestOptions = {
				auth: true,
				method: 'GET',
				uri: 'https://mixer.com/api/v1/chats/' + channelid
			}

			this.client
				.request(chatRequest)
				.then((response: IChatResponse) => {
					if (!response.authkey) {
						deny({
							code: 401,
							error: 'Not Authenticated',
							id: 1,
							message: 'You must be authenticated to connect to a chat!'
						})
					} else {
						this.autoReconnect.set(channelid, autoReconnect || false)
						this.socket.set(channelid, new WebSocket(response.endpoints[0]))
						this.hookEventListeners(channelid, response.authkey)
						resolve(this.socket.get(channelid))
					}
				})
				.catch(deny)
		})
	}

	/*
	 * Setup the event listeners for the sockets
	 */
	private hookEventListeners (channelid: number, authkey: string) {
		this.listener.set(channelid, true)

		this.socket.get(channelid).on('open', () => {
			this.sendPacket('auth', [ channelid, this.client.user.userid, authkey ], channelid)
		})

		this.socket.get(channelid).on('message', (response) => {
			if (!this.listener.get(channelid) || this.eventNames().length === 0) return

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
					else this.emit(response.type, response.error, { ...response.data, id: response.id }, channelid)
				}
			} else {
				if (response.event === 'ChatMessage') {
					const messageResponse = response.data.message.message
					const hasLink = messageResponse.filter((part) => part.type === 'link').length > 0
					const text: string = messageResponse.map((part) => part.text).join('')
					const isCommand = text.startsWith('!')

					const trigger = isCommand ? text.split(' ')[0] : undefined
					const args: string[] = isCommand ? messageResponse.map((part) => part.text) : []
					args.shift()

					const addProperties = {
						command: {
							args,
							trigger
						},
						message: {
							hasLink,
							text
						}
					}
					this.emit(response.event, { ...response.data, ...addProperties }, channelid)
				} else this.emit(response.event, response.data, channelid)
			}
		})

		this.socket.get(channelid).on('error', (error) => {
			if (!this.listener.get(channelid) || this.listenerCount('error') === 0) return
			this.emit('error', error, channelid)
		})

		this.socket.get(channelid).on('close', () => {
			this.close(channelid, this.autoReconnect.get(channelid))

			if (!this.listener.get(channelid) || this.autoReconnect.get(channelid)) return
			else this.emit('closed', channelid)
		})
	}

	public unlisten (channelid: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id && this.chatSocket(id)) this.listener.set(id, false)
	}

	public listen (channelid: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id && this.chatSocket(id)) this.listener.set(id, true)
	}

	/*
	 * Get a list of the chats you are connected to
	 */
	public get connectedChats (): number[] {
		return [ ...this.socket.keys() ]
	}

	/*
	 * Get a specific chat socket
	 */
	public chatSocket (id: number): any {
		return this.socket.get(id)
	}

	/*
	 * Methods to tell the chat server what to do
	 */

	/*
		* Send the server a packet of info
		*/
	private sendPacket (method: string, args: any[], channelid: number, id?: number) {
		const packet: IPacket = {
			arguments: args,
			id: id || 0,
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

	/*
	 * Send a chat message to a channel
	 * The ID in the reply will be 100
	 */
	public sendMessage (message: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			if (message && message.length > 360) {
				const getPart = () => {
					const part = message.substr(0, message.lastIndexOf(' ', 360)).trim()
					this.sendMessage(part, id)
					message = message.replace(part, '').trim()

					setTimeout(() => {
						if (message.length <= 360) {
							if (message.trim().length !== 0) {
								this.sendMessage(message, id)
							}
						} else {
							getPart()
						}
					}, 100)
				}

				getPart()
			} else {
				if (message) this.sendPacket('msg', [ message ], id, 100)
				else {
					this.emit('warning', {
						code: 1000,
						id: 2,
						reason: 'You must specify the message to send',
						warning: "Can't Send Packet"
					})
				}
			}
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Send a whisper message to a user in a channel
	 * The ID in the reply will be 101
	 */
	public sendWhisper (message: string, sendToUser: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			if (message && message.length > 360) {
				const getPart = () => {
					const part = message.substr(0, message.lastIndexOf(' ', 360))
					this.sendWhisper(part, sendToUser, id)
					message = message.replace(part, '')

					setTimeout(() => {
						if (message.length <= 360) {
							if (message.trim().length !== 0) {
								this.sendWhisper(message, sendToUser, id)
							}
						} else {
							getPart()
						}
					}, 100)
				}

				getPart()
			} else {
				if (sendToUser && message) this.sendPacket('whisper', [ sendToUser, message ], id, 101)
				else {
					this.emit('warning', {
						code: 1000,
						id: 2,
						reason: 'You must specify the message and user to send the message to',
						warning: "Can't Send Packet"
					})
				}
			}
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Delete a message
	 * The ID in the reply will be 102
	 */
	public deleteMessage (messageID: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			if (messageID) this.sendPacket('timeout', [ messageID ], id, 102)
			else {
				this.emit('warning', {
					code: 1000,
					id: 2,
					reason: 'You must specify the id of the message to delete',
					warning: "Can't Send Packet"
				})
			}
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Clear chat
	 * The ID in the reply will be 103
	 */
	public clearChat (channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			this.sendPacket('clearMessages', [], id, 103)
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Timeout a user in a channel
	 * The ID in the reply will be 200
	 */
	public timeoutUser (username: string, time: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			if (username && time) this.sendPacket('timeout', [ username, time ], id, 200)
			else {
				this.emit('warning', {
					code: 1000,
					id: 2,
					reason: 'You must specify the user and length of the timeout',
					warning: "Can't Send Packet"
				})
			}
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Purge a user in a channel
	 * The ID in the reply will be 201
	 */
	public purgeUser (username: string, channelid?: number) {
		const id = this.socket.size === 1 ? this.socket.keys().next().value : channelid
		if (id) {
			if (username) this.sendPacket('purge', [ username ], id, 201)
			else {
				this.emit('warning', {
					code: 1000,
					id: 2,
					reason: 'You must specify the user to purge',
					warning: "Can't Send Packet"
				})
			}
		} else {
			this.emit('warning', {
				code: 1000,
				id: 2,
				reason: 'No ChannelID Specified, you MUST specify this when connected to more than one chat',
				warning: "Can't Send Packet"
			})
		}
	}

	/*
	 * Close the connection to a chat
	 */
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
	id: number
}
