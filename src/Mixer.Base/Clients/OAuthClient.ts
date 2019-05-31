import { RequestOptions } from '../Util/RequestHandler'
import { Client } from './Client'

const OAUTH_BASE_URL = 'https://mixer.com/api/v1/oauth'

export interface AuthTokens {
	access: string
	refresh?: string
	expires?: number
}

export function refreshAuth (client: Client) {
	return new Promise((resolve, reject) => {
		if (!client.refreshToken) {
			return reject({
				statusCode: 400,
				error: 'Invalid Request',
				message: 'No refresh token available'
			})
		}
		let body: RefreshAuthBody = {
			grant_type: 'refresh_token',
			refresh_token: client.refreshToken,
			client_id: client.clientid
		}

		if (client.secretid) body.client_secret = client.secretid

		let options: RequestOptions = {
			method: 'POST',
			uri: OAUTH_BASE_URL + '/token',
			body
		}

		client
			.request(options)
			.then((response: RefreshAuthResponse) => {
				client.tokens = {
					access: response.access_token,
					refresh: response.refresh_token,
					expires: (Date.now() + 1000 * response.expires_in) / 1000
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
		var options: RequestOptions = {
			method: 'POST',
			uri: OAUTH_BASE_URL + '/token/introspect',
			body: {
				token
			}
		}

		client
			.request(options)
			.then((response: ValidateTokenResponse) => {
				if (response.active) {
					if (response.token_type === 'access_token') {
						client.tokens = {
							access: client.accessToken,
							refresh: client.refreshToken,
							expires: response.exp
						}
					}
					resolve(response)
				} else {
					reject({
						statusCode: 401,
						error: 'Token is not active'
					})
				}
			})
			.catch(reject)
	})
}

interface ValidateTokenResponse {
	active: boolean
	token_type?: string
	exp?: number
}

interface RefreshAuthBody {
	grant_type: string
	refresh_token: string
	client_id: string
	client_secret?: string
}

interface RefreshAuthResponse {
	access_token: string
	refresh_token: string
	expires_in: number
}
