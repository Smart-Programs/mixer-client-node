"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise");
const errors = require("request-promise/errors");
function requestAPI(opts) {
    return new Promise((resolve, reject) => {
        let { ['auth']: omit } = opts, options = __rest(opts, ['auth']);
        request(options)
            .then(resolve)
            .catch(errors.StatusCodeError, (reason) => {
            if (reason.statusCode === 429) {
                let timeout;
                let header = +reason.response.headers['X-RateLimit-Reset'];
                timeout = isNaN(header) ? Number(header) - Date.now().valueOf() : 3000;
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
