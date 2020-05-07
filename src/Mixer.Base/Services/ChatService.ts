import { IRequestOptions } from '../Util/RequestHandler'
import { EventEmitter } from 'events'
import { Client } from '../Clients/Client'
import { mergeDeep, toJSON } from '../Util/HelperFunctions'

let WebSocket

if (typeof window === 'undefined') WebSocket = require('ws')
else WebSocket = window.WebSocket

class ChatService extends EventEmitter {
    private autoReconnect = new Map<number, boolean>()
    private socket = new Map<number, WebSocket>()
    private listener = new Map<number, any>()
    private currentId = 0
    private client: Client

    constructor (client: Client) {
        super()
        this.client = client
    }

    /*
     * Join a chat
     */
    public join (
        userid: number,
        channelid: number,
        autoReconnect: boolean = false
    ): Promise<WebSocket> {
        return new Promise(async (resolve, deny) => {
            if (!this.client.user || userid !== this.client.user.userid) {
                let id: number
                if (this.client.user) id = this.client.user.channelid
                this.client.user = {
                    channelid: id || channelid,
                    userid,
                }
            }

            if (this.socket.get(channelid)) this.close(channelid, false)

            try {
                resolve(await this.connectTheChat(channelid, autoReconnect))
            } catch (error) {
                if (this.listenerCount('error') === 0) deny(error)
                else this.emit('error', error, channelid)
            }
        })
    }
    
    public joinWithAuthKey({userid, channelid, authKey, endpoints, autoReconnect = true}) {
        if (!this.client.user || userid !== this.client.user.userid) {
            let id: number
            if (this.client.user) id = this.client.user.channelid
            this.client.user = {
                channelid: id || channelid,
                userid,
            }
        }
        
        if (!userid) userid = this.client.user.userid
        if (!channelid) channelid = this.client.user.channelid
        
        if (!authKey) {
            return this.emit('error', "No AuthKey", channelid)
        } else if (!endpoints || !endpoints.length) {
            return this.emit('error', "No Enpoints", channelid)
        }
        
        if (this.socket.get(channelid)) this.close(channelid, false)
        
        this.autoReconnect.set(channelid, autoReconnect)
        this.socket.set(
            channelid,
            new WebSocket(endpoints[0])
        )
        this.hookEventListeners(channelid, authKey)
    }

    private connectTheChat (
        channelid: number,
        autoReconnect: boolean
    ): Promise<WebSocket> {
        return new Promise(async (resolve, deny) => {
            const chatRequest: IRequestOptions = {
                auth: true,
                method: 'GET',
                uri: 'https://mixer.com/api/v1/chats/' + channelid,
            }

            try {
                const response = await this.client.request(chatRequest)
                if (!response.authkey) {
                    deny({
                        code: 401,
                        error: 'Not Authenticated',
                        id: 1,
                        message:
                            'You must be authenticated to connect to a chat!',
                    })
                } else {
                    this.autoReconnect.set(channelid, autoReconnect)
                    this.socket.set(
                        channelid,
                        new WebSocket(response.endpoints[0])
                    )
                    this.hookEventListeners(channelid, response.authkey)
                    resolve(this.socket.get(channelid))
                }
            } catch (error) {
                deny(error)
            }
        })
    }

    /*
     * Ping the chat socket to not disconnect
     */
    private timeout: NodeJS.Timeout
    private pingId: number
    private ping (channelid: number) {
        if (this.timeout) clearTimeout(this.timeout)

        this.timeout = setTimeout(() => {
            if (this.socket.get(channelid)) {
                if (this.socket.get(channelid).readyState !== 1)
                    this.emit('error', { socket: 'Closed', from: 'Ping' })
                else {
                    if (this.currentId > 100000000) this.currentId = 0
                    this.pingId = ++this.currentId
                    this.sendPacket('ping', null, channelid, this.pingId)
                }
            }
        }, 1000 * 60)
    }

