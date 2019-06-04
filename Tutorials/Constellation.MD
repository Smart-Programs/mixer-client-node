# Chat Bot

## Prerequisites
1.  [Create a Mixer OAuth Application](https://mixer.com/lab/oauth)
2.  Get [NodeJS and NPM](https://nodejs.org/en/) for your platform.
3.  [Create a new project with npm.](https://docs.npmjs.com/cli/init)
4.  Run `npm i -s mixer-client-node`

## Writing the Code
Before you can connect to the chat you must first authenticate with Mixer. If you dont know how to do so Mixer has a good tutorial for using [Short-Code OAuth](https://dev.mixer.com/reference/oauth/shortcodeauth). If you prefer using a web flow check out the [OAuth Quick Details](https://dev.mixer.com/reference/oauth/quickdetails) and use an [NPM package for OAuth](https://www.npmjs.com/search?q=oauth) I recommend [Simple OAuth 2](https://www.npmjs.com/package/simple-oauth2).

Now that you have gotten an authenticated user you will be able to connect to a chat.

### Setup the Mixer Client
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx'
})
```
clientid is gotten from the very first step you did in [Create a Mixer OAuth Application](https://mixer.com/lab/oauth). This is the only thing you need if you only want to connect to the constellation events.


### Subscribe to an Event
Now we will add the code in order to actually subscribe to a live event and get data from Mixer.
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx'
})

let EVENT_NAME = 'channel:529479:update' // or any event you want See note*
client.subscribeTo(EVENT_NAME)

let constellation = client.constellationService

constellation.on('error', (error) => {
	// an error happened normally this means there is an error with Mixer
})

constellation.on('warning', data => {
	// a warning means you did something wrong
	// forgot to include something necessary in a function
})
```

Note: All event's you can subscribe to are listed on [the Mixer Dev Site, in the Constellation Reference](https://dev.mixer.com/reference/constellation/events/live).

### Listen to Chat Events
Now that we are connected to chat lets listen to when someone sends a chat message in the channel.
```javascript
let Mixer = require('mixer-client-node').Client; // Javascript
import { Client as Mixer } from 'mixer-client-node' // Typescript

let client = new Mixer({
	clientid: 'xxxxxx'
})

let EVENT_NAME = 'channel:529479:update' // or any event you want See note*
client.subscribeTo(EVENT_NAME)

let constellation = client.constellationService

constellation.on('error', (error) => {
	// an error happened normally this means there is an error with Mixer
})

constellation.on('warning', data => {
	// a warning means you did something wrong
	// forgot to include something necessary in a function
})

constellation.on('event', (data, eventName) => {
	// eventName = the eventName this message is associated with
	// data = the data object of the event see note*

	if(data.online) {
		// the user is now online!
	}
})
```
Note: The data object can be found at the [Constellation Channel Update Event Page on the Mixer Dev Site](https://dev.mixer.com/reference/constellation/events/live/channel%20update) or go to the event on the left nav-bar to see data for the event you want.

#### Other Events
Now that you know how to listen to the Constellation Events for Channel Updates, you can easily apply the same logic you did with that event to listen to other events, all the events are listed on [the Mixer Dev Site in the Constellation Reference](https://dev.mixer.com/reference/constellation/events/live). Just click on the event you want to listen to in order to see the data that will send, and use the same client.subscribeTo() and listen to the event data!
