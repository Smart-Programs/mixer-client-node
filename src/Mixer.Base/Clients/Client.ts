import { AuthTokens, refreshAuth, validateToken } from './OAuthClient'
import { RequestOptions, requestAPI } from '../Util/RequestHandler'
import ChatService from '../Services/ChatService'
import ConstellationService from '../Services/ConstellationService'

export class Client {
	private client: ClientType
	private _user: User
	private _chatService: ChatService
	private _constellationService: ConstellationService

	constructor (client: ClientType) {
		this.client = client
		this.user = client.user
	}

	/*
	 * Client/User Related Functions
	 */

	public get clientid (): string {
		return this.client.clientid
	}

	public get secretid (): string {
		return this.client.secretid
	}

	public get user (): User {
		return this._user
	}

	public set user (user: User) {
		this._user = user
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

	public get didExpire (): boolean {
		if (this.expires) return this.expires * 1000 >= Date.now()
		else return true
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
		if (!this._constellationService) this._constellationService = new ConstellationService(this.client.clientid)
		return this._constellationService
	}

	public subscribeTo (event: string | Array<string>) {
		this.constellationService.subscribe(event)
	}

	public unsubscribeTo (event: string | Array<string>) {
		this.constellationService.unsubscribe(event)
	}

	/*
	 * Chat Related Functions
	 */

	public get chatService (): ChatService {
		if (!this._chatService) this._chatService = new ChatService(this)
		return this._chatService
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
			if (typeof useridOrReconnect === 'number') {
				userid = useridOrReconnect
				reconnect = autoReconnect || false
			} else {
				userid = this.user.userid
				reconnect = autoReconnect || false
			}
		} else if (this.user) {
			channelid = this.user.channelid
			userid = this.user.userid
			reconnect = typeof channelidOrReconnect === 'boolean' ? channelidOrReconnect : false
		}

		this.chatService.join(userid, channelid, reconnect)
	}

	public connectedChannels (): Array<number> {
		return this.chatService.getChats()
	}

	public sendChat (message: string, channelid?: number) {
		this.chatService.sendMessage(message, channelid)
	}

	public closeChat (channelid?: number) {
		this.chatService.close(channelid)
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