    /*
     * Setup the event listeners for the sockets
     */
    private hookEventListeners (channelid: number, authkey: string) {
        this.listener.set(channelid, true)

        this.socket.get(channelid).addEventListener('open', () => {
            this.sendPacket(
                'auth',
                [channelid, this.client.user.userid, authkey],
                channelid,
                0
            )
            this.ping(channelid)
        })

        this.socket.get(channelid).addEventListener('message', (data) => {
            if (!this.listener.get(channelid) || this.eventNames().length === 0)
                return

            const response: { [key: string]: any } = toJSON(data.data)
            if (response.type === 'reply') {
                if (
                    response.data &&
                    response.data.hasOwnProperty('authenticated')
                ) {
                    if (
                        response.data.authenticated === true &&
                        response.id === 0
                    ) {
                        this.emit('joined', {
                            connectedTo: channelid,
                            userConnected: this.client.user.userid,
                        })
                    } else {
                        this.close(channelid, false)
                        this.emit(
                            'error',
                            {
                                code: 401,
                                error: 'Not Authenticated',
                                id: 2,
                                message:
                                    'You must be authenticated to connect to a chat!',
                            },
                            channelid
                        )
                    }
                } else {
                    if (response.id === this.pingId) this.ping(channelid)
                    else
                        this.emit(
                            response.type,
                            response.error,
                            response.data,
                            channelid
                        )
                }
            } else {
                if (response.event === 'ChatMessage') {
                    const messageMeta = response.data.message.meta
                    const messageResponse = response.data.message.message
                    const hasLink =
                        messageResponse.filter((part) => part.type === 'link')
                            .length > 0
                    const isWhisper = messageMeta.whisper ? true : false
                    const text: string = messageResponse
                        .map((part) => part.text)
                        .join('')
                        .replace(/\r?\n|\r/g, '')
                        .trim()
                    const tags = messageResponse
                        .filter((part) => part.type === 'tag')
                        .map((tag) => tag.username)
                    const message = { hasLink, text, tags, isWhisper }

                    const isCommand = text.startsWith('!')
                    const trigger = isCommand ? text.split(' ')[0] : undefined
                    const args: string[] = isCommand
                        ? text.split(' ').slice(1)
                        : undefined
                    const command = isCommand ? { args, trigger } : undefined

                    const isSkill = messageMeta.is_skill ? true : false
                    const skillType = isSkill
                        ? messageMeta.skill.currency
                        : undefined
                    const skillCost = isSkill
                        ? messageMeta.skill.cost
                        : undefined
                    const skillImage = isSkill
                        ? messageMeta.skill.icon_url
                        : undefined
                    const skillName = isSkill
                        ? messageMeta.skill.skill_name
                        : undefined
                    const skillId = isSkill
                        ? messageMeta.skill.skill_id
                        : undefined
                    const skillMessage = isSkill
                        ? text.replace(skillName, '')
                        : undefined
                    const skill = isSkill
                        ? {
                              cost: skillCost,
                              id: skillId,
                              image: skillImage,
                              message: skillMessage,
                              name: skillName,
                              type: skillType,
                          }
                        : undefined

                    const addProperties = { command, message, skill }

                    this.emit(
                        response.event,
                        mergeDeep(response.data, addProperties),
                        channelid
                    )
                } else this.emit(response.event, response.data, channelid)
            }
        })

        this.socket.get(channelid).addEventListener('error', (error) => {
            if (
                !this.listener.get(channelid) ||
                this.listenerCount('error') === 0
            )
                return
            this.emit('error', error, channelid)
        })

        this.socket.get(channelid).addEventListener('close', (data) => {
            this.close(channelid, this.autoReconnect.get(channelid))

            if (
                this.listener.get(channelid) &&
                !this.autoReconnect.get(channelid)
            )
                this.emit('closed', channelid, {
                    code: data.code,
                    reason: data.reason,
                })
        })
    }

    public unlisten (channelid: number) {
        const id =
            this.socket.size === 1 ? this.socket.keys().next().value : channelid
        if (id && this.chatSocket(id)) this.listener.set(id, false)
    }

    public listen (channelid: number) {
        const id =
            this.socket.size === 1 ? this.socket.keys().next().value : channelid
        if (id && this.chatSocket(id)) this.listener.set(id, true)
    }

