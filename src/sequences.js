import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';
import Promise from 'bluebird';

/**
 * connects to the oada, returns and object with get, put, post, resetCache, disconnect
 * @type {Primitive}
 */
export const connect = sequence('connect', [
    ({state, oada, path, props}) => {
        //console.log(props);
        return oada.connect({
            domain:      props.domain,
            options:     props.options,
            cache:       props.cache,
            token:       props.token,
            noWebsocket: props.noWebsocket,
            connection_id: props.connection_id,
        })
        .then( (response) => {
            //console.log('response ', response);
            return path.authorized({
                                    token: response.token,
                                    connection_id: response.connection_id,
                                    connection: response
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
export const init = sequence('oada.init', [
    connect,
]);

/**
 * using the connection_id provided, it GET requests to the server
 * @type {Primitive}
 */
export const get = sequence('oada.get', [
    ({oada, state, props}) => {

        return Promise.map(props.requests || [props], (request)=>{
          
            return oada.get({
                connection_id: request.connection_id,
                url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
                path: request.path,
                headers: request.header,
                watch: request.watch,
                tree: request.tree
            }).then((response) => {
                let _cerebralPath = request.path.split('/').filter(n=>n&&true).join('.')
                let _responseData = response.data;
              /*
                results.push({
                    _id: response.data._id,
                    data: _responseData,
                    cerebralPath: _cerebralPath
                });
                */

                if (_responseData) state.set('oada.'+props.connection_id+'.'+_cerebralPath, _responseData);

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
 * it updates the state of the resource
 * @type {Primitive}
 */
/*
export const updateState = sequence('oada.updateState', [
  var requests = props.requests || [props];
  ({state, props}) => {
    return Promise.map(props.responses, (response, i) => {
      if (/^\/?resources/.test(requests[i].path) {

      } else {

    })
  }



    when(props`path`, (value) => /^\/?resources/.test(value)), {
        true: sequence('postedToResources', [
            when(props`putPath`), {
                true: [
                    //A reverse index should be added for POSTs/PUTs to /resources
                    set(state`oada.resources.${props`id`}`, props`putPath`),
                ],
                false: [],
            },
        ]),
        // Set path for a GET to propagate PUT data into state tree
        false: sequence('didntPostToResources', [
            get,
        ]),
    },
]);
*/

/**
 * it PUT requests the resource to the server
 * @type {Primitive}
 */
export const put = sequence('oada.put', [
    ({oada, state, props}) => {
        return Promise.map(props.requests || [props], (request)=>{
            //console.log('PUT request ', request);
            return oada.put({
                connection_id: props.connection_id,
                url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
                path: request.path,
                data: request.data,
                type: props.contentType,
                headers: props.header,
                tree: props.tree
                // connection_id: props.connection_id,
                // url: props.domain + ((request.path[0] === '/') ? '':'/') +
                // request.path,
                // contentType: props.contentType,
                // data: request.data,
                // token: props.token,
            })
        }).then((responses) => {
          return {responses}
        });
    },
    get,
]);

/**
 * requests a DELETE operation to the server. We utilize the connection_id to know which connection to use
 * @type {Primitive}
 */
export const oadaDelete = sequence('oada.delete', [
    ({oada, state, props}) => {
        return Promise.map(props.requests || [props], (request)=>{

            return oada.delete({
              connection_id: props.connection_id,
              url: props.url,
              path: props.path,
              headers: props.headers
                // url: props.domain + ((request.path[0] === '/') ? '':'/') +
                // request.path,
                // token: props.token,
            })
        }).then((responses) => {
            
            let _cerebralPath = request.path.split('/').filter(n=>n&&true).join('.')

            state.unset('oada.'+props.connection_id+'.'+_cerebralPath);

            return {responses};
        })
    },// oada state props
  //get,
]);

/**
 * resets or clears the cache
 * @type {Primitive}
 */
export const resetCache = sequence('oada.resetCache', [
    ({oada, state, props}) => {
        return oada.resetCache();
    }
]);

/**
 * disconnects from the framework
 * @type {Primitive}
 */
export const disconnect = sequence('oada.disconnect', [
    ({oada, state, props}) => {
        return oada.disconnect({connection_id: props.connection_id});
    }
]);

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
export const post = sequence('oada.post', [
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
