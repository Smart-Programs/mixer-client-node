"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const WebSocket = require("ws");
class ConstellationService extends events_1.EventEmitter {
    constructor(clientid) {
        super();
        this.socket = new Map();
        this.CONSTELLATION_URL = 'wss://constellation.mixer.com?x-is-bot=true&client-id=' + clientid;
    }
    subscribe(event) {
        event = typeof event === 'string' ? [event] : event;
        event.forEach((eventName) => {
            if (this.socket.get(eventName))
                this.unsubscribe(eventName);
            this.connect(eventName);
        });
    }
    connect(event) {
        let socket = new WebSocket(this.CONSTELLATION_URL);
        this.socket.set(event, socket);
        this.socket.get(event).on('open', () => {
            this.emit('subscribe', 'Subscribing to an event', event);
            this.sendPacket('livesubscribe', { events: [event] }, event);
            this.eventListener(event);
        });
    }
    eventListener(event) {
        this.socket.get(event).on('message', (data) => {
            data = JSON.parse(data);
            if (data.type === 'reply') {
                this.emit(data.type, { result: data.result, error: data.error }, event);
            }
            else {
                if (data.data.payload) {
                    this.emit(data.type, data.data.payload, event);
                }
            }
        });
        this.socket.get(event).on('error', (error) => {
            this.emit('error', error, event);
        });
        this.socket.get(event).on('closed', () => {
            this.emit('closed', event);
        });
    }
    sendPacket(method, params, event) {
        let packet = {
            type: 'method',
            method,
            params
        };
        if (this.socket.get(event) && this.socket.get(event).readyState === 1) {
            this.socket.get(event).send(JSON.stringify(packet), (error) => {
                if (error)
                    this.emit('reply', error, {}, event);
            });
        }
        else {
            this.emit('error', 'Socket is not open cant send packet', event);
        }
    }
    unsubscribe(event) {
        event = typeof event === 'string' ? [event] : event;
        event.forEach((eventName) => {
            if (this.socket.get(eventName)) {
                this.sendPacket('liveunsubscribe', { events: [eventName] }, eventName);
                this.socket.get(eventName).terminate();
                this.socket.delete(eventName);
            }
            else {
                this.emit('error', "Can't unsubscribe to an event you aren't subscribed to.", eventName);
            }
        });
    }
}
exports.default = ConstellationService;
