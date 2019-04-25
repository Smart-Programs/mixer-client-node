"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* jshint esversion: 8 */
const request = require("request-promise");
const errors = require("request-promise/errors");
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
        request(options)
            .then(resolve)
            .catch(errors.StatusCodeError, (reason) => {
            if (reason.statusCode === 429) {
                let timeout;
                let header = reason.response.headers['X-RateLimit-Reset'];
                if (header && parseInt(header) !== NaN) {
                    timeout = Number(header) - Date.now().valueOf();
                }
                else {
                    timeout = 3000;
                }
                setTimeout(() => {
                    requestAPI(options);
                }, timeout);
            }
            else {
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
exports.requestAPI = requestAPI;
