import { AuthTokens, refreshAuth, validateToken } from './OAuthClient';
import { RequestOptions, requestAPI } from '../Util/RequestHandler';
import ChatService from '../Services/ChatService';

export class Client {
	private client: ClientType;
	private user: User;
	public chatService: ChatService = new ChatService();

	constructor(client: ClientType, user?: User) {
		this.client = client;
		this.user = user;
	}

	public getClient(): ClientType {
		return this.client;
	}

	public accessToken(): string {
		return this.client.tokens.access;
	}

	public refreshToken(): string {
		return this.client.tokens.refresh;
	}

	public expires(): number {
		return this.client.tokens.expires;
	}

	public setTokens(tokens: AuthTokens) {
		this.client.tokens = tokens;
	}

	public refresh(): Promise<{}> {
		return refreshAuth(this);
	}

	public introspect(token: string): Promise<{}> {
		return validateToken(this, token);
	}

	public joinChat();
	public joinChat(autoReconnect: boolean);
	public joinChat(channelid: number);
	public joinChat(channelid: number, userid: number);
	public joinChat(channelid: number, autoReconnect: boolean);
	public joinChat(channelid: number, userid: number, autoReconnect?: boolean);
	public joinChat(
		channelUserorReconnect?: number | boolean,
		useridOrReconnect?: number | boolean,
		autoReconnect?: boolean
	) {
		if (typeof channelUserorReconnect === 'number') {
			if (typeof useridOrReconnect === 'number') {
				this.chatService.join(
					useridOrReconnect,
					channelUserorReconnect,
					this.client.tokens.access,
					autoReconnect
				);
			} else {
				if (this.user) {
					this.chatService.join(
						this.user.user.userid,
						channelUserorReconnect,
						this.client.tokens.access,
						useridOrReconnect
					);
				}
			}
		} else {
			if (this.user) {
				this.chatService.join(
					this.user.user.userid,
					this.user.user.channelid,
					this.client.tokens.access,
					channelUserorReconnect
				);
			}
		}
	}

	public request(options: RequestOptions) {
		requestAPI(options);
	}
}

export interface ClientType {
	tokens: AuthTokens;
	clientid: string;
	secretid?: string;
}

export interface User {
	user: {
		username: string;
		userid: number;
		channelid: number;
	};
	tokens?: {
		accessToken: string;
		refreshToken: string;
	};
	settings?: {
		ignoredUsers?: Array<String>;
		ignoredMods?: Array<String>;
	};
	_id?: string;
}
