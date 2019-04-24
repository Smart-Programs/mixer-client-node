"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* jshint esversion: 6 */
const RequestHandler_1 = require("../Util/RequestHandler");
const events_1 = require("events");
const WebSocket = require("ws");
class ChatService extends events_1.EventEmitter {
    constructor() {
        super();
    }
    join(userid, channelid, accessToken, autoReconnect) {
        this.userid = userid;
        this.channelid = channelid;
        this.accessToken = accessToken;
        this.autoReconnect = autoReconnect;
        if (this.socket) {
            this.emit('error', 'Chat socket already opened');
        }
        else {
            this.getChat(channelid, accessToken)
                .then((response) => {
                this.endpoint = response.endpoints[0];
                this.authkey = response.authkey;
                this.connect(channelid, userid);
            })
                .catch((error) => {
                this.emit('error', error);
            });
        }
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
    connect(channelid, userid) {
        let socket = new WebSocket(this.endpoint);
        this.socket = socket;
        this.socket.on('open', () => {
            this.emit('join', 'Joining chat ' + channelid + ' with user ' + userid);
            this.sendPacket('auth', [channelid, userid, this.authkey]);
            this.sendPacket('optOutEvents', ['UserJoin', 'UserLeave']);
            this.hookEventListeners(socket);
        });
    }
    hookEventListeners(socket) {
        this.listener = true;
        socket.on('message', (response) => {
            if (!this.listener)
                return;
            response = JSON.parse(response);
            if (response.type == 'reply') {
                this.emit(response.type, response.error, response.data);
            }
            else {
                this.emit(response.event, response.data);
            }
        });
        socket.on('error', (error) => {
            if (!this.listener)
                return;
            this.emit('error', error);
        });
        socket.on('close', () => {
            if (!this.listener)
                return;
            if (this.autoReconnect)
                this.reconnect();
            else
                this.emit('closed');
        });
    }
    unhookEventListners() {
        this.listener = false;
    }
    sendPacket(method, args) {
        let packet = {
            type: 'method',
            method,
            arguments: args
        };
        if (this.socket && this.socket.readyState === 1) {
            this.socket.send(JSON.stringify(packet), (error) => {
                if (error)
                    this.emit('error', error);
            });
        }
    }
    sendMessage(message) {
        this.sendPacket('msg', [message]);
    }
    reconnect() {
        this.unhookEventListners;
        if (this.socket) {
            this.socket.terminate();
        }
        this.join(this.userid, this.channelid, this.accessToken);
    }
    close() {
        this.unhookEventListners;
        if (this.socket) {
            this.socket.terminate();
        }
    }
}
exports.default = ChatService;
