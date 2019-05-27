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
        if (typeof event === 'object') {
            event.forEach((eventName) => {
                if (this.socket.get(eventName))
                    this.unsubscribe(eventName);
                this.connect(eventName);
            });
        }
        else {
            if (this.socket.get(event))
                this.unsubscribe(event);
            this.connect(event);
        }
    }
    connect(event) {
        let socket = new WebSocket(this.CONSTELLATION_URL);
        this.socket.set(event, socket);
        this.socket.get(event).on('open', () => {
            this.emit('subscribe', 'Subscribing to event: ' + event);
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
        if (typeof event === 'object') {
            event.forEach((eventName) => {
                if (this.socket.get(eventName)) {
                    this.sendPacket('liveunsubscribe', { events: [eventName] }, eventName);
                    this.socket.get(eventName).terminate();
                    this.socket.delete(eventName);
                }
            });
        }
        else {
            let id;
            if (this.socket.size === 1)
                id = this.socket.keys().next().value;
            else if (this.socket.size === 0)
                this.emit('error', 'You must subscribe to an event first using the subscribe() method', null);
            else
                id = event;
            if (id && this.socket.get(id)) {
                this.sendPacket('liveunsubscribe', { events: [event] }, event);
                this.socket.get(id).terminate();
                this.socket.delete(id);
            }
            else {
                this.emit('error', 'You must provide an event to unsubscribe connection to when subscribed to more than one event', null);
            }
        }
    }
}
exports.default = ConstellationService;
