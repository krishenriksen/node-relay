'use strict';

const WebSocket = require('ws');
const { Tap } = require('tuntap2');

const tap = new Tap();

tap.ipv4 = '10.5.0.1/16';
//tun.ipv6 = 'abcd:1:2:3::/64';
tap.mtu = 1500;
tap.isUp = true;

console.log(`created tap: ${tap.name}, ip: ${tap.ipv4}, mtu: ${tap.mtu}`);

// MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
// Use emitter.setMaxListeners() to increase limit
tap.setMaxListeners(0);

const heartbeat = () => {

	this.isAlive = true;
};

const interval = setInterval(function ping() {

	wss.clients.forEach(function each(ws) {

		if (ws.isAlive === false) {
			
			return ws.terminate();
		}

		ws.isAlive = false;
		ws.ping();
	});
}, 30000);

const wss = new WebSocket.Server({
	port: 80,
	perMessageDeflate: {
		zlibDeflateOptions: {
			chunkSize: 1024,
			memLevel: 7,
			level: 3,
		},
		zlibInflateOptions: {
			chunkSize: 10 * 1024
		},
		clientNoContextTakeover: true, // Defaults to negotiated value.
		serverNoContextTakeover: true, // Defaults to negotiated value.
		serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		concurrencyLimit: 10, // Limits zlib concurrency for perf.
		threshold: 1024, // Size (in bytes) below which messages should not be compressed.
	}
});

wss.on('connection', (ws, req) => {

	ws.isAlive = true;
	ws.on('pong', heartbeat);

	let ip = req.socket.remoteAddress;

	if (!ip) {

		ip = req.headers['x-forwarded-for'].split(',')[0].trim();
	}

	// TODO - find mac address of client
	// implement rate limiting, as connection is fast enough now.

	console.log('client connected: %s', ip);

	if (tap) {

		ws.on('message', (buf) => {

			tap.write(buf);
		});

		tap.on('data', (buf) => {
	
			ws.send(buf);
		});
	}
});

wss.on('close', function close() {

	clearInterval(interval);
});

wss.on('error', (e) => {

	console.log(`error: ${e}`);
	process.exit(0);
});