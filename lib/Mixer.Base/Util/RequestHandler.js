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
                setTimeout(() => {
                    requestAPI(options);
                }, Number(reason.response.headers['X-RateLimit-Reset']));
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
