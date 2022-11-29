#!/bin/bash
docker build . --rm --tag node-relay
docker rm node-relay || true
docker run --privileged -p 8180:80 --name node-relay node-relay

# debug
#docker run --privileged -p 8180:80 --rm -it --entrypoint bash node-relay