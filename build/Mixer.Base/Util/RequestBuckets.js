"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buckets = {
    'channel-follow': {
        methods: ['POST', 'DELETE'],
        paths: ['channels/*/follow']
    },
    'channel-search': {
        methods: ['GET'],
        paths: ['channels']
    },
    'channel-read': {
        methods: ['GET'],
        paths: [
            'channels/*',
            'channels/*/follow',
            'channels/*/emoticons',
            'channels/*/hostee',
            'channels/*/hosters',
            'channels/*/manifest.*',
            'channels/*/related',
            'channels/*/recordings',
            'users/*/follows'
        ]
    },
    'channel-write': {
        methods: ['PUT', 'PATCH', 'DELETE'],
        paths: [
            'channels/*',
            'channels/*/emoticons',
            'channels/*/hostee',
            'channels/*/partnership/app',
            'channels/*/streamKey'
        ]
    },
    chats: {
        methods: ['GET'],
        paths: [
            'chats/*',
            'chats/*/joinIfNotBigEvent',
            'chats/*/anonymous',
            'chats/*/friends',
            'chats/*/users',
            'chats/*/users/*'
        ]
    },
    upload: {
        methods: ['POST', 'DELETE'],
        paths: [
            'channels/*/badge',
            'channels/*/thumbnail',
            'channels/*/banner',
            'users/*/avatar',
            'interactive/games/*/cover'
        ]
    },
    'user-email': {
        methods: ['POST', 'PUT', 'PATCH'],
        paths: ['users/changeEmail', 'users/reset']
    },
    'user-login': {
        methods: ['POST'],
        paths: ['users/login']
    },
    'user-read': {
        methods: ['GET'],
        paths: ['users/current', 'users/*/sessions']
    },
    'user-register': {
        methods: ['POST'],
        paths: []
    },
    'user-write': {
        methods: ['PATCH', 'DELETE'],
        paths: ['users', 'users/current', 'users/*/frontendVersion']
    },
    analytics: {
        methods: ['GET'],
        paths: ['channels/*/analytics/tsdb/*', 'interactive/versions/*/analytics/*', 'types/*/analytics/*']
    }
};
Object.keys(buckets).forEach((bucket) => {
    buckets[bucket].patterns = [];
    buckets[bucket].paths.forEach((path) => {
        const pattern = path.replace(/\//g, '\\/').replace(/\*\*/g, '(.*)').replace(/\*/g, '([a-z0-9\\_]+)');
        buckets[bucket].patterns.push(new RegExp(`[^]*mixer.com/api/v[1-2]/${pattern}`, 'i'));
    });
});
function getBucket(url, method) {
    const keys = Object.keys(buckets);
    const tested = url.split('?')[0];
    for (let i = 0; i < keys.length; i++) {
        const name = keys[i];
        const bucket = buckets[name];
        if (bucket.methods.indexOf(method.toUpperCase()) === -1) {
            continue;
        }
        const patterns = bucket.patterns;
        for (let j = 0; j < patterns.length; j++) {
            if (patterns[j].test(tested)) {
                return name;
            }
        }
    }
    return 'global';
}
exports.getBucket = getBucket;
