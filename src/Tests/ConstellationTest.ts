import { Client } from '../index'

const client = new Client({
    clientid: 'cdffa13a0b5535e44518c0076650cc12d0e464075f9194fb'
})

console.log('Try to subscribe to an unknown event... expect a not found error')
client.subscribeTo('channel:529479:fakeEvent') // should give us an error of not found event

const constellation = client.constellationService

constellation.on('subscribe', (data) => {
    console.log(`We are now also subscribed to ${data.events.join(', ')}`)

    if (data.events.toString() === 'channel:529479:update') {
        client.subscribeTo(['channel:529479:followed', 'channel:529479:hosted'])
    } else if (
        data.events.join(', ') ===
        'channel:529479:followed, channel:529479:hosted'
    ) {
        client.subscribeTo(['channel:60302:followed', 'channel:60302:hosted'])
    } else {
        if (constellation.subscribedEvents.length === 5) {
            console.log(
                'We successfully subscribed to all 5 events correctly...'
            )
            console.log(client.subscribedEvents.join(', '))

            console.log('Attempting to unsubscribe from all events...')

            client.unsubscribeTo(client.subscribedEvents)
        } else {
            console.error('We did not subscribe to all 5 events correctly...')
            console.error(client.subscribedEvents.join(', '))

            process.exit(1)
        }
    }
})

let unsubCount = 0
let to
constellation.on('unsubscribe', (data) => {
    if (to) clearTimeout(to)

    unsubCount += data.events.length

    if (unsubCount === 5 && constellation.subscribedEvents.length === 0) {
        console.log('We successfully unsubscribed to all 5 events correctly...')

        console.log('All test were completed successfully...')
        process.exit(0)
    } else {
        to = setTimeout(() => {
            console.error('We did not unsubscribe to all 5 events correctly...')
            process.exit(1)
        }, 3000)
    }
})

constellation.on('event', (data, event) => {
    if (data.event === 'hello')
        console.log('The constellation socket is now connected...')
    else console.log(JSON.stringify(data), event)
})

constellation.on('error', (data) => {
    console.error('An unexpected error occurred at constellation.on error')
    console.error(data)

    process.exit(1)
})

constellation.on('warning', (data) => {
    if (data.code === 2001 && data.id === 1) {
        console.log('An expected warning occurred... (Duplicate Subscribe)')
    } else {
        console.warn('An unexpected error occurred at constellation.on error')
        console.warn(data)

        process.exit(1)
    }
})

constellation.on('reply', (data) => {
    if (data.error && data.error.code === 4106) {
        console.log('An expected error occurred... (Not Found Event)')
        client.subscribeTo('channel:529479:update')
        client.subscribeTo('channel:529479:update')
    } else {
        console.log(data)
    }
})
