process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
import { Provider } from 'cerebral';
import oada from '../build/index';

import chai from 'chai';
let expect = chai.expect;

let token = 'def';
let url = 'https://vip3.ecn.purdue.edu/bookmarks';
let contentType = 'application/vnd.oada.yield.1+json';

describe('#connection()', function() {
  it('should connect when a token is provided', () => {
    return oada.connect({token, domain: 'https://vip3.ecn.purdue.edu'}).then((result) => {
      expect(result).to.have.key('token')
    })
  })
});
