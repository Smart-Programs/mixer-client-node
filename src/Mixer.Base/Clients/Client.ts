import { AuthTokens, refreshAuth, validateToken } from './OAuthClient'
import { RequestOptions, requestAPI } from '../Util/RequestHandler'
import ChatService from '../Services/ChatService'
import ConstellationService from '../Services/ConstellationService'

export class Client {
	private client: ClientType
	private user: User
	public chatService: ChatService
	public constellationService: ConstellationService

	constructor (client: ClientType, user?: User) {
		this.client = client
		this.user = user
		this.constellationService = new ConstellationService(client.clientid)
		this.chatService = new ChatService(this)
	}

	public getClient (): ClientType {
		return this.client
	}

	public accessToken (): string {
		return this.client.tokens.access
	}

	public refreshToken (): string {
		return this.client.tokens.refresh
	}

	public getTokens (): AuthTokens {
		return this.client.tokens
	}

	public setTokens (tokens: AuthTokens): AuthTokens {
		this.client.tokens = tokens
		return this.getTokens()
	}

	public expires (): number {
		return this.client.tokens.expires
	}

	public refresh (): Promise<{}> {
		return refreshAuth(this)
	}

	public introspect (token: string): Promise<{}> {
		return validateToken(this, token)
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
			if (this.user) this.chatService.join(this.user.userid, this.user.channelid, channelidOrReconnect)
		} else if (!this.client.tokens || !channelid || !userid)
			return new Error(
				"Can't join the chat, please make sure you provide all the proper parameters, or make sure user is defined when you create a client, also make sure that you defined tokens to use to be able to join the chat authenticated"
			)

		this.chatService.join(userid, channelid, reconnect)
	}

	public request (options: RequestOptions): Promise<{ [key: string]: any }> {
		options.headers = options.headers || {}
		Object.assign(options.headers, {
			'User-Agent': "Unsmart's Mixer-Client-Node",
			'Client-ID': this.client.clientid
		})
		if (options.auth) Object.assign(options.headers, { Authorization: 'Bearer ' + this.client.tokens.access })
		options.json = true

		return requestAPI(options)
	}
}

export interface ClientType {
	tokens?: AuthTokens
	clientid: string
	secretid?: string
}

export interface User {
	userid: number
	channelid: number
}
