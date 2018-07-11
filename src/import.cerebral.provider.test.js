process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
import { Provider } from 'cerebral';
import { props, state } from 'cerebral/tags';
import { CerebralTest } from 'cerebral/test';
import oadaModule from '../build/index';
import * as oada from '../build/sequences';
import assert from 'assert';

import chai from 'chai';
let expect = chai.expect;

let token = 'def';
let url = 'https://vip3.ecn.purdue.edu/bookmarks';
let contentType = 'application/vnd.oada.yield.1+json';

console.log('oada', oada);
console.log('oada module', oadaModule);

// state.set('oada.domain', 'https://vip3.ecn.purdue.edu');
// state.set('oada.hostname', 'vip3.ecn.purdue.edu');
//state.set('oada.options');
describe('#connection()', function() {
  it('should connect', () => {
    const cerebral = CerebralTest(oadaModule); // Expects a Module

    cerebral.setState('oada.domain', 'https://vip3.ecn.purdue.edu');
    cerebral.setState('oada.hostname', 'vip3.ecn.purdue.edu');

    return cerebral.runSignal('connect',
                            {token, domain: 'https://vip3.ecn.purdue.edu'})
                            .then(({ state }) => {
      //assert.(state.token, 1)
      console.log('state', state);
    })
  })
});

// describe('#connection2()', function() {
//   it('should connect when a token is provided', () => {
//     console.log('');
//     return oada.connect({token, domain: 'https://vip3.ecn.purdue.edu'}).then((result) => {
//       expect(result).to.have.key('token')
//     })
//   })
// });
