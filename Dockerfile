FROM ubuntu:kinetic as node-relay
LABEL maintainer="Kris Henriksen"

ENV DEBIAN_FRONTEND noninteractive

RUN apt update && \
	apt --yes --no-install-recommends install \
	iptables \
	dnsmasq \
	uml-utilities \
	net-tools \
	build-essential \
	git \
	nodejs \
	npm

# ReducingDiskFootprint
RUN apt-get --yes clean && \
	rm -r /var/lib/apt/lists/* && \
	rm -r /usr/share/doc/* && \
	rm -r /usr/share/man/* && \
	rm -r /usr/share/locale/?? && \	
	rm /var/log/*.log /var/log/lastlog /var/log/wtmp /var/log/apt/*.log

COPY docker-startup.sh relay.js package.json /opt/node-relay/
COPY dnsmasq/interface dnsmasq/dhcp /etc/dnsmasq.d/

WORKDIR /opt/node-relay/

RUN npm i

# compile tuntap2
RUN cd node_modules/tuntap2 && \
	npm install tsc@2.0.4 && \
	npm install typescript@4.5.4 && \
	npm run build

EXPOSE 80

CMD /opt/node-relay/docker-startup.sh