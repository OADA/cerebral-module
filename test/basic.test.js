process.env.NODE_TLS_REJECT_UNAUTHORIZED=0;
import { props, state } from 'cerebral/tags';
import { CerebralTest } from 'cerebral/test';
import oadaModule       from '../src';
import assert           from 'assert';
import yaml             from 'js-yaml';
import fs               from 'fs';
import url              from 'url';
import chai             from 'chai';
import Promise          from 'bluebird';
import _ from 'lodash';
let expect = chai.expect;

let _token = 'def';
let _url = 'https://localhost/bookmarks';
let _contentType = 'application/vnd.oada.yield.1+json';
let _domain = 'https://localhost';

let _options = {
    redirect: 'http://localhost:8000/oauth2/redirect.html',
    metadata: 'eyJqa3UiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbS9jZXJ0cyIsImtpZCI6ImtqY1NjamMzMmR3SlhYTEpEczNyMTI0c2ExIiwidHlwIjoiSldUIiwiYWxnIjoiUlMyNTYifQ.eyJyZWRpcmVjdF91cmlzIjpbImh0dHA6Ly92aXAzLmVjbi5wdXJkdWUuZWR1OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiLCJodHRwOi8vbG9jYWxob3N0OjgwMDAvb2F1dGgyL3JlZGlyZWN0Lmh0bWwiXSwidG9rZW5fZW5kcG9pbnRfYXV0aF9tZXRob2QiOiJ1cm46aWV0ZjpwYXJhbXM6b2F1dGg6Y2xpZW50LWFzc2VydGlvbi10eXBlOmp3dC1iZWFyZXIiLCJncmFudF90eXBlcyI6WyJpbXBsaWNpdCJdLCJyZXNwb25zZV90eXBlcyI6WyJ0b2tlbiIsImlkX3Rva2VuIiwiaWRfdG9rZW4gdG9rZW4iXSwiY2xpZW50X25hbWUiOiJPcGVuQVRLIiwiY2xpZW50X3VyaSI6Imh0dHBzOi8vdmlwMy5lY24ucHVyZHVlLmVkdSIsImNvbnRhY3RzIjpbIlNhbSBOb2VsIDxzYW5vZWxAcHVyZHVlLmVkdT4iXSwic29mdHdhcmVfaWQiOiIxZjc4NDc3Zi0zNTQxLTQxM2ItOTdiNi04NjQ0YjRhZjViYjgiLCJyZWdpc3RyYXRpb25fcHJvdmlkZXIiOiJodHRwczovL2lkZW50aXR5Lm9hZGEtZGV2LmNvbSIsImlhdCI6MTUxMjAwNjc2MX0.AJSjNlWX8UKfVh-h1ebCe0MEGqKzArNJ6x0nmta0oFMcWMyR6Cn2saR-oHvU8WrtUMEr-w020mAjvhfYav4EdT3GOGtaFgnbVkIs73iIMtr8Z-Y6mDEzqRzNzVRMLghj7CyWRCNJEk0jwWjOuC8FH4UsfHmtw3ouMFomjwsNLY0',
    scope: 'oada.yield:all'
};


const numberSamples = 4;

function domainToConnectionId(domainUrl) {
  let domain = url.parse(domainUrl).hostname;
  return domain.replace(/\./g, "_");
}


function createRequests(){
  let requests = [];

  for(let i=0; i<numberSamples; i++){
    let request = {
      //path: '/bookmarks/serviotest' + i,
      path: '/bookmarks/operations',
      data: {test: i}
    }
    requests.push(request);
  }

  return requests;
}

let requests = createRequests();

