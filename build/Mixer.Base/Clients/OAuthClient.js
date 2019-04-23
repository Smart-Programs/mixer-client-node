"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RequestHandler_1 = require("../Util/RequestHandler");
const OAUTH_BASE_URL = 'https://mixer.com/api/v1/oauth';
function refreshAuth(client) {
    return new Promise((resolve, reject) => {
        let body = {
            grant_type: 'refresh_token',
            refresh_token: client.getClient().tokens.refresh,
            client_id: client.getClient().clientid
        };
        if (client.getClient().secretid) {
            body.client_secret = client.getClient().secretid;
        }
        let options = {
            method: 'POST',
            uri: OAUTH_BASE_URL + '/token',
            body,
            json: true
        };
        RequestHandler_1.requestAPI(options)
            .then((response) => {
            response.expires_in = Date.now() + 1000 * response.expires_in;
            client.setTokens({
                access: response.access_token,
                refresh: response.refresh_token,
                expires: response.expires_in
            });
            resolve(response);
        })
            .catch((error) => {
            reject(error);
        });
    });
}
exports.refreshAuth = refreshAuth;
function validateToken(client, token) {
    return new Promise((resolve, reject) => {
        var options = {
            method: 'POST',
            uri: OAUTH_BASE_URL + '/token/introspect',
            body: {
                token
            },
            json: true
        };
        RequestHandler_1.requestAPI(options)
            .then((response) => {
            if (response.active) {
                if (response.token_type === 'access_token') {
                    client.setTokens({
                        access: client.getClient().tokens.access,
                        refresh: client.getClient().tokens.refresh,
                        expires: response.exp
                    });
                }
                resolve(response);
            }
            else {
                reject({
                    error: 401,
                    message: 'Token is not active'
                });
            }
        })
            .catch((error) => {
            reject(error);
        });
    });
}
exports.validateToken = validateToken;
