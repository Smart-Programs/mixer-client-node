# Mixer Client Node

[![npm version](https://img.shields.io/npm/v/mixer-client-node.svg)](https://www.npmjs.com/package/mixer-client-node)
[![downloads monthly](https://img.shields.io/npm/dm/mixer-client-node.svg)](https://www.npmjs.com/package/mixer-client-node)
[![dependencies](https://david-dm.org/Smart-Programs/mixer-client-node.svg)](https://david-dm.org/Smart-Programs/mixer-client-node)
[![CodeFactor](https://www.codefactor.io/repository/github/smart-programs/mixer-client-node/badge/master)](https://www.codefactor.io/repository/github/smart-programs/mixer-client-node/overview/master)

This is a client library for [Mixer](https://mixer.com/) written in Node.js.

If you ever need any support on using the client be sure to join the [Discord](https://discord.gg/58RTAez) or post an issue on the [Github Repo](https://github.com/Smart-Programs/mixer-client-node/issues/new). Discord is highly recommended when asking for support as I check it more frequently.

## Installation
```
npm install --save mixer-client-node
```

Once github registry is open I will add a way to install it via github as well!

## Tutorials

Need some help with tutorials? You can find the tutorials I have made [HERE](https://github.com/Smart-Programs/mixer-client-node/blob/master/Tutorials). There is a limited amount of tutorials due to the fact that I want to make sure the tutorials are high quality and understandable. If you want to submit any tutorials to me you can reach out to me via Discord: Unsmart#0917 or via email: [me@unsmart.co](mailto:me@unsmart.co).

## Usage

Here you can find all the basic things that this client can handle for you and how to use the client. If you have any issues understanding any documentation or if you find something is not working as you believe it should either send an issue on the [Github Repo](https://github.com/Smart-Programs/mixer-client-node/issues/new) or join the [Discord](https://discord.gg/58RTAez) and ask for support in the dev-support channel.

### Client
```
let Mixer = require('mixer-client-node').Client;

// (All possibilities for inputs): This is recommended when using the chat services
let client = new Mixer({
	tokens:  {
		access:  'xxxxxxxx',
		refresh:  'xxxxxxxx'
	},
	clientid:  'xxxxxxxx',
	secretid:  'xxxxxxxx',
	user: {
		userid: 755643,
		channelid: 529479 // See note*
	}
});

// (Only required variables): This is all you need if you are only using constellation
let client = new Mixer({
	clientid:  'xxxxxxxx'
});
```
*Note: The channelid you set in the user object does NOT have to be the owner of the tokens (the userid has to be) you can set the channelid to any channel you want, so if the userid is the bot account you can set the channelid to the streamers channelid. When joining chats this user object is highly recommended to be set but is not needed.

If you have a secretid for your client you must set it in order to use the authorization features of this client.

clientid must always be set as every service is required to know the clientid the requests are coming from to work.

When using the chat features you must at least specify the access token and clientid at a minimum. It is recommended you specify the access and refresh (refresh tokens do not come with an implicit grant) tokens, client and secret ids, and the user object.

### Chat
The following is a list of all the chat methods implemented.

####  Join a chat
```
client.joinChat(CHANNELID_TO_JOIN, USERID_TO_JOIN_AS, AUTO_RECONNECT (true || false));
client.joinChat(CHANNELID_TO_JOIN, USERID_TO_JOIN_AS);
client.joinChat(CHANNELID_TO_JOIN, AUTO_RECONNECT);
client.joinChat(CHANNELID_TO_JOIN);
client.joinChat(AUTO_RECONNECT);
client.joinChat();
```
It is recommended that you set the user object when creating the client instance as it makes the join command much simpler. You can do just client.joinChat() instead of having to input the channelid to join, and the userid of the token owner. Also note: The channelid you set in the user object does NOT have to be the owner of the tokens (the userid has to be) you can set the channelid to any channel you want, so if the userid is the bot account you can set the channelid to the streamers channelid. [See client info](#client)

Anonymous chat joining is not supported and not planned currently.

#### Close connection to chat
```
client.closeChat(CHANNEL_ID); //CHANNEL_ID not needed if you are only connected to one chat
//No 'closed' event will be emitted
```

#### Send a chat message
```
client.sendChat("Enter a message to send", CHANNEL_ID); //CHANNEL_ID not needed if you are only connected to one chat
```
Note: The 360 character count limit is not handled by this client yet, please make sure to limit the character count until this is added

#### Chat Events
```
let chat = client.chatService

chat.on('joined', data => {
	// data.connectedTo = channelid you are joining
	// data.userConnected = user you are connecting as
}); // This is only sent when you are authenticated to the chat

chat.on('reply', (error, data, channelid) => {
	if(error)  //Oh no error! (Sent by the server when a message sent to the server was rejected)
	//data is the data from the reply
	//channelid is the channelid you are connected to that the error happened on
});

chat.on(EVENT_NAME*, (data, channelid) => {
	//Do what you want with the response (this is the data object from the events response)
});

chat.on('error', (error, channelid) => {
	//channelid is the channelid you are connect/trying to connect to where an error happened
	//error possibilities:
	//an http error getting the info about the chat you want to connect to
	//a socket error
});

chat.on('warning', warning => {
	// warning.code = warning code && warning.id = warning id
	// Code: 1000 ID: 1 = Socket a packet was being sent to was closed
	// or the socket did not exist (if you did the sendMessage method it most likely
	means you inputted a channel you are not connected to or closed connection to)
	// this also contains the channelid (warning.channelid) if you want to reconnect

	// Code: 1000 ID: 2 = You did not specify the channelid to send a message
	// to channelid must be specified when connected to multiple channels

	// Code: 1001 ID: 1 = You used the reconnect method without first connecting
	// to a channel

	// Code: 1001 ID: 2 = You used the reconnect method without specifying
	// the channelid to reconnect to if connected to multiple channels

	// Code: 1002 ID: 1 = You used the close method without first connecting
	// to a channel

	// Code: 1002 ID: 2 = You used the close method without specifying
	// the channelid to close connection to if connected to multiple channels
})

chat.on('closed', channelid => {
	//Socket for channelid was closed (Not sent if auto reconnect set to true)
});
```
*[Event Names](https://dev.mixer.com/reference/chat/events) The data sent is is the data object from the payload of each event, not the full payload object.

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
client.introspect(TOKEN_TO_CHECK).then(response => {
	//The response object is the same response from mixer, the  expires field on  the tokens will be set to what is returned automatically
	//For setting timeout on refresh you would do the following code:
	let refresh = new Date(client.expires() * 1000).valueOf() - Date.now();
	setTimeout(() => {
		client.refresh() //See the refresh tokens reference
	}, refresh)
}).catch(error =>{
	console.error('Status code: ' + error.statusCode); //401 status sent when token is no longer active
	console.error('Error: ' + error.error);
});
```
#### Set Tokens
```
client.tokens = {
	access:  'xxxxxxxx',
	refresh:  'xxxxxxxx' //refresh is optional
	expires: 0 // expires is optional (The second timestamp for when the token expires)
}
```
Note when using the [refresh tokens](#refresh-tokens) part of this client the new tokens are automatically set including the new expire time. The expires time is also set if you use the [introspect](#introspect) part of the client with the access token as the checked token.
#### Get Tokens
```
let tokens = client.tokens

let accessToken = client.accessToken || client.tokens.access
let refreshToken = client.refreshToken || client.tokens.refresh
let expiresAt = client.expires || client.tokens.expires

let didExpire = client.didExpire
```

### API Requests
Using the request module from the client automatically limits requests to the correct rate-limit.
#### Request
```
let requestOptions = {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
	uri: "FULL_API_URL",
	headers?: {},
	body?: {},
	auth?: true | false // Default: false
};
client.request(requestOptions).then(response => {
	//Do something
}).catch(error => {
	console.error('Status code: ' + error.statusCode);
	console.error('Error: ' + error.error);
})
```

### Constellation
Need to connect to events using the mixer constellation in order to get live updates to channels like follows, subs, or updated view counts, or features, etc? This client can handle that as well. You can see a full list of event [HERE](https://dev.mixer.com/reference/constellation/events/live) to subscribe to.

*Note: This is currently an early test version of my own constellation handler, as I am new to the constellation service, it may be buggy and if you notice any bugs during development please submit an issue on the [GitHub Repo](https://github.com/Smart-Programs/mixer-client-node) or let me know in the dev-support channel on the [Discord](https://discord.gg/58RTAez).

Some constellation features may change often and may include breaking changes, if anything ever breaks come back here as this will always be up to date.

Info on what each event returns may not be fully complete as I am still investigating every possibility of what constellation returns.

#### Subscribe
```
client.constellationService.subscribe('Event:to:subscribe' || [ 'event:1:sub', 'event:2:sub' ])
```
#### Unsubscribe
```
client.constellationService.unsubscribe('Event:to:unsubscribe' || [ 'event:1:unsub', 'event:2:unsub' ])
```
#### Constellation Events
```
client.constellationService.on('subscribe', (data) => {
	// data.events = array of events you are newly subscribing too
	// Note client.constellationService.getEvents() will return
	// events you are subbed to
})

client.constellationService.on('event', (data, event) => {
	// Do stuff with data, this is the payload object from the event subscribed to
	// Event is the event you subscribed to ex: 'channel:1:update'
	// See *Note
})

client.constellationService.on('reply', (data) => {
	// data.result
	// data.error
	// data.data (full message from server)
})

client.constellationService.on('warning', (data) => {
	// data.warning
	// data.reason
	// data.code
	// data.id
	// data.events
})

client.constellationService.on('error', (data) => {
	// Data is the error returned from the socket
})

client.constellationService.on('closed', () => {
	// The subscription socket was closed: all of your events will need to be resubscribed too
})
```
*Note: The payload data for each constellation event can be found [HERE](https://dev.mixer.com/reference/constellation/events/live). This also shows the event argument to pass in the [subscribe](#subscribe) event.
