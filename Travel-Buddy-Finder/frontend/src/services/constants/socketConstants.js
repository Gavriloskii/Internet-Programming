export const SOCKET_EVENTS = {
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

export const SOCKET_CONFIG = {
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_INTERVAL: 1000
};

export const SOCKET_URLS = {
    development: 'http://localhost:5001',
    production: process.env.REACT_APP_SOCKET_URL
};
