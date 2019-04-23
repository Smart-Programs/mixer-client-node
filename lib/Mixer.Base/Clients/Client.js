"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OAuthClient_1 = require("./OAuthClient");
const RequestHandler_1 = require("../Util/RequestHandler");
const ChatService_1 = require("../Services/ChatService");
class Client {
    constructor(client, user) {
        this.chatService = new ChatService_1.default();
        this.client = client;
        this.user = user;
    }
    getClient() {
        return this.client;
    }
    accessToken() {
        return this.client.tokens.access;
    }
    refreshToken() {
        return this.client.tokens.refresh;
    }
    expires() {
        return this.client.tokens.expires;
    }
    setTokens(tokens) {
        this.client.tokens = tokens;
    }
    refresh() {
        return OAuthClient_1.refreshAuth(this);
    }
    introspect(token) {
        return OAuthClient_1.validateToken(this, token);
    }
    joinChat(channelUserorReconnect, useridOrReconnect, autoReconnect) {
        this.chatService.close();
        if (typeof channelUserorReconnect === 'number') {
            if (typeof useridOrReconnect === 'number') {
                this.chatService.join(useridOrReconnect, channelUserorReconnect, this.client.tokens.access, autoReconnect);
            }
            else {
                if (this.user) {
                    this.chatService.join(this.user.user.userid, channelUserorReconnect, this.client.tokens.access, useridOrReconnect);
                }
            }
        }
        else {
            if (this.user) {
                this.chatService.join(this.user.user.userid, this.user.user.channelid, this.client.tokens.access, channelUserorReconnect);
            }
        }
    }
    request(options) {
        RequestHandler_1.requestAPI(options);
    }
}
exports.Client = Client;
