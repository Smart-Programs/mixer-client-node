/* jshint esversion: 8 */
import limiter = require('simple-rate-limiter');
import request = require('request-promise');
import errors = require('request-promise/errors');
import { getBucket } from './RequestBuckets';

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

		switch (getBucket(options.uri, options.method)) {
			case 'chats':
				chatsBucket(options)
					.then((res) => {
						resolve(res);
					})
					.catch((err) => {
						reject(err);
					});
				break;
			default:
				globalBucket(options)
					.then((res) => {
						resolve(res);
					})
					.catch((err) => {
						reject(err);
					});
				break;
		}
	});
}

function globalBucket(options: RequestOptions) {
	return new Promise((resolve, reject) => {
		let req = limiter(() => {
			request(options)
				.then((res) => {
					resolve(res);
				})
				.catch(errors.StatusCodeError, (reason) => {
					reject({
						statusCode: reason.statusCode,
						error: reason.error
					});
				})
				.catch(errors.RequestError, (reason) => {
					reject({
						statusCode: reason.response.statusCode,
						error: reason.cause
					});
				});
		})
			.to(950)
			.per(60000);
		req();
	});
}

function chatsBucket(options: RequestOptions) {
	return new Promise((resolve, reject) => {
		let req = limiter(() => {
			request(options)
				.then((res) => {
					resolve(res);
				})
				.catch(errors.StatusCodeError, (reason) => {
					reject({
						statusCode: reason.statusCode,
						error: reason.error
					});
				})
				.catch(errors.RequestError, (reason) => {
					reject({
						statusCode: reason.response.statusCode,
						error: reason.cause
					});
				});
		})
			.to(450)
			.per(60000);
		req();
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
