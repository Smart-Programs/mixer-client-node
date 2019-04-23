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
    setTokens(tokens) {
        this.client.tokens = tokens;
    }
    refresh() {
        return OAuthClient_1.refreshAuth(this);
    }
    introspect(token) {
        return OAuthClient_1.validateToken(this, token);
    }
    joinChat(channelid) {
        this.chatService.close();
        this.chatService.join(this.user.user.userid, channelid, this.user.tokens.accessToken);
    }
    request(options) {
        RequestHandler_1.requestAPI(options);
    }
}
exports.Client = Client;
