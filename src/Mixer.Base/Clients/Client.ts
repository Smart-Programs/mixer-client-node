import { AuthTokens, refreshAuth, validateToken } from './OAuthClient'
import { RequestOptions, requestAPI } from '../Util/RequestHandler'
import ChatService from '../Services/ChatService'
import ConstellationService from '../Services/ConstellationService'

export class Client {
	private client: ClientType
	private user: User
	private chat: ChatService
	private constellation: ConstellationService

	constructor (client: ClientType) {
		this.client = client
		this.user = client.user
	}

	/*
	 * Client Related Functions
	 */

	public get clientid (): string {
		return this.client.clientid
	}

	public get secretid (): string {
		return this.client.secretid
	}

	/*
	 * Authentication Related Functions
	 */

	public get accessToken (): string {
		if (this.client.tokens) return this.client.tokens.access
		else return undefined
	}

	public get refreshToken (): string {
		if (this.client.tokens) return this.client.tokens.refresh
		else return undefined
	}

	public get tokens (): AuthTokens {
		return this.client.tokens
	}

	public set tokens (tokens: AuthTokens) {
		this.client.tokens = tokens
	}

	public get expires (): number {
		if (this.client.tokens) return this.client.tokens.expires
		else return undefined
	}

	public refresh (): Promise<{}> {
		return refreshAuth(this)
	}

	public introspect (token: string): Promise<{}> {
		return validateToken(this, token)
	}

	/*
	 * Constellation Related Functions
	 */

	public get constellationService (): ConstellationService {
		if (!this.constellation) this.constellation = new ConstellationService(this.client.clientid)
		return this.constellation
	}

	public subscribeTo (event: string | Array<string>) {
		this.constellationService.subscribe(event)
	}

	/*
	 * Chat Related Functions
	 */

	public get chatService (): ChatService {
		if (!this.chat) this.chat = new ChatService(this)
		return this.chat
	}

	public joinChat ()
	public joinChat (autoReconnect: boolean)
	public joinChat (channelid: number)
	public joinChat (channelid: number, userid: number)
	public joinChat (channelid: number, autoReconnect: boolean)
	public joinChat (channelid: number, userid: number, autoReconnect: boolean)
	public joinChat (
		channelidOrReconnect?: number | boolean,
		useridOrReconnect?: number | boolean,
		autoReconnect?: boolean
	) {
		let channelid: number
		let userid: number
		let reconnect: boolean

		if (typeof channelidOrReconnect === 'number') {
			channelid = channelidOrReconnect
			typeof useridOrReconnect !== 'number'
				? () => {
						userid = this.user.userid
						reconnect = autoReconnect || false
					}
				: () => {
						userid = useridOrReconnect
						reconnect = autoReconnect || false
					}
		} else if (this.user) {
			channelid = this.user.channelid
			userid = this.user.userid
			reconnect = typeof channelidOrReconnect === 'boolean' ? channelidOrReconnect : false
		} else if (!this.client.tokens || !channelid || !userid) {
			throw new Error(
				"Can't join the chat, please make sure you provide all the proper parameters, or make sure user is defined when you create a client, also make sure that you defined tokens to use to be able to join the chat authenticated"
			)
		}

		this.chatService.join(userid, channelid, reconnect)
	}

	/*
	 * Misc Functions
	 */

	public request (options: RequestOptions): Promise<{ [key: string]: any }> {
		options.headers = options.headers || {}
		Object.assign(options.headers, {
			'User-Agent': "Unsmart's Mixer-Client-Node",
			'Client-ID': this.client.clientid
		})
		if (options.auth && this.client.tokens)
			Object.assign(options.headers, { Authorization: 'Bearer ' + this.client.tokens.access })
		options.json = true

		return requestAPI(options)
	}
}

export interface ClientType {
	tokens?: AuthTokens
	clientid: string
	secretid?: string
	user?: User
}

export interface User {
	userid: number
	channelid: number
}
