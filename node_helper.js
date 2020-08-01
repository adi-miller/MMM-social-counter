const https = require('https');
const NodeHelper = require('node_helper');
const querystring = require('querystring');

module.exports = NodeHelper.create({
  start: function () {
    this.jwt;
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case 'TWITTER_AUTHENTICATE': {
        this.twitterAuthenticate(payload);
        break;
      }
      default: {
        this.sendSocketNotification(
          'ERROR',
          `Unknown notification ${notification} received by node_helper. Please submit and issue in the MMM-social-counter repository.`
        );
      }
    }
  },

  twitterAuthenticate: function ({ accessToken, accessTokenSecret }) {
    const req = https
      .request(
        {
          auth: `${accessToken}:${accessTokenSecret}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Content-Length': 29,
          },
          hostname: 'api.twitter.com',
          method: 'POST',
          path: '/oauth2/token',
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const response = JSON.parse(data);

            if (typeof response.errors === 'undefined') {
              this.jwt = response.access_token;
              this.sendSocketNotification('TWITTER_AUTHENTICATED');
            } else {
              const { code, message } = response.errors[0];
              if (code === 99) {
                this.sendSocketNotification(
                  'ERROR',
                  'Looks like your credentials are invalid, please check if your twitter acces tokens in the config file are correct.'
                );
              } else {
                this.sendSocketNotification(
                  'ERROR',
                  `Code: ${code}, message: ${message}`
                );
              }
            }
          });
        }
      )
      .on('error', (error) => {
        this.sendSocketNotification('ERROR', error.message);
      });

    req.write(
      querystring.stringify({
        grant_type: 'client_credentials',
      })
    );

    req.end();
  },
});