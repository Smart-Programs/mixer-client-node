"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OAuthClient_1 = require("./OAuthClient");
const RequestHandler_1 = require("../Util/RequestHandler");
const ChatService_1 = require("../Services/ChatService");
const ConstellationService_1 = require("../Services/ConstellationService");
class Client {
    constructor(client, user) {
        this.client = client;
        this.user = user;
        this.constellationService = new ConstellationService_1.default(client.clientid);
        this.chatService = new ChatService_1.default(client.clientid);
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
    getTokens() {
        return this.client.tokens;
    }
    setTokens(tokens) {
        this.client.tokens = tokens;
        return this.getTokens();
    }
    expires() {
        return this.client.tokens.expires;
    }
    refresh() {
        return OAuthClient_1.refreshAuth(this);
    }
    introspect(token) {
        return OAuthClient_1.validateToken(this, token);
    }
    joinChat(channelidOrReconnect, useridOrReconnect, autoReconnect) {
        let channelid;
        let userid;
        let reconnect;
        if (typeof channelidOrReconnect === 'number') {
            channelid = channelidOrReconnect;
            typeof useridOrReconnect !== 'number'
                ? () => {
                    userid = this.user.userid;
                    reconnect = autoReconnect || false;
                }
                : () => {
                    userid = useridOrReconnect;
                    reconnect = autoReconnect || false;
                };
        }
        else if (this.user) {
            channelid = this.user.channelid;
            userid = this.user.userid;
            reconnect = typeof channelidOrReconnect === 'boolean' ? channelidOrReconnect : false;
            if (this.user)
                this.chatService.join(this.user.userid, this.user.channelid, this.client.tokens.access, channelidOrReconnect);
        }
        else if (!this.client.tokens || !channelid || !userid)
            return new Error("Can't join the chat, please make sure you provide all the proper parameters, or make sure user is defined when you create a client, also make sure that you defined tokens to use to be able to join the chat authenticated");
        this.chatService.join(userid, channelid, this.client.tokens.access, reconnect);
    }
    request(options) {
        options.headers = options.headers || {};
        Object.assign(options.headers, {
            'User-Agent': "Unsmart's Mixer-Client-Node",
            'Client-ID': this.client.clientid
        });
        if (options.auth)
            Object.assign(options.headers, { Authorization: 'Bearer ' + this.client.tokens.access });
        options.json = true;
        return RequestHandler_1.requestAPI(options);
    }
}
exports.Client = Client;
