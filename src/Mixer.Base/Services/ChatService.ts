/* jshint esversion: 6 */
import { requestAPI, RequestOptions } from '../Util/RequestHandler';
import { EventEmitter } from 'events';
import WebSocket = require('ws');

class ChatService extends EventEmitter {
	private userid: number;
	private channelid: number;
	private accessToken: string;
	autoReconnect: boolean;

	endpoint: string;
	authkey: string;
	socket: any;
	listener: boolean;

	constructor() {
		super();
	}

	public join(userid: number, channelid: number, accessToken: string, autoReconnect?: boolean) {
		this.userid = userid;
		this.channelid = channelid;
		this.accessToken = accessToken;
		this.autoReconnect = autoReconnect;

		if (this.socket) {
			this.emit('error', 'Chat socket already opened');
		} else {
			this.getChat(channelid, accessToken)
				.then((response: ChatResponse) => {
					this.endpoint = response.endpoints[0];
					this.authkey = response.authkey;

					this.connect(channelid, userid);
				})
				.catch((error) => {
					this.emit('error', error);
				});
		}
	}

	private getChat(channelid: number, accessToken: string) {
		return new Promise((resolve, reject) => {
			var opts: RequestOptions = {
				method: 'GET',
				uri: 'https://mixer.com/api/v1/chats/' + channelid,
				headers: {
					Authorization: 'Bearer ' + accessToken
				},
				json: true
			};

			requestAPI(opts)
				.then((response) => {
					resolve(response);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	private connect(channelid: number, userid: number) {
		let socket = new WebSocket(this.endpoint);
		this.socket = socket;
		this.socket.on('open', () => {
			this.emit('join', 'Joining chat ' + channelid + ' with user ' + userid);
			this.sendPacket('auth', [ channelid, userid, this.authkey ]);
			this.sendPacket('optOutEvents', [ 'UserJoin', 'UserLeave' ]);
			this.hookEventListeners(socket);
		});
	}

	private hookEventListeners(socket: any) {
		this.listener = true;
		socket.on('message', (response) => {
			if (!this.listener) return;
			response = JSON.parse(response);
			if (response.type == 'reply') {
				this.emit(response.type, response.error, response.data);
			} else {
				this.emit(response.event, response.data);
			}
		});

		socket.on('error', (error) => {
			if (!this.listener) return;
			this.emit('error', error);
		});

		socket.on('close', () => {
			if (!this.listener) return;
			if (this.autoReconnect) this.reconnect();
			else this.emit('closed');
		});
	}

	private unhookEventListners() {
		this.listener = false;
	}

	private sendPacket(method: string, args: Array<any>) {
		let packet: Packet = {
			type: 'method',
			method,
			arguments: args
		};
		if (this.socket && this.socket.readyState === 1) {
			this.socket.send(JSON.stringify(packet), (error) => {
				if (error) this.emit('error', error);
			});
		}
	}

	public sendMessage(message: string) {
		this.sendPacket('msg', [ message ]);
	}

	public reconnect() {
		this.unhookEventListners;
		if (this.socket) {
			this.socket.terminate();
		}

		this.join(this.userid, this.channelid, this.accessToken);
	}

	public close() {
		this.unhookEventListners;
		if (this.socket) {
			this.socket.terminate();
		}
	}
}

export default ChatService;

interface ChatResponse {
	endpoints: Array<string>;
	authkey: string;
}

interface Packet {
	type: string;
	method: string;
	arguments: Array<any>;
}
