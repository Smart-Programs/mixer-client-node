import { IRequestOptions } from '../Util/RequestHandler'
import { Client } from './Client'

const OAUTH_BASE_URL = 'https://mixer.com/api/v1/oauth'

export interface IAuthTokens {
	access: string
	refresh?: string
	expires?: number
}

export function refreshAuth (client: Client) {
	return new Promise((resolve, reject) => {
		if (!client.refreshToken) {
			return reject({
				error: 'Invalid Request',
				message: 'No refresh token available',
				statusCode: 400
			})
		}
		const body: IRefreshAuthBody = {
			client_id: client.clientid,
			grant_type: 'refresh_token',
			refresh_token: client.refreshToken
		}

		if (client.secretid) body.client_secret = client.secretid

		const options: IRequestOptions = {
			body,
			method: 'POST',
			uri: OAUTH_BASE_URL + '/token'
		}

		client
			.request(options)
			.then((response: IRefreshAuthResponse) => {
				client.tokens = {
					access: response.access_token,
					expires: (Date.now() + 1000 * response.expires_in) / 1000,
					refresh: response.refresh_token
				}
				resolve(response)
			})
			.catch((error) => {
				reject(error)
			})
	})
}

export function validateToken (client: Client, token: string) {
	return new Promise((resolve, reject) => {
		const options: IRequestOptions = {
			body: {
				token
			},
			method: 'POST',
			uri: OAUTH_BASE_URL + '/token/introspect'
		}

		client
			.request(options)
			.then((response: IValidateTokenResponse) => {
				if (response.active) {
					if (response.token_type === 'access_token' && token === client.accessToken) {
						client.tokens = {
							access: client.accessToken,
							expires: response.exp,
							refresh: client.refreshToken
						}

						client.user = {
							channelid: client.user.channelid,
							userid: response.sub
						}

						client.clientid = response.client_id
					}
					resolve(response)
				} else {
					reject({
						error: 'Token is not active',
						statusCode: 401
					})
				}
			})
			.catch(reject)
	})
}

interface IValidateTokenResponse {
	active: boolean
	client_id: string
	token_type?: string
	exp?: number
	sub: number
}

interface IRefreshAuthBody {
	grant_type: string
	refresh_token: string
	client_id: string
	client_secret?: string
}

interface IRefreshAuthResponse {
	access_token: string
	refresh_token: string
	expires_in: number
}