    /*
     * Get a list of the chats you are connected to
     */
    public get connectedChats (): number[] {
        return [...this.socket.keys()]
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
    public sendPacket (
        method: string,
        args: any[],
        channelid: number,
        id: number = 0
    ) {
        const packet: IPacket = {
            arguments: args,
            id,
            method,
            type: 'method',
        }
        if (this.socket.get(channelid)) {
            if (this.socket.get(channelid).readyState === 1)
                this.socket.get(channelid).send(JSON.stringify(packet))
            else {
                this.emit('warning', {
                    channelid,
                    code: 1000,
                    id: 3,
                    packet: {
                        args,
                        channelid,
                        id,
                        method,
                    },
                    reason: 'Socket is Closed',
                    warning: "Can't Send Packet",
                })
            }
        } else {
            this.emit('warning', {
                channelid,
                code: 1000,
                id: 1,
                packet: {
                    args,
                    channelid,
                    id,
                    method,
                },
                reason: 'No Socket Found',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Send a chat message to a channel
     */
    public sendMessage (
        message: string,
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            if (message && message.length > 360) {
                const getPart = () => {
                    const part = message
                        .substr(0, message.lastIndexOf(' ', 360))
                        .trim()
                    this.sendMessage(part, channelid)
                    message = message.replace(part, '').trim()

                    setTimeout(() => {
                        if (message.length <= 360) {
                            if (message.trim().length !== 0) {
                                this.sendMessage(message, channelid)
                            }
                        } else {
                            getPart()
                        }
                    }, 100)
                }

                getPart()
            } else {
                if (message) {
                    this.sendPacket(
                        'msg',
                        [message],
                        channelid,
                        ++this.currentId
                    )
                } else {
                    this.emit('warning', {
                        code: 1000,
                        id: 2,
                        reason: 'You must specify the message to send',
                        warning: "Can't Send Packet",
                    })
                }
            }
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Send a whisper message to a user in a channel
     */
    public sendWhisper (
        message: string,
        sendToUser: string,
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            if (message && message.length > 360) {
                const getPart = () => {
                    const part = message.substr(
                        0,
                        message.lastIndexOf(' ', 360)
                    )
                    this.sendWhisper(part, sendToUser, channelid)
                    message = message.replace(part, '')

                    setTimeout(() => {
                        if (message.length <= 360) {
                            if (message.trim().length !== 0) {
                                this.sendWhisper(message, sendToUser, channelid)
                            }
                        } else {
                            getPart()
                        }
                    }, 100)
                }

                getPart()
            } else {
                if (sendToUser && message) {
                    this.sendPacket(
                        'whisper',
                        [sendToUser, message],
                        channelid,
                        ++this.currentId
                    )
                } else {
                    this.emit('warning', {
                        code: 1000,
                        id: 2,
                        reason:
                            'You must specify the message and user to send the message to',
                        warning: "Can't Send Packet",
                    })
                }
            }
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Delete a message
     */
    public deleteMessage (
        messageID: string,
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            if (messageID) {
                this.sendPacket(
                    'delelteMessage',
                    [messageID],
                    channelid,
                    ++this.currentId
                )
            } else {
                this.emit('warning', {
                    code: 1000,
                    id: 2,
                    reason: 'You must specify the id of the message to delete',
                    warning: "Can't Send Packet",
                })
            }
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Clear chat
     */
    public clearChat (
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            this.sendPacket('clearMessages', [], channelid, ++this.currentId)
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Timeout a user in a channel
     */
    public timeoutUser (
        username: string,
        time: string,
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            if (username && time) {
                this.sendPacket(
                    'timeout',
                    [username, time],
                    channelid,
                    ++this.currentId
                )
            } else {
                this.emit('warning', {
                    code: 1000,
                    id: 2,
                    reason:
                        'You must specify the user and length of the timeout',
                    warning: "Can't Send Packet",
                })
            }
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Purge a user in a channel
     */
    public purgeUser (
        username: string,
        channelid = this.socket.size === 1 ? this.socket.keys().next().value : 0
    ) {
        if (this.socket.get(channelid)) {
            if (username) {
                this.sendPacket(
                    'purge',
                    [username],
                    channelid,
                    ++this.currentId
                )
            } else {
                this.emit('warning', {
                    code: 1000,
                    id: 2,
                    reason: 'You must specify the user to purge',
                    warning: "Can't Send Packet",
                })
            }
        } else {
            this.emit('warning', {
                code: 1000,
                id: 2,
                reason:
                    'No ChannelID Specified, you MUST specify this when connected to more than one chat',
                warning: "Can't Send Packet",
            })
        }
    }

    /*
     * Close the connection to a chat
     */
    public close (
        channelid = this.socket.size === 1
            ? this.socket.keys().next().value
            : 0,
        rejoin = false
    ) {
        if (this.socket.get(channelid)) {
            const reconnectSetting = this.autoReconnect.get(channelid)
            this.listener.set(channelid, false)
            this.socket.get(channelid).close()

            this.autoReconnect.delete(channelid)
            this.listener.delete(channelid)
            this.socket.delete(channelid)
            if (rejoin)
                this.join(this.client.user.userid, channelid, reconnectSetting)
        } else {
            this.emit('warning', {
                code: 1001,
                id: 1,
                reason:
                    'You MUST provide a valid channelid to close connection to',
                warning: 'ChannelID to Close to Not Specified or Found',
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
