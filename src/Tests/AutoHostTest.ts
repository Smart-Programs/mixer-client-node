import { Client } from '../index'
import { log } from './Logger'
import { IRequestOptions } from '../Mixer.Base/Util/RequestHandler'

log('Starting up', 'info', 'Auto-Host Service')

log('Creating the Mixer client', 'info', 'Auto-Host Service')
const client = new Client({
	clientid: process.env.clientid,
	tokens: {
		access: process.env.access
	},
	user: {
		channelid: 529479,
		userid: 755643
	}
})

let currentlyHosting = 0

const requestOptions: IRequestOptions = {
	auth: true,
	method: 'GET',
	uri: 'https://mixer.com/api/v1/channels/' + client.user.channelid + '?fields=hosteeId'
}

client.request(requestOptions).then(async (response) => {
	if (!response) return

	if (response.hosteeId) {
		log('We are already hosting someone currently', 'info', 'Auto-Host Service')
		currentlyHosting = response.hosteeId
		hostTimeout()
	} else {
		log('We are not already hosting someone currently, will start to host a random person', 'info', 'Auto-Host Service')
		hostChannel(await getRandomPartner())
	}

	listenToUnHost()
})

let timeout
function hostTimeout () {
	if (timeout) clearTimeout(timeout)
	timeout = setTimeout(async () => {
		log('Attempting to host a new user?', 'info', 'Auto-Host Service')
		const channelToHost = await getRandomPartner()
		if (channelToHost !== currentlyHosting) hostChannel(channelToHost)
	}, 1000 * 60 * 10)
}
let userHosting
const usersToHost = [ 'Abba', 'ahhreggi' ]
// Return a channel id
function getRandomPartner (): Promise<number> {
	return new Promise((res) => {
		const reqOpts: IRequestOptions = {
			auth: true,
			method: 'GET',
			uri:
				'https://mixer.com/api/v1/users/' +
				client.user.userid +
				'/follows?where=online:eq:true,token:in:' +
				usersToHost.join(';')
		}
		client.request(reqOpts).then((response) => {
			if (!response) res(160788)
			else {
				const list = response.filter((chan) => chan.id !== currentlyHosting)
				if (list.length > 0) {
					const item = rand(list)
					userHosting = item.token
					res(item.id)
				} else res(currentlyHosting)
			}
		})
	})
}

function hostChannel (channelid: number) {
	if (channelid === currentlyHosting) return

	if (client.connectedChannels.length > 0) client.closeChat(currentlyHosting)

	log('We are now going to host the channel with id of ' + channelid, 'info', 'Auto-Host Service')

	const reqOpts: IRequestOptions = {
		auth: true,
		body: {
			id: channelid
		},
		method: 'PUT',
		uri: 'https://mixer.com/api/v1/channels/' + client.user.channelid + '/hostee'
	}
	client.request(reqOpts).then((response) => {
		if (!response) return
		else {
			log('We successfully hosted a channel with the id of ' + response.hosteeId, 'info', 'Auto-Host Service')
			currentlyHosting = response.hosteeId
			client.joinChat(currentlyHosting)
			client.chatService.on('joined', (res) => {
				client.chatService.sendWhisper(
					'This is just an auto-hoster that I am testing, you are welcome for the host :P',
					userHosting,
					res.connectedTo
				)
			})
			hostTimeout()
		}
	})
}

client.chatService.on('reply', console.log)

function listenToUnHost () {
	const constellation = client.constellationService

	client.subscribeTo('channel:' + client.user.channelid + ':update')

	constellation.on('event', async (data) => {
		if (data.hasOwnProperty('hosteeId')) {
			if (data.hosteeId === null) {
				log('The hosteeId is now null its now time to host another channel!', 'info', 'Auto-Host Service')
				hostChannel(await getRandomPartner())
			}
		}
	})
}

function rand (items) {
	// tslint:disable-next-line: no-bitwise
	return items[~~(items.length * Math.random())]
}
