"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* jshint esversion: 6 */
const RequestHandler_1 = require("../Util/RequestHandler");
const events_1 = require("events");
const WebSocket = require("ws");
class ChatService extends events_1.EventEmitter {
    constructor() {
        super();
        this.autoReconnect = new Map();
        this.socket = new Map();
        this.listener = new Map();
    }
    join(userid, channelid, accessToken, autoReconnect) {
        if (this.socket.get(channelid))
            this.close(channelid);
        this.userid = userid;
        this.accessToken = accessToken;
        this.autoReconnect.set(channelid, autoReconnect || false);
        this.getChat(channelid, accessToken)
            .then((response) => {
            this.connect(channelid, userid, response.endpoints[0], response.authkey);
        })
            .catch((error) => {
            this.emit('error', error);
        });
    }
    getChat(channelid, accessToken) {
        return new Promise((resolve, reject) => {
            var opts = {
                method: 'GET',
                uri: 'https://mixer.com/api/v1/chats/' + channelid,
                headers: {
                    Authorization: 'Bearer ' + accessToken
                },
                json: true
            };
            RequestHandler_1.requestAPI(opts)
                .then((response) => {
                resolve(response);
            })
                .catch((error) => {
                reject(error);
            });
        });
    }
    connect(channelid, userid, endpoint, authkey) {
        let socket = new WebSocket(endpoint);
        this.socket.set(channelid, socket);
        this.socket.get(channelid).on('open', () => {
            this.emit('join', 'Joining chat ' + channelid + ' with user ' + userid);
            this.sendPacket('auth', [channelid, userid, authkey], channelid);
            this.sendPacket('optOutEvents', ['UserJoin', 'UserLeave'], channelid);
            this.hookEventListeners(channelid, socket);
        });
    }
    hookEventListeners(channelid, socket) {
        this.listener.set(channelid, true);
        socket.on('message', (response) => {
            if (!this.listener)
                return;
            response = JSON.parse(response);
            if (response.type == 'reply') {
                this.emit(response.type, response.error, response.data, channelid);
            }
            else {
                this.emit(response.event, response.data, channelid);
            }
        });
        socket.on('error', (error) => {
            if (!this.listener)
                return;
            this.emit('error', error, channelid);
        });
        socket.on('close', () => {
            if (!this.listener.get(channelid))
                return;
            if (this.autoReconnect)
                this.reconnect(channelid);
            else
                this.emit('closed', channelid);
        });
    }
    unhookEventListeners(channelid) {
        this.listener.set(channelid, false);
    }
    sendPacket(method, args, channelid) {
        let packet = {
            type: 'method',
            method,
            arguments: args
        };
        if (this.socket.get(channelid) && this.socket.get(channelid).readyState === 1) {
            this.socket.get(channelid).send(JSON.stringify(packet), (error) => {
                if (error)
                    this.emit('reply', error, {}, channelid);
            });
        }
    }
    sendMessage(message, channelid) {
        if (this.socket.size === 1)
            channelid = this.socket.values().next().value;
        if (channelid) {
            if (this.socket.get(channelid))
                this.sendPacket('msg', [message], channelid);
            else
                this.emit('error', 'No socket connected', channelid);
        }
        else {
            this.emit('error', 'You must provide a channelid to send a message to when connected to more than one channel');
        }
    }
    reconnect(channelid) {
        if (this.socket.size === 1)
            channelid = this.socket.values().next().value;
        if (channelid) {
            if (this.userid && this.accessToken) {
                this.close(channelid);
                this.join(this.userid, channelid, this.accessToken);
            }
            else {
                this.emit('error', 'You must join a channel first using the join() method');
            }
        }
        else {
            this.emit('error', 'You must provide a channelid to reconnect to when connected to more than one channel');
        }
    }
    close(channelid) {
        if (this.socket.size === 1)
            channelid = this.socket.values().next().value;
        if (channelid && this.socket.get(channelid)) {
            this.unhookEventListeners(channelid);
            this.socket.get(channelid).terminate();
            this.listener.delete(channelid);
            this.socket.delete(channelid);
        }
        else {
            this.emit('error', 'You must provide a channelid to close connection to when connected to more than one channel');
        }
    }
}
exports.default = ChatService;
