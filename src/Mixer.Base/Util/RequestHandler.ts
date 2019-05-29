import request = require('request-promise')
import errors = require('request-promise/errors')

export function requestAPI (opts: RequestOptions) {
	return new Promise((resolve, reject) => {
		let { ['auth']: omit, ...options } = opts

		request(options)
			.then(resolve)
			.catch(errors.StatusCodeError, (reason) => {
				if (reason.statusCode === 429) {
					let timeout: number
					let header = +reason.response.headers['X-RateLimit-Reset']
					timeout = isNaN(header) ? Number(header) - Date.now().valueOf() : 3000
					setTimeout(() => {
						requestAPI(options)
					}, timeout)
				} else {
					reject({
						statusCode: reason.statusCode,
						error: reason.error
					})
				}
			})
			.catch(errors.RequestError, (reason) => {
				reject({
					statusCode: reason.response.statusCode,
					error: reason.cause
				})
			})
	})
}

export interface RequestOptions {
	method: httpRequest
	uri: string
	headers?: object
	body?: object
	auth?: boolean
	json?: boolean
}

type httpRequest = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
