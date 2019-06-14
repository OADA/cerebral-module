import { props, state } from 'cerebral';
import { sequence, when, merge, unset, equals, set } from 'cerebral/factories'

import Promise from 'bluebird';
import url from 'url'
//Promise.config({warnings: false})

function domainToConnectionId(domainUrl) {
  let domain = url.parse(domainUrl).hostname;
  return domain.replace(/\./g, '_')
}

/**
 * connects to the oada, returns and object with get, put, post, resetCache, disconnect
 * @type {Primitive}
 */
const connect = sequence('oada.connect', [
  ({state, oada, path, props}) => {
    return oada.connect({
      connection_id: domainToConnectionId(props.domain),
      domain:      props.domain,
      options:     props.options,
      cache:       props.cache,
      token:       props.token,
      websocket: props.websocket,
    }).then( (response) => {
      return path.authorized({
        token: response.token,
        connection: response,
        connection_id: domainToConnectionId(props.domain)
      });
    //return result;
    }).catch( (err) => {
      return path.unauthorized({});
    })
  }, {
    authorized: sequence('oada.authorized', [
      ({state, oada, props}) => {
        state.set(`oada.connections.${props.connection_id}.token`, props.token);
        state.set(`oada.connections.${props.connection_id}.domain`, props.domain);
        var wh = state.get(`oada.${props.connection_id}.bookmarks`)
        if (wh) {
          state.set(`oada.${props.connection_id}.bookmarks`, {});
        }
    ]),
    unauthorized: sequence('oada.unauthorized', [
      ({state}) => {state.set(`error`, {})}
    ]),
  },
]);

const handleWatch = sequence('oada.handleWatch', [
  ({state, oada, path, props}) => {
    if (props.response.change.type === 'merge') {
      var oldState = _.cloneDeep(state.get(`oada.${props.connection_id}.${props.path}`));;
      var newState = _.merge(oldState, props.response.change.body);
      state.set(`oada.${props.connection_id}.${props.path}`, newState);
      return {oldState}
    } else if (props.response.change.type === 'delete') {
      var nullPath = props.nullPath.split('/').join('.');
      var oldState = _.cloneDeep(state.get(`oada.${props.connection_id}${nullPath}`));;
      state.unset(`oada.${props.connection_id}.${props.path}${nullPath}`);
      return {oldState}
    }
  }
])

/**
 * using the connection_id provided, it GET requests to the server
 * @type {Primitive}
 */
const get = sequence('oada.get', [
  ({oada, state, props}) => {
    if (!props.requests) throw new Error('Passing request parameters as top level keys of cerebral props has been deprecated. Instead, pass requests in as an array of request objects under the requests key')
    var requests = props.requests || [];
    return Promise.map(requests, (request, i) => {
      if (request.complete) return
      let _cerebralPath = request.path.replace(/^\//, '').split('/').join('.')
      if (request.watch) {
        let conn = state.get(`oada.${request.connection_id || props.connection_id}`);
        if (conn) {
          if (conn && conn.watches && conn.watches[request.path]) return
          request.watch.signals = ['oada.handleWatch', ...request.watch.signals];
          request.watch.payload = request.watch.payload || {};
          request.watch.payload.connection_id = request.connection_id || props.connection_id;
          request.watch.payload.path = _cerebralPath;
        }
      }
      return oada.get({
        connection_id: request.connection_id || props.connection_id,
        url: request.url,
        path: request.path,
        headers: request.headers,
        watch: request.watch,
        tree: request.tree || props.tree,
      }).then((response) => {
        let _responseData = response.data;
        if (_responseData) state.set(`oada.${request.connection_id || props.connection_id}.${_cerebralPath}`, _responseData);
        if (request.watch) {
          state.set(`oada.${request.connection_id || props.connection_id}.watches.${request.path}`, true)
        }
        requests[i].complete = true;
        return response;
      }).catch((err) => {
        return err;
      })
    }).then((responses) => {
      return {responses, requests}
    })
  },// oada state props
]);

/**
 * it PUT requests the resource to the server
 * @type {Primitive}
 */
const put = sequence('oada.put', [
  ({oada, state, props}) => {
    if (!props.requests) throw new Error('Passing request parameters as top level keys of cerebral props has been deprecated. Instead, pass requests in as an array of request objects under the requests key')
    var requests = props.requests || [];
    return Promise.map(requests, (request, i)=>{
      if (request.complete) return
      return oada.put({
        url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
        path: request.path,
        data: request.data,
        type: request.type,
        headers: request.headers,
        tree: request.tree || props.tree,
        connection_id: request.connection_id || props.connection_id
      }).then((response) => {
        var oldState = _.cloneDeep(state.get(`oada.${request.connection_id || props.connection_id}${request.path.split('/').join('.')}`));;
        var newState = _.merge(oldState, request.data);
        state.set(`oada.${request.connection_id || props.connection_id}${request.path.split('/').join('.')}`, newState);
        requests[i].complete = true;
        return response;
      })
    }).then((responses) => {
      return {responses, requests}
    });
  },
]);

/**
 * requests a DELETE operation to the server. We utilize the connection_id to know which connection to use
 * @type {Primitive}
 */
const oadaDelete = sequence('oada.delete', [
  ({oada, state, props}) => {
    if (!props.requests) throw new Error('Passing request parameters as top level keys of cerebral props has been deprecated. Instead, pass requests in as an array of request objects under the requests key')
    var requests = props.requests || [];
    return Promise.map(requests, (request, i) => {
      if (request.complete) return
      let _cerebralPath = request.path.replace(/^\//, '').split('/').join('.')
      let conn = state.get(`oada.${request.connection_id || props.connection_id}`);
      if (request.unwatch && conn && conn.watches) {
        // Don't send the unwatch request if it isn't being watched already.
        if (!conn.watches[request.path]) return
      }
      return oada.delete({
        connection_id: request.connection_id || props.connection_id,
        url: request.url,
        path: request.path,
        headers: request.headers,
        unwatch: request.unwatch,
        type: request.type,
        tree: request.tree || props.tree
      }).then((response) => {
        //Handle watches index and optimistically update
        if (request.unwatch && conn && conn.watches) {
          state.unset(`oada.${request.connection_id || props.connection_id}.watches.${request.path}`)
        } else {
          state.unset(`oada.${request.connection_id || props.connection_id}.${_cerebralPath}`);
        }
        requests[i].complete = true;
        return response
      })
    }).then((responses) => {
      return {responses, requests};
    })
  },
]);

/**
 * resets or clears the cache
 * @type {Primitive}
 */
const resetCache = sequence('oada.resetCache', [
    ({oada, state, props}) => {
      return oada.resetCache({
        connection_id: props.connection_id || domainToConnectionId(props.domain),
      });
    }
]);

/**
 * disconnects from the framework
 * @type {Primitive}
 */
const disconnect = sequence('oada.disconnect', [
    ({oada, state, props}) => {
        return oada.disconnect({connection_id: props.connection_id});
    }
]);

/**
 * it POST requests the resource to the server
 * @type {Primitive}
 */
const post = sequence('oada.post', [
  ({oada, state, props}) => {
    if (!props.requests) throw new Error('Passing request parameters as top level keys of cerebral props has been deprecated. Instead, pass requests in as an array of request objects under the requests key')
    var requests = props.requests || [];
    return Promise.map(requests, (request, i) => {
      if (request.complete) return
      return oada.post({
        url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
        path: request.path,
        data: request.data,
        type: request.type,
        headers: request.headers,
        tree: request.tree || props.tree,
        connection_id: request.connection_id || props.connection_id
      }).then((response) => {
        var id = response.headers.location;
        var oldState = _.cloneDeep(state.get(`oada.${request.connection_id || props.connection_id}${request.path.split('/').join('.')}`));;
        var newState = _.merge(oldState, request.data);
        state.set(`oada.${request.connection_id || props.connection_id}.${request.path.split('/').join('.')}`, newState);
        requests[i].complete = true;
        return
      })
    }).then((responses) => {
      return {responses}
    });
  },
]);

export default {
  delete: oadaDelete,
  get,
  put,
  post,
  connect,
  resetCache,
  disconnect,
  domainToConnectionId,
  handleWatch
}
