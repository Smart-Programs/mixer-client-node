"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* jshint esversion: 8 */
const limiter = require("simple-rate-limiter");
const request = require("request-promise");
const errors = require("request-promise/errors");
const RequestBuckets_1 = require("./RequestBuckets");
function requestAPI(options) {
    return new Promise((resolve, reject) => {
        if (options.headers) {
            options.headers['User-Agent'] = "Unsmart's Node-Client";
        }
        else {
            options.headers = {
                'User-Agent': "Unsmart's Node-Client"
            };
        }
        options.json = true;
        switch (RequestBuckets_1.getBucket(options.uri, options.method)) {
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
exports.requestAPI = requestAPI;
function globalBucket(options) {
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
            .to(1000)
            .per(60000);
        req();
    });
}
function chatsBucket(options) {
    return new Promise((resolve, reject) => {
        let req = limiter(() => {
            request(options)
                .then((res) => {
                resolve(res);
            })
                .catch(errors.StatusCodeError, (reason) => {
                reject('[Request Error] StatusCode: ' +
                    reason.statusCode +
                    ', Request Body: ' +
                    JSON.stringify(reason.error));
            })
                .catch(errors.RequestError, (reason) => {
                reject('[Request Error] Error: ' + reason.cause);
            });
        })
            .to(500)
            .per(60000);
        req();
    });
}
