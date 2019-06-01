import { IAuthTokens, refreshAuth, validateToken } from './OAuthClient'
import { IRequestOptions, requestAPI } from '../Util/RequestHandler'
import ChatService from '../Services/ChatService'
import ConstellationService from '../Services/ConstellationService'

export class Client {
	private client: IClientType
	private _user: IUser
	private _chatService: ChatService
	private _constellationService: ConstellationService

	constructor (client: IClientType) {
		if (!client.clientid) {
			throw new Error('You must at a minimum provide the clientid in order to use this client')
		}
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

	public get user (): IUser {
		return this._user
	}

	public set user (user: IUser) {
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

	public get tokens (): IAuthTokens {
		return this.client.tokens
	}

	public set tokens (tokens: IAuthTokens) {
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

	public subscribeTo (event: string | string[]) {
		this.constellationService.subscribe(event)
	}

	public unsubscribeTo (event: string | string[]) {
		this.constellationService.unsubscribe(event)
	}

	/*
	 * Chat Related Functions
	 */

	public get chatService (): ChatService {
		if (!this._chatService) this._chatService = new ChatService(this)
		return this._chatService
	}

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

	public connectedChannels (): number[] {
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

	public request (options: IRequestOptions): Promise<{ [key: string]: any }> {
		options.headers = options.headers || {}
		Object.assign(options.headers, {
			'Client-ID': this.client.clientid,
			'User-Agent': "Unsmart's Mixer-Client-Node"
		})
		if (options.auth && this.client.tokens)
			Object.assign(options.headers, { Authorization: 'Bearer ' + this.client.tokens.access })
		options.json = true

		return requestAPI(options)
	}
}

export interface IClientType {
	tokens?: IAuthTokens
	clientid: string
	secretid?: string
	user?: IUser
}

export interface IUser {
	userid: number
	channelid: number
}
