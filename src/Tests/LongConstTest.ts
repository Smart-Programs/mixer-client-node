import { Client } from '../index'

const client = new Client({
    clientid: process.env.clientid
})

const constellation = client.constellationService
const a = [
    'channel:774:hosted',
    'channel:774:followed',
    'channel:774:update',
    'channel:60302:hosted',
    'channel:60302:followed',
    'channel:60302:update'
]
a.forEach((item) => client.subscribeTo(item))

constellation.on('subscribe', (s) => {
    console.log(s, 'subscribe')
})

constellation.once('open', (data) =>
    console.log('The socket is now open and connected', data)
)

constellation.on('event', (data, channel) =>
    console.log(data, channel, new Date().toLocaleTimeString())
)

constellation.on('reply', (r) => {
    console.log(r, 'reply')
})

constellation.on('error', (e) => {
    console.error(e, 'error')
})

constellation.on('warning', (w) => {
    console.warn(w, 'warning')
})
