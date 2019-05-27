# Mixer Client Node

[![npm version](https://img.shields.io/npm/v/mixer-client-node.svg)](https://www.npmjs.com/package/mixer-client-node)
[![downloads monthly](https://img.shields.io/npm/dm/mixer-client-node.svg)](https://www.npmjs.com/package/mixer-client-node)

This is a client library for [Mixer](https://mixer.com/) written in Node.js.

## Installation
```
npm install --save mixer-client-node
```
## Usage

[Example on runkit](https://runkit.com/unsmart/mixer-client-node-example)

### Client
```
let Mixer = require('mixer-client-node').Client;

//Option 1: (All possibilities for inputs)
let client = new Mixer({
	tokens?:  {
		access:  'xxxxxxxx',
		refresh?:  'xxxxxxxx'
	},
	clientid:  'xxxxxxxx',
	secretid?:  'xxxxxxxx'
},{
	user: {
		userid: 755643,
		channelid: 529479
	} // If user is defined it needs both userid and channelid to work properly
});

//Option 2: (Only required variables)
let client = new Mixer({
	clientid:  'xxxxxxxx'
});
```

### Chat
The following is a list of all the chat methods implemented.

####  Join a chat
```
client.joinChat(CHANNELID_TO_JOIN, USERID_TO_JOIN, AUTO_RECONNECT); // userid MUST be the owner of the tokens set in constructor
client.joinChat(CHANNELID_TO_JOIN, USERID_TO_JOIN);                // userid MUST be the owner of the tokens set in constructor
client.joinChat(CHANNELID_TO_JOIN, AUTO_RECONNECT); // Must have set user in constructor
client.joinChat(CHANNELID_TO_JOIN);                // Must have set user in constructor
client.joinChat(AUTO_RECONNECT);                  // Must have set user in constructor
client.joinChat();                               // Must have set user in constructor
```
Anonymous chat joining is not supported and not planned currently.

#### Listen to chat events
```
client.chatService.on('reply', (error, data, channelid) => {
	if(error)  //Oh no error! (Sent by the server when a message sent to the server was rejected)
	//data is the data from the reply
	//channelid is the channelid you are connected to that the error happened on
});

client.chatService.on(EVENT_NAME*, (data, channelid) => {
	//Do what you want with the response (this is the data object from the events response)
});

client.chatService.on('error', (error, channelid) => {
	//error is an error not related to a message sent to the server
	//could be an error joining the chat because authtoken is invalid
	//could be because you tried to send a message to a closed socket
});

client.chatService.on('closed', channelid => {
	//Socket for channelid was closed (Not sent if auto reconnect set to true)
});
```
*[Event Names](https://dev.mixer.com/reference/chat/events)

#### Send a chat message
```
client.chatService.sendMessage("Enter a message to send", CHANNEL_ID); //CHANNEL_ID not needed if you are only connected to one chat
```

#### Close connection to chat
```
client.chatService.close(CHANNEL_ID); //CHANNEL_ID not needed if you are only connected to one chat
//No 'closed' event will be emitted
```

### Authentication
This client will handle refreshing tokens and checking  tokens via introspection for you.
#### Refresh Tokens
```
client.refresh().then(response =>{
	//Auto sets new tokens in the client and returns the response from `oauth/token` route.
	console.log('Access token: ' + response.access_token);
	console.log('Refresh token: ' + response.refresh_token);
}).catch(error => {
	console.error('Status code: ' + error.statusCode);
	console.error('Error: ' + error.error);
})
```
#### Introspect
```
client.introspect("TOKEN_TO_CHECK").then(response =>{
	//The response object is the same response from mixer, the  expires field on  the tokens will be set to what is returned automatically
	//For setting timeout on refresh you would do the following code:
	let refresh = new Date(client.expires() * 1000).valueOf() - Date.now();
	setTimeout(() => {
		client.refresh() //See the refresh tokens reference
	}, )
}).catch(error =>{
	console.error('Status code: ' + error.statusCode); //401 status sent when token is no longer active
	console.error('Error: ' + error.error);
});
```
#### Set Tokens
```
client.setTokens({
	access:  'xxxxxxxx',
  refresh:  'xxxxxxxx' //refresh is optional
})
```

### API Requests
Using the request module from the client automatically limits requests to the correct rate-limit.
#### Request
```
let requestOptions = {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	uri: "FULL_API_URL",
	headers?: {},
	body?: {}
};
client.request(requestOptions).then(response => {
	//Do something
}).catch(error => {
	console.error('Status code: ' + error.statusCode);
	console.error('Error: ' + error.error);
})
```

### Constellation
Need to connect to events using the mixer constellation, this client can handle that as well.
*Note: This is currently a really early test version of my own constellation handler and may be buggy if you notice any bugs during development please submit an issue on the github repo: [https://github.com/Smart-Programs/mixer-client-node](https://github.com/Smart-Programs/mixer-client-node)
#### Subscribe
```
client.constellationService.subscribe('Event:to:subscribe' || [ 'event:1:sub', 'event:2:sub' ])
```
#### Unsubscribe
```
client.constellationService.unsubscribe('Event:to:unsubscribe' || [ 'event:1:unsub', 'event:2:unsub' ])
```
#### Events
```
client.constellationService.on('event', (data, event) => {
	//Do stuff with data, this is the payload object from the event subscribed to
	//Event is the event you subscribed to ex: 'channel:1:update'
})

client.constellationService.on('error', (data, event) => {
	//Data is the error returned from the socket
	//Event is the event you subscribed to ex: 'channel:1:update'
})

client.constellationService.on('closed', (event) => {
	//The subscription socket was closed
	//Event is the event you subscribed to ex: 'channel:1:update'
})
```
