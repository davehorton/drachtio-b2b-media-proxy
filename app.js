const Srf = require('drachtio-srf');
const srf = new Srf();
const config = require('config');
const Rtpengine = require('rtpengine-client').Client;
const rtpengine = new Rtpengine();
const parseUri = require('drachtio-sip').parser.parseUri;
const locRtp = config.get('rtpengine');

console.log(`rtpengine: ${JSON.stringify(locRtp)}`);
// helper functions

// clean up and free rtpengine resources when either side hangs up
function endCall(dlg1, dlg2, details) {
  let deleted = false;
  [dlg1, dlg2].forEach((dlg) => {
    console.log('call ended');
    dlg.on('destroy', () => {
      (dlg === dlg1 ? dlg2 : dlg1).destroy();
      if (!deleted) {
        rtpengine.delete(locRtp, details);
        deleted = true;
      }
    });
  });
}

// function returning a Promise that resolves with the SDP to offer A leg in 18x/200 answer
function getSdpA(details, remoteSdp, res) {
  return rtpengine.answer(config.get('rtpengine'), Object.assign(details, {
    'sdp': remoteSdp,
    'to-tag': res.getParsedHeader('To').params.tag,
    'ICE': 'remove'
  }))
    .then((response) => {
      if (response.result !== 'ok') throw new Error(`Error calling answer: ${response['error-reason']}`);
      return response.sdp;
    });
}

srf
  .connect(config.get('drachtio'))
  .on('connect', (err, hp) => {
    console.log(`connected to drachtio listening on ${hp}`);
  })
  .on('error', (err) => {
    console.log(`Error connecting: ${err}`);
  });

// handle incoming invite
srf.invite((req, res) => {
  const uri = parseUri(req.uri);
  const dest = `sip:${uri.user}@${config.get('destination')}`;
  const from = req.getParsedHeader('From');
  const details = {
    'call-id': req.get('Call-Id'),
    'from-tag': from.params.tag,
    'record': 'yes'
  };

  console.log(`got invite, sending to ${dest}`);

  rtpengine.offer(locRtp, Object.assign(details, {'sdp': req.body, 'record call': 'yes'}))
    .then((rtpResponse) => {
      console.log(`got response from rtpengine: ${JSON.stringify(rtpResponse)}`);
      if (rtpResponse && rtpResponse.result === 'ok') return rtpResponse.sdp;
      throw new Error('rtpengine failure');
    })
    .then((sdpB) => {
      console.log(`rtpengine offer returned sdp ${sdpB}`);
      return srf.createB2BUA(req, res, dest, {
        localSdpB: sdpB,
        localSdpA: getSdpA.bind(null, details)
      });
    })
    .then(({uas, uac}) => {
      console.log('call connected with media proxy');
      return endCall(uas, uac, details);
    })
    .catch((err) => {
      console.error(`Error proxying call with media: ${err}: ${err.stack}`);
    });
});
