'use strict';

var _cerebral = require('cerebral');

var _index = require('../build/index');

var _index2 = _interopRequireDefault(_index);

var _sequences = require('../build/sequences');

var oada = _interopRequireWildcard(_sequences);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var expect = _chai2.default.expect;

var token = 'def';
var url = 'https://vip3.ecn.purdue.edu/bookmarks';
var contentType = 'application/vnd.oada.yield.1+json';

console.log('oada', oada);
console.log('oada module', _index2.default);

var connection = oada.connect({ token: token, domain: 'https://vip3.ecn.purdue.edu' }).then(function (result) {
  expect(result).to.have.key('token');
});

console.log('connection ', connection);

describe('#connection()', function () {
  it('should connect when a token is provided', function () {
    console.log('');
    return oada.connect({ token: token, domain: 'https://vip3.ecn.purdue.edu' }).then(function (result) {
      expect(result).to.have.key('token');
    });
  });
});