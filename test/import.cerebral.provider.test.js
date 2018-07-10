'use strict';

var _cerebral = require('cerebral');

var _index = require('../build/index');

var _index2 = _interopRequireDefault(_index);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var expect = _chai2.default.expect;

var token = 'def';
var url = 'https://vip3.ecn.purdue.edu/bookmarks';
var contentType = 'application/vnd.oada.yield.1+json';

describe('#connection()', function () {
  it('should connect when a token is provided', function () {
    return _index2.default.connect({ token: token, domain: 'https://vip3.ecn.purdue.edu' }).then(function (result) {
      expect(result).to.have.key('token');
    });
  });
});