/**
*    Testing connection requests
*/
describe('CONNECTION', function() {
  this.timeout(30000);

  it('should connect using a token and disconnect', () => {
    const cerebral = CerebralTest(oadaModule); // Expects a Module
    let current_connection_id = null;
    // Runs Cerebral Signal -> Sequence
    return cerebral.runSequence('connect', {
      token: _token,
      domain: _domain,
      noWebsocket: true,
      cache: false,
    })
    .then((result) => {
      //`connect` sequence has two actions, pull out output from second one
      expect(result[1].output.connection_id).to.equal(domainToConnectionId(_domain));
      current_connection_id = result[1].output.connection_id;
      //Should be connected
      expect(result.state.oada.connections[current_connection_id].connected).to.equal(true);
    }).then(() => {
      // Runs Cerebral Signal -> Sequence
      return cerebral.runSequence('disconnect', {
        connection_id: current_connection_id
      }).then((result) => {
        expect(result.state.oada.connections[current_connection_id].connected).to.equal(false);
      })
    })
  })//it

  it('should connect using a token and options', () => {
    const cerebral = CerebralTest(oadaModule); // Expects a Module
    let current_connection_id = null;
    return cerebral.runSequence('connect', {
      token: _token,
      domain: _domain,
      options: _options,  //TODO this is same as metadata test, it is using metadata
      noWebsocket: true,
      cache: false,
    })
    .then((result) => {
      expect(result[1].output.connection_id).to.equal(domainToConnectionId(_domain));
      current_connection_id = result[1].output.connection_id;
      //Should be connected
      expect(result.state.oada.connections[current_connection_id].connected).to.equal(true);
    }).then(() => {
      // Runs Cerebral Signal -> Sequence
      return cerebral.runSequence('disconnect', {
        connection_id: current_connection_id
      }).then((result) => {
        expect(result.state.oada.connections[current_connection_id].connected).to.equal(false);
      })
    })
  })

  it('should connect using a token, options, and metadata', () => {
    const cerebral = CerebralTest(oadaModule); // Expects a Module
    let current_connection_id = null;
    return cerebral.runSequence('connect', {
      token: _token,
      domain: _domain,
      options: _options,
      metadata: _options.metadata,
      noWebsocket: true,
      cache: false
    })
    .then((result) => {
      expect(result[1].output.connection_id).to.equal(domainToConnectionId(_domain));
      current_connection_id = result[1].output.connection_id;
      //Should be connected
      expect(result.state.oada.connections[current_connection_id].connected).to.equal(true);
    }).then(() => {
      // Runs Cerebral Signal -> Sequence
      return cerebral.runSequence('disconnect', {
        connection_id: current_connection_id
      }).then((result) => {
        expect(result.state.oada.connections[current_connection_id].connected).to.equal(false);
      })
    })
  })

  it('should connect using a custom connection_id', () => {
    const cerebral = CerebralTest(oadaModule); // Expects a Module
    const connection_id = '0';
    return cerebral.runSequence('connect', {
      token: _token,
      domain: _domain,
      options: _options,
      noWebsocket: true,
      cache: false,
      connection_id
    })
    .then((result) => {
      //Should be connected
      expect(result.state.oada.connections['0'].connected).to.equal(true);
      //`connect` sequence has two actions, pull out output from second one
      expect(result[1].output.connection_id).to.equal(connection_id);
    }).then(() => {
      // Runs Cerebral Signal -> Sequence
      return cerebral.runSequence('disconnect', {
        connection_id
      }).then((result) => {
        expect(result.state.oada.connections[connection_id].connected).to.equal(false);
      })
    })
  })

});


describe('PUT, GET, DELETE', function() {
  const cerebral = CerebralTest(oadaModule); // Expects a Module
  const connection_id = '0'

  before(function() {
    return cerebral.runSequence('connect', {
      token: _token,
      domain: _domain,
      options: _options,
      noWebsocket: true,
      cache: false,
      connection_id
    })
  })
  after(function() {
    return cerebral.runSequence('disconnect', {
      connection_id
    })
  })

  /**
  *    Testing PUT requests
  */
  describe('#PUT()', function() {
    this.timeout(30000);
    it('should PUT ' + numberSamples + ' requests using path', () => {
      //Add content type to requests
      requests = requests.map((r) => {
        r.headers =  {...r.headers, "content-type": _contentType}
        return r;
      })
      return cerebral.runSequence('put', {
        connection_id,
        token: _token,
        domain: _domain,
        requests: requests,
        noWebsocket: true,
        cache: false,
      }).then( ({state}) => {
        //state should include results
        expect(state.oada[connection_id].bookmarks.operations).to.be.an('object');
        expect(state.oada[connection_id].bookmarks.operations.test).to.equal(numberSamples-1);
      })
    })//it
  });//describe

  /**
  *    Testing GET requests
  */
  describe('#GET()', function() {
    this.timeout(30000);

    before(function() {
      //Reset state, so data from PUT doesn't exist
      cerebral.setState(`oada.${connection_id}`, {})
    })

    it('should GET ' + numberSamples + ' requests using path', () => {
      return cerebral.runSequence('get', {
        connection_id,
        token: _token,
        domain: _domain,
        requests: [
          {
            path: '/bookmarks/operations'
          }
        ]
      }).then(({ state }) => {
        expect(state.oada[connection_id].bookmarks.operations).to.be.an('object');
        expect(state.oada[connection_id].bookmarks.operations.test).to.equal(numberSamples-1);
      })
    })
  });

  /**
  *    Testing DELETE requests
  */
  describe('#DELETE()', function() {
    this.timeout(30000);
    it('should DELETE ' + numberSamples + ' requests using path', () => {
      return cerebral.runSequence('delete', {
        connection_id,
        token: _token,
        domain: _domain,
        requests: [
          {
            path: '/bookmarks/operations',
            headers: {"content-type": _contentType}
          }
        ]
      }).then(({state}) => {
        expect(state.oada[connection_id].bookmarks.operations).to.not.exist;
      })
    })
  });
})
