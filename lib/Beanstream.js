var BaseGateway = require('42-cent-base').BaseGateway;
var GatewayError = require('42-cent-base').GatewayError;
var mapKeys = require('42-cent-util').mapKeys;
var util = require('util');
var P = require('bluebird');
var http = require('superagent');
var assign = require('object-assign');


/***
 *
 * Schema
 *
 ***/

var creditCardSchema = {
  creditCardNumber: 'number',
  expirationMonth: 'expiry_month',
  expirationYear: 'expiry_year',
  cvv2: 'cvd',
  cardHolder: 'name',
  complete: 'complete'
};

var billingSchema = {
  billingName: 'name',
  billingAddress1: 'address_line1',
  billingAddress2: 'address_line2',
  billingCity: 'city',
  billingStateRegion: 'province',
  billingCountry: 'country',
  billingPostalCode: 'postal_code'
};

var shippingSchema = {
  shippingAddress1: 'address_line1',
  shippingAddress2: 'address_line2',
  shippingCity: 'city',
  shippingStateRegion: 'province',
  shippingCountry: 'country',
  shippingPostalCode: 'postal_code'
};

var customerSchema = {
  billingEmailAddress: 'email_address'
};

/***
 *
 * Beanstream Request Setup
 *
 ***/

function Beanstream (options) {
  this.endpoint = 'https://www.beanstream.com/api/';
  this.version = 'v1';
  this.token_endpoint = 'https://www.beanstream.com/scripts/tokenization/tokens';
  var merchant_id = options.MERCHANT_ID;
  var api_passcode = options.API_PASSCODE;

  var passcode = new Buffer([merchant_id, api_passcode].join(":")).toString('base64');
  this.authHeader = "Passcode " + passcode;
  BaseGateway.call(this, options);
}

util.inherits(Beanstream, BaseGateway);

Beanstream.prototype.resolveEndpoint = function (path) {
  return this.endpoint + this.version + path;
};

/***
 * http://developer.beanstream.com/documentation/authentication/
 */

Beanstream.prototype._post = function (path, body) {
  var self = this;
  return new P(function (resolve, reject) {
    http.post(self.resolveEndpoint(path))
      .send(body)
      .set('Authorization', self.authHeader)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          res.body = res.body || {message: 'Unknown error'};
          reject(new GatewayError(res.body.message, res.body));
        } else {
          resolve(res);
        }
      });
  })
};

Beanstream.prototype._post_token = function (body) {
  var self = this;
  return new P(function (resolve, reject) {
    http.post(self.token_endpoint)
      .send(body)
      .set('Authorization', self.authHeader)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          res.body = res.body || {message: 'Unknown error'};
          reject(new GatewayError(res.body.message, res.body));
        } else {
          resolve(res);
        }
      });
  })
};


Beanstream.prototype._del = function (path) {
  var self = this;
  return new P(function (resolve, reject) {
    http.del(self.resolveEndpoint(path))
      .set('Authorization', self.authHeader)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        if (err) {
          res.body = res.body || {message: 'Unknown error'};
          reject(new GatewayError(res.body.message, res.body));
        } else {
          resolve(res);
        }
      });
  });
};



/***
 *
 * Beanstream API Functions
 *
 ***/

Beanstream.prototype.createToken = function (paymentInfo, options) {
  var body;
  var paymentMethod;
  options = options || {};
  paymentInfo.reusable = options.reusable === true;
  options.api_passcode = options.api_passcode || this.api_passcode;
  paymentMethod = mapKeys(paymentInfo, creditCardSchema);
  body = assign({paymentMethod: paymentMethod}, options);
  return this._post_token(body)
    .then(function (res) {
      return {
        _original: res.body,
        token: res.body.token,
        message: res.body.message
      }
    });
};

Beanstream.prototype.submitTransaction = function submitTransaction (order, creditcard, prospect, other) {
  var self = this;

  creditcard.expirationYear = creditcard.expirationYear.slice(-2);

  var body = assign({
    amount: +((+(order.amount)).toFixed(2)),
    payment_method: 'card',
    comments: 'Order processed through 42-cent-beanstream',
    billing: mapKeys(prospect, billingSchema),
    shipping: mapKeys(prospect, shippingSchema),
    card: mapKeys(creditcard, creditCardSchema)
  });

  return self._post('/payments', assign(body, other || {}))
    .then(function (res) {
      return {
        transactionId: res.body.id,
        _original: res.body
      };
    });
};

Beanstream.prototype.submitTokenTransaction = function submitTokenTransaction (order, creditcard, prospect, other) {
  var self = this;

  return this.createToken(creditcard)
    .then(function (tokenResponse) {
      tokenResponse.token = tokenResponse.token.replace(/\-/g, '');
      var body = assign({
        amount: +((+(order.amount)).toFixed(2)) * 100,
        payment_method: 'token',
        comments: 'Order processed through 42-cent-worldPay token',
        billing: mapKeys(prospect, billingSchema),
        shipping: mapKeys(prospect, shippingSchema),
        token: {
          code: tokenResponse.token,
          name: prospect.billingFirstName + ' ' + prospect.billingLastName
        }
      });
      return self._post('/payments', assign(body, other || {}));
    })
    .then(function (res) {
      return {
        transactionId: res.body.id,
        _original: res.body
      };
    });
};


module.exports = Beanstream;