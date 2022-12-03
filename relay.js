'use strict';

const ALLOWED_IP = [];
const ALLOWED_MAC = [];
const ALLOWED_ORIGIN = [];
const BROADCAST = ['ff', 'ff', 'ff', 'ff', 'ff', 'ff'];

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

const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function* hexFormatValues(buffer) {
	for (let x of buffer) {
		const hex = x.toString(16)
		yield hex.padStart(2, '0')
	}
}

wss.on('connection', (ws, req) => {

	ws.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
	ws.origin = req.headers['origin'];

	console.log('client connected: %s', ws.ip);
	console.log('origin: %s', ws.origin);

	if (tap) {

		ws.on('message', (buf) => {

			if (!ws.mac) {

				ws.mac = [];

				for (let hex of hexFormatValues(new Int32Array(buf.slice(6, 12)))) {
					ws.mac.push(hex);
				}

				ws.mac = ws.mac.join(':');

				console.log('using mac: %s', ws.mac);
			}

			const allowIp = ALLOWED_IP.length > 0 ? ALLOWED_IP.includes(ws.ip) : true;
			const allowMac = ALLOWED_MAC.length > 0 ? ALLOWED_IP.includes(ws.mac) : true;
			const allowOrigin = ALLOWED_ORIGIN.length > 0 ? ALLOWED_IP.includes(ws.origin) : true;

			if (allowIp === true && allowMac === true && allowOrigin === true) {

				tap.write(buf);
			}
		});

		tap.on('data', async (buf) => {

			const macs = [];

			// MTU doesn't include header or CRC32
			for (let hex of hexFormatValues(new Int32Array(buf.slice(0, tap.mtu + 18)))) {
				macs.push(hex);
			}

			const chunks = macs.reduce((resultArray, item, index) => {

				const chunkIndex = Math.floor(index / 6);

				if (!resultArray[chunkIndex]) {

					resultArray[chunkIndex] = []; // start a new chunk
				}

				resultArray[chunkIndex].push(item);

				return resultArray;
			}, [])

			let broadcast = false;

			await Promise.all(chunks.map((chunk) => {

				if (equals(chunk, BROADCAST) === true) {

					broadcast = true;

					wss.clients.forEach(function each(ws) {

						ws.send(buf);
					});
				}
			}));

			if (broadcast === false) {

				ws.send(buf);
			}
		});
	}
});

wss.on('error', (e) => {

	console.log(`error: ${e}`);
	process.exit(0);
});