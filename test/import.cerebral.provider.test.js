process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
import { Provider }     from 'cerebral';
import { props, state } from 'cerebral/tags';
import { CerebralTest } from 'cerebral/test';
import oadaModule       from '../src';
import assert           from 'assert';
import yaml             from 'js-yaml';
import fs               from 'fs';

import chai from 'chai';
let expect = chai.expect;

let _token = 'def';
let _url = 'https://vip3.ecn.purdue.edu/bookmarks';
let _contentType = 'application/vnd.oada.yield.1+json';
let _domain = 'https://vip3.ecn.purdue.edu';

let _options = {
            redirect: 'http://localhost:8000/oauth2/redirect.html',
            metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly92aXAzLmVjbi5wdXJkdWUuZWR1OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJPcGVuQVRLIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vdmlwMy5lY24ucHVyZHVlLmVkdSIsImNvbnRhY3RzIjpbIlNhbSBOb2VsIDxzYW5vZWxAcHVyZHVlLmVkdT4iXSwic29mdHdhcmVfaWQiOiIxZjc4NDc3Zi0zNTQxLTQxM2ItOTdiNi04NjQ0YjRhZjViYjgiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTUxMjAwNjc2MX0.AJSjNlWX8UKfVh-h1ebCe0MEGqKzArNJ6x0nmta0oFMcWMyR6Cn2saR-oHvU8WrtUMEr-w020mAjvhfYav4EdT3GOGtaFgnbVkIs73iIMtr8Z-Y6mDEzqRzNzVRMLghj7CyWRCNJEk0jwWjOuC8FH4UsfHmtw3ouMFomjwsNLY0',
            scope: 'oada.yield:all'
        };

const numberSamples = 10;

function createRequests(){
  let requests = [];

  for(let i=0; i<numberSamples; i++){
    let request = {
      path: '/bookmarks/serviotest' + i,
      data: {test: i}
    }
    requests.push(request);
  }

  return requests;
}

let requests = createRequests();

const cerebral = CerebralTest(oadaModule); // Expects a Module

/**
*    Testing connection requests
*/
describe('#connection()', function() {
  this.timeout(30000)
  it('should connect using a token', () => {
    // Runs Cerebral Signal -> Sequence
    return cerebral.runSignal('connect', {
                              token: _token,
                              domain: _domain
                            }).then(({ state }) => {
      // state.isAuthenticated should be true after the call
      expect(state.oada.isAuthenticated).to.equal(true);
    })
  })

  it('should connect using a token and options', () => {
    return cerebral.runSignal('connect', {
                                          token: _token,
                                          domain: _domain,
                                          options: _options
                              }).then(({ state }) => {
      // state.isAuthenticated should be true after the call
      expect(state.oada.isAuthenticated).to.equal(true);
    })
  })

  it('should connect using a token, options, and metadata', () => {
    return cerebral.runSignal('connect', {
                                          token: _token,
                                          domain: _domain,
                                          options: _options,
                                          metadata: _options.metadata
                                        }).then(({ state }) => {
      // state.isAuthenticated should be true after the call
      expect(state.oada.isAuthenticated).to.equal(true);
    })
  })
});

/**
*    Testing PUT requests
*/
describe('#PUT()', function() {
  this.timeout(30000);
  it('should PUT ' + numberSamples + ' requests using path', () => {

    return cerebral.runSignal('put', {
                                      token: _token,
                                      domain: _domain,
                                      requests: requests
                              }).then(({state}) => {
      //state should include results
      expect(JSON.stringify(state)).to.include('results');

    })
  })
});

/**
*    Testing GET requests
*/
describe('#GET()', function() {
  this.timeout(30000);

  it('should GET ' + numberSamples + ' requests using path', () => {

    return cerebral.runSignal('get', {
                                      token: _token,
                                      domain: _domain,
                                      requests: requests
                              }).then(({ state }) => {
      //state should include results
      expect(JSON.stringify(state)).to.include('results');
    })
  })
});

/**
*    Testing DELETE requests
*/
describe('#DELETE()', function() {
  this.timeout(30000);

  it('should DELETE ' + numberSamples + ' requests using path', () => {

    return cerebral.runSignal('oadaDelete', {
                                      token: _token,
                                      domain: _domain,
                                      requests: requests
                              }).then(({ results }) => {

    })
  })
});
