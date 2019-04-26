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

//Option 1:
let client = new Mixer({
	tokens:  {
		access:  'xxxxxxxx',
		refresh:  'xxxxxxxx'
	},
	clientid:  'xxxxxxxx',
	secretid:  'xxxxxxxx' //secret is optional
},{
	user: {
		username: 'Unsmart',
		userid: 755643,
		channelid: 529479
	}
});

//Option 2:
let client = new Mixer({
	tokens:  {
		access:  'xxxxxxxx',
		refresh:  'xxxxxxxx'
	},
	clientid:  'xxxxxxxx',
	secretid:  'xxxxxxxx' //secret is optional
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
Anonoymous chat joining is not supported and not planned currently.

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
	//Socket for channelid was closed (Not sent if autoreconnect set to true)
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
```
//Constellation not yet added.
```
