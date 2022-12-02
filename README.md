# WebSockets Proxy

A websocket ethernet switch built using Node.js

## How it works

It's quite simple. The program starts off by creating a TAP device and listening
for websocket connections on port 80. When clients connect, ethernet frames
received via the websocket are switched between connected clients and the TAP
device. All communication is done via raw ethernet frames.

To use this in support of a virtual network you must set up the host system as
a DHCP server and router.

SSL support is not included. To enable SSL, please use a reverse proxy with SSL
and websockets support, such as nginx.

## Getting Started

The easiest way to get up and running is via its public docker image. This
image will set up a fully contained router enviornment using IPTables for
basic NAT functionality and dnsmasq for DHCP support.

To set up the relay via docker simply run

```shell
docker run --privileged -p 8180:80 --name node-relay krishenriksen/node-relay:latest
```

Or use the provided run.sh shell script

```shell
bash run.sh
```

and point v86, your VPN client, or your emulator of choice at
ws://YOUR_HOSTNAME:8180/

Note that the container must be run in priviliged mode so that it can create
its TAP device and set up IPv4 masquerading.

For better security be sure to set up an Nginx reverse proxy with SSL support
along with a more isolated docker bridge and some host-side firewall rules
which prevent clients of your relay from attempting to connect to your host
machine.

## Restricting clients allowed to connect based on mac address

Before building, edit `relay.js` and set ALLOWED_MAC to the mac addresses of your clients.
This will make sure that no data from any other mac address is written to tap device.