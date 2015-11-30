var Beanstream = require('./lib/Beanstream.js');
var assert = require('assert');

module.exports = {
  factory: function (options) {
    assert(options.MERCHANT_ID, 'YOUR_MERCHANT_ID is mandatory');
    assert(options.API_PASSCODE, 'YOUR_PAYMENTS_API_PASSCODE is mandatory');
    return new Beanstream(options);
  },
  Beanstream: Beanstream
};
