"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OAUTH_BASE_URL = 'https://mixer.com/api/v1/oauth';
function refreshAuth(client) {
    return new Promise((resolve, reject) => {
        if (!client.getClient().tokens.refresh) {
            return reject({
                statusCode: 400,
                error: 'Invalid Request',
                message: 'No refresh token available'
            });
        }
        let body = {
            grant_type: 'refresh_token',
            refresh_token: client.getClient().tokens.refresh,
            client_id: client.getClient().clientid
        };
        if (client.getClient().secretid)
            body.client_secret = client.getClient().secretid;
        let options = {
            method: 'POST',
            uri: OAUTH_BASE_URL + '/token',
            body
        };
        client
            .request(options)
            .then((response) => {
            client.setTokens({
                access: response.access_token,
                refresh: response.refresh_token,
                expires: (Date.now() + 1000 * response.expires_in) / 1000
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
            }
        };
        client
            .request(options)
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
                    statusCode: 401,
                    error: 'Token is not active'
                });
            }
        })
            .catch(reject);
    });
}
exports.validateToken = validateToken;
