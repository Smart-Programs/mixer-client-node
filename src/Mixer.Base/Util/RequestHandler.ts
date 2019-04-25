/* jshint esversion: 8 */
import request = require('request-promise');
import errors = require('request-promise/errors');

export function requestAPI(options: RequestOptions) {
	return new Promise((resolve, reject) => {
		if (options.headers) {
			options.headers['User-Agent'] = "Unsmart's Node-Client";
		} else {
			options.headers = {
				'User-Agent': "Unsmart's Node-Client"
			};
		}

		options.json = true;

		request(options)
			.then(resolve)
			.catch(errors.StatusCodeError, (reason) => {
				if (reason.statusCode === 429) {
					let timeout: number = 3000;
					let header = +reason.response.headers['X-RateLimit-Reset'];
					if (isNaN(header)) {
						timeout = Number(header) - Date.now().valueOf();
					}
					setTimeout(() => {
						requestAPI(options);
					}, timeout);
				} else {
					reject({
						statusCode: reason.statusCode,
						error: reason.error
					});
				}
			})
			.catch(errors.RequestError, (reason) => {
				reject({
					statusCode: reason.response.statusCode,
					error: reason.cause
				});
			});
	});
}

export interface RequestOptions {
	method: httpRequest;
	uri: string;
	headers?: object;
	body?: object;
	json?: boolean;
}

type httpRequest = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
