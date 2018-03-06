# drachtio-b2b-media-proxy
An example SIP B2BUA built using [drachtio-srf](https://github.com/davehorton/drachtio-srf) that illustrates how to proxy media via [rtpengine](https://github.com/sipwise/rtpengine) using options provided to [`Srf#createB2BUA`](https://github.com/davehorton/drachtio-srf#srfcreateb2bua).

## Installing
* `git clone git@github.com:davehorton/drachtio-b2b-media-proxy.git && cd drachtio-b2b-media-proxy`
* `cp config/default.json config/local.json`
* edit config/local.json with the coordinates for your drachtio server and rtpengine, and add the ip address or dns name for the far end gateway you want to send the calls to as `destination`
* `node app.js`
* send a call into your drachtio server