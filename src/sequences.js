import { props, state } from 'cerebral/tags';
import { merge, unset, equals, set } from 'cerebral/operators';
import { sequence } from 'cerebral';
import Promise from 'bluebird';
import url from 'url'

function domainToConnectionId(domainUrl) {
  let domain = url.parse(domainUrl).hostname;
  return domain.replace(/\./g, '_')
}

/**
 * connects to the oada, returns and object with get, put, post, resetCache, disconnect
 * @type {Primitive}
 */
const connect = sequence('connect', [
  ({state, oada, path, props}) => {
        return oada.connect({
            connection_id: domainToConnectionId(props.domain),
            domain:      props.domain,
            options:     props.options,
            cache:       props.cache,
            token:       props.token,
            noWebsocket: props.noWebsocket,
        })
        .then( (response) => {
            return path.authorized({
              token: response.token,
              connection: response,
              connection_id: domainToConnectionId(props.domain)
            });
            //return result;
        }).catch( (err) => {
            console.log(err)
            return path.unauthorized({});
        })
    },
    {
        authorized: sequence('authorized', [
            set(state`oada.connections.${props`connection_id`}.token`, props`token`),
            set(state`oada.connections.${props`connection_id`}.domain`, props`domain`),
            set(state`oada.${props`connection_id`}.watches`, {}),
        ]),
        unauthorized: sequence('unauthorized', [
            set(state`error`, {})
        ]),
    }
]);

/**
 * initializaes the oada mocule (connects)
 * @type {Primitive}
 */
const init = sequence('oada.init', [
    connect,
]);

function checkWatches(watches, path) {
  let pieces = path.replace(/^\//, '').split('/');
  let foundPath;
  pieces.forEach((piece, i) => {
    let path = '/'+pieces.slice(0, i+1).join('/');
    if (watches[path]) foundPath = path
  })
  return foundPath
}

const handleWatch = sequence('oada.handleWatch', [
  equals(props`response.change.type`), {
    'merge': [
      ({state, props}) => {
        var oldState = state.get(`oada.${props.connection_id}.${props.path}`);
        var newState = _.merge(oldState, props.response.change.body);
        state.set(`oada.${props.connection_id}.${props.path}`, newState);
      },
    ],
    'delete': [
      ({state, props}) => {
        var nullPath = props.nullPath.replace(/^\//, '').split('/').join('.');
        state.unset(`oada.${props.connection_id}.${props.path}.${nullPath}`);
      }
    ]
  }
])

/**
 * using the connection_id provided, it GET requests to the server
 * @type {Primitive}
 */
const get = sequence('oada.get', [
  ({oada, state, props}) => {
    return Promise.map(props.requests || [props], (request) => {
      let _cerebralPath = request.path.replace(/^\//, '').split('/').join('.')
      if (request.watch) {
        let conn = state.get(`oada.${request.connection_id || props.connection_id}`);
        if (conn && conn.watches && checkWatches(conn.watches, request.path)) {
          return
        } 
        request.watch.signals = ['oada.handleWatch', ...request.watch.signals];
        request.watch.payload = request.watch.payload || {};
        request.watch.payload.connection_id = request.connection_id || props.connection_id;
        request.watch.payload.path = _cerebralPath;
      }
      return oada.get({
        connection_id: request.connection_id || props.connection_id,
        url: request.url,
        path: request.path,
        headers: request.headers || props.headers,
        watch: request.watch,
        tree: request.tree || props.tree,
      }).then((response) => {
        let _responseData = response.data;
        if (_responseData) state.set(`oada.${request.connection_id || props.connection_id}.${_cerebralPath}`, _responseData);
        if (request.watch) state.set(`oada.${request.connection_id || props.connection_id}.watches.${request.path}`, request.path) 
        return response;
      }).catch( (error) => {
        console.log(error);
        return error;
      })
    }).then((responses) => {
      return {responses}
    })
  }// oada state props
]);

/**
 * it PUT requests the resource to the server
 * @type {Primitive}
 */
const put = sequence('oada.put', [
    ({oada, state, props}) => {
        return Promise.map(props.requests || [props], (request)=>{
            return oada.put({
                url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
                path: request.path,
                data: request.data,
                type: request.type || props.type,
                headers: request.headers || props.headers,
                tree: request.tree || props.tree,
                connection_id: request.connection_id || props.connection_id
            })
        }).then((responses) => {
          return {responses}
        });
    },
    ({props}) => console.log(props.tree),
    get
]);

/**
 * requests a DELETE operation to the server. We utilize the connection_id to know which connection to use
 * @type {Primitive}
 */
const oadaDelete = sequence('oada.delete', [
  ({oada, state, props}) => {
      return Promise.map(props.requests || [props], (request)=>{
        let _cerebralPath = request.path.replace(/^\//, '').split('/').join('.')
        if (request.watch) {
          let conn = state.get(`oada.${request.connection_id || props.connection_id}`);
          if (conn && conn.watches && checkWatches(conn.watches, request.path)) {
            return
          } 
          request.watch.signals = ['oada.handleWatch', ...request.watch.signals];
          request.watch.payload = request.watch.payload || {};
          request.watch.payload.connection_id = request.connection_id || props.connection_id;
          request.watch.payload.path = _cerebralPath;
        }
        return oada.delete({
          connection_id: request.connection_id || props.connection_id,
          url: request.url,
          path: request.path,
          headers: request.headers || props.headers,
        }).then((response) => {
        // TODO: This is a semi-optimistic update. It waits for the request to return but doesn't explicitly perform a GET to find out
          state.unset(`oada.${request.connection_id || props.connection_id}.${_cerebralPath}`);
          return response
        })
      }).then((responses) => {
        return {responses};
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
        connection_id: props.connection_id,
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

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
const post = sequence('oada.post', [
    ({props, state, oada}) => {
        const apiPromises = [];
        const htIndex = {};
        requestsRequired = props.requests.length;

        for (let i = 0; i < requestsRequired; i++) {
            apiPromises.push(oada.post({
                    url: props.domain + ((props.requests[i].path[0] === '/') ?'':'/') +
                    props.requests[i].path,
                    token: props.token,
                    contentType: props.contentType,
                    data: props.requests[i].data,
                })
            );//push
            htIndex[props.requests[i].path] = i;
        }//for

        let results = [];
        Promise.all(apiPromises)
            .then(responses => {
                const processedResponses = [];
                responses.map(response => {
                    processedResponses.push(response);
                    results.push({
                        // return the resource
                        _rev: response._rev,
                        id: response.headers['content-location'].split('/')
                            .filter(n => n && true).slice(-1)[0],
                    });
                });
                return results;
            })
    }
    //updateState
]);

export default {
  init,
  connect,
  delete: oadaDelete,
  get,
  put,
  disconnect,
  resetCache,
  handleWatch,
}
