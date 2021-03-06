'use strict';
var assert = require('assert');
var factory = require('../index.js').factory;
var casual = require('casual');
var Prospect = require('42-cent-model').Prospect;
var CreditCard = require('42-cent-model').CreditCard;

describe('Beanstream payment gateway', function () {

  let service;
  let prospect = new Prospect()
    .withBillingFirstName(casual.first_name)
    .withBillingLastName(casual.last_name)
    .withBillingEmailAddress(casual.email)
    .withBillingPhone(casual.phone)
    .withBillingAddress1(casual.address1)
    .withBillingAddress2(casual.address2)
    .withBillingCity(casual.city)
    .withBillingState(casual.state)
    .withBillingPostalCode('3212')
    .withBillingCountry(casual.country_code)
    .withShippingFirstName(casual.first_name)
    .withShippingLastName(casual.last_name)
    .withShippingAddress1(casual.address1)
    .withShippingAddress2(casual.address2)
    .withShippingCity(casual.city)
    .withShippingState(casual.state)
    .withShippingPostalCode('3212')
    .withShippingCountry(casual.country_code);

  let creditCards = {
    visa: function () {
      return new CreditCard()
        .withCreditCardNumber('4030000010001234')
        .withExpirationMonth('11')
        .withExpirationYear('2018')
        .withCvv2('123');
    },
    visa_decline: function () {
      return new CreditCard()
        .withCreditCardNumber('4003050500040005')
        .withExpirationMonth('11')
        .withExpirationYear('2018')
        .withCvv2('123');
    },
    mastercard: function () {
      return new CreditCard()
        .withCreditCardNumber('5100000010001004')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv2('123');
    },
    mastercard_decline: function () {
      return new CreditCard()
        .withCreditCardNumber('5100000020002000')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv2('123');
    },
    amex: function () {
      return new CreditCard()
        .withCreditCardNumber('371100001000131')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv2('123');
    },
    amex_decline: function () {
      return new CreditCard()
        .withCreditCardNumber('342400001000180')
        .withExpirationMonth('12')
        .withExpirationYear('2017')
        .withCvv2('123');
    }
  };

  beforeEach(() => {
    service = factory({MERCHANT_ID: process.env.MERCHANT_ID, API_PASSCODE: process.env.API_PASSCODE});
  });

  it('should create a Legato token', (done) => {
    service.createLegatoToken(creditCards.visa().withCardHolder('SUCCESS'))
      .then((response) => {
        assert(response.token, 'token should be defined');
        done();
      })
      .catch(error => {
        done(error);
      })
  });

  it('should submit a transaction with a visa', (done) => {
    service.submitTransaction({
      amount: Math.random() * 1000
    }, creditCards.visa().withCardHolder('CARD SUCCESS'), prospect)
      .then((transaction) => {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        done();
      })
      .catch(error => {
        done(error);
      });
  });

  it('should handle failed transaction with a visa', (done) => {
    service.submitTransaction({
      amount: Math.random() * 1000
    }, creditCards.visa_decline()
      .withCardHolder('CARD FAILED'), prospect)
      .then((transaction) => {
        console.log('transaction' + transaction);
        done(new Error('should not get here'));
      })
      .catch(error => {
        assert(error._original);
        assert.equal(error.message, 'DECLINE');
        done();
      });
  });


  it('should refund an order', (done) => {
    var amount = +((+(Math.random() * 1000)).toFixed(2));
    service.submitTransaction( { amount: amount}, creditCards.visa().withCardHolder('REFUND SUCCESS'), prospect)
      .then((transaction) => {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        return service.refundTransaction(transaction.transactionId, amount);
      })
      .then(resp => {
        done();
      })
      .catch(error => {
        done(error);
      });
    });

  it('should handle error while refunding an order', (done) => {
    var amount = +((+(Math.random() * 1000)).toFixed(2));
    service.submitTransaction( { amount: amount}, creditCards.visa().withCardHolder('REFUND SUCCESS'), prospect)
      .then((transaction) => {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        return service.refundTransaction('foo', 20);
      })
      .then(resp => {
        done(new Error('it should not get here'));
      })
      .catch(error => {
        done();
    });
  });

  it('should void an order', (done) => {
    var amount = +((+(Math.random() * 1000)).toFixed(2));
    service.submitTransaction( { amount: amount}, creditCards.visa().withCardHolder('VOID SUCCESS'), prospect)
      .then((transaction) => {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        return service.voidTransaction(transaction.transactionId, amount);
      })
      .then(resp => {
        done();
      })
      .catch(error => {
        done(error);
    });
  });

  it('should get an order', (done) => {
    var amount = +((+(Math.random() * 1000)).toFixed(2));
    service.submitTransaction( { amount: amount}, creditCards.visa().withCardHolder('GET TRANSACTION'), prospect)
      .then((transaction) => {
        assert(transaction.transactionId, 'transactionId should be defined');
        assert(transaction._original, 'original should be defined');
        return service.getTransaction(transaction.transactionId);
      })
      .then(resp => {
        assert.equal(resp._original.approved, 1);
        assert.equal(resp._original.amount, amount);
        done();
      })
      .catch(error => {
        done(error);
      });
  });




});