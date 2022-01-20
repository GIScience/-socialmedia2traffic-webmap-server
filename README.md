# socialmedia2traffic-webmap-server
A sample ExpressJS server, copied from EDH JRC codebase, to access mbtiles for global traffic map visualisation.

## Generate MBTiles ##

```sh
tippecanoe -e /<path>/mbtiles/ /<path>/sm2t-traffic.geojson -Z0 -z13 -d19 -B0 -pk -pf -pC -F
```

## MBTiles Endpoint: ##

```sh
http://localhost:8081/api/v0.1/mbtile?z=10&x=270&y=390
```

## Run Server using PM2: ##

Run the following command to generate pm2 startup command

```sh
cd  
```

```sh
pm2 startup
```

Copy the output of that command and paste it back into the terminal. This configures pm2 to run as a daemon service.

Run server server.js script using full server.js path (wrt to current root path. Note that /home/user is not being used in path as default path on system reboot is that only). Following command will spin up #cores-1 number of clusters. For SM2T this is the preferred mode. Note to update pm2.config.js for instances value accordingly. Use following command if want to use all cores. Note to update pm2.config.js for instances value accordingly.

```sh
pm2 restart /home/zia/sm2t-webmap-vectiles-server/sm2t-server/pm2.config.js --env production -i max --max-memory-restart 64G 
```

```sh
pm2 save
```

## Webmap html ##

webmap/index.html can be used to visualise traffic pbf files.