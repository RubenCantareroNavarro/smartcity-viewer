# -*- mode: makefile-gmake; coding: utf-8 -*-

all: start-map-server
	

start-olc-server:
	go run ../open-location-code/tile_server/main.go --logtostderr --port 8080 

start-map-server: 
	python3 -m http.server 8082
	
start-route-server:
	python3 -m http.server --directory ../covid19-routes/ 8081

