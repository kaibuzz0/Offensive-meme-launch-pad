/* Public HTTPS room service. Credentials are issued per guest and never stored here. */
window.MEME_CITY_NETWORK = Object.freeze({ enabled: true, apiBase: ['localhost','127.0.0.1','terminal.local'].includes(typeof location==='undefined'?'':location.hostname) ? '/api/city' : 'https://offensive-meme-city-rooms.onrender.com/api/city' });
