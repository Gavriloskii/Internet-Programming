const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    MESSAGE: 'message',
    SWIPE: 'swipe',
    SWIPE_RESULT: 'swipeResult',
    MATCH: 'match',
    TYPING: 'typing',
    PRESENCE: 'presence'
};

const SOCKET_CONFIG = {
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_INTERVAL: 1000
};

const COOKIE_CONFIG = {
    name: 'jwt',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
};

module.exports = {
    SOCKET_EVENTS,
    SOCKET_CONFIG,
    COOKIE_CONFIG
};
