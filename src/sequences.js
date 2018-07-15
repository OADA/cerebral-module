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
            domain: props.domain,
            token: props.token,
            options: props.options,
            noWebsocket: props.noWebsocket || true,
            cache: props.cache || false,
        })
            .then( (response) => {
                //console.log('response ', response);
                return path.authorized({token: response.token, connection_id: 0,
                    connection: response});
                //return result;
            }).catch( () => {
                return path.unauthorized({});
            })
    },
    {
        authorized: sequence('authorized', [
            set(state`oada.token`, props`token`),
            set(state`oada.isAuthenticated`, true),
            set(state`oada.token`, props`connection_id`),
            set(state`oada.connection${props`connection_id`}`, props`connection`)
        ]),
        unauthorized: sequence('unauthorized', [
            set(state`oada.isAuthenticated`, false),
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

        let connection = state.get('oada.connection' + props.connection_id);

        let results = [];
        return Promise.map(props.requests, (request)=>{
            return connection.get({
                url: props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
                token: props.token,
            })
        }).then(responses => {
            const processedResponses = [];
            responses.map((response, i) => {
                processedResponses.push(response);
                let _cerebralPath = props.requests[i]
                    .path.split('/').filter(n=>n&&true).join('.')
                let _responseData = response.data;
                results.push({
                    _id: response.data._id,
                    data: _responseData,
                    cerebralPath: _cerebralPath
                });

                state.set('oada.'+_cerebralPath, _responseData);

            });//map

            // setting results' state
            state.set('results', results);

            return {results};
        }).catch( (error) => {

            let results = {status: 504};
            state.set('results', results);

            return {results};

        });
    }// oada state props
]);

/**
 * it updates the state of the resource
 * @type {Primitive}
 */
export const updateState = sequence('oada.updateState', [
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

/**
 * it PUT requests the resource to the server
 * @type {Primitive}
 */
export const put = sequence('oada.put', [
    ({oada, state, props}) => {
        return Promise.map(props.requests, (request)=>{
            //console.log('PUT request ', request);
            let connection = state.get('oada.connection' + props.connection_id);
            //console.log(props.connection_id);
            //console.log('connection put', connection);
            return connection.put({
                connection_id: props.connection_id,
                url: props.domain + ((request.path[0] === '/') ? '':'/') +
                request.path,
                contentType: props.contentType,
                data: request.data,
                token: props.token,
            })
        }).then(responses => {
            const processedResponses = [];
            let results = [];

            responses.map((response, i) => {
                processedResponses.push(response);
                //console.log('response', response);
                results.push({
                    _rev: response._rev,
                    id: response.headers['content-location'].split('/')
                        .filter(n => n && true).slice(-1)[0],
                })
            });

            state.set('results', results);
            return {results};
        });
    },
    ({props, state}) => {

    }
]);

/**
 * requests a DELETE operation to the server. We utilize the connection_id to know which connection to use
 * @type {Primitive}
 */
export const oadaDelete = sequence('oada.delete', [
    ({oada, state, props}) => {
        return Promise.map(props.requests, (request)=>{

            let connection = state.get('oada.connection' + props.connection_id);

            return connection.delete({
                url: props.domain + ((request.path[0] === '/') ? '':'/') +
                request.path,
                token: props.token,
            })
        }).then(responses => {
            const processedResponses = [];
            let results = [];

            state.set('DELETE_responses', responses);
            return {responses};
        });
    }// oada state props
]);

/**
 * resets or clears the cache
 * @type {Primitive}
 */
export const resetCache = sequence('oada.resetCache', [
    ({oada, state, props}) => {
        let connection = state.get('oada.connection' + props.connection_id);
        return connection.resetCache();
    }
]);

/**
 * disconnects from the framework
 * @type {Primitive}
 */
export const disconnect = sequence('oada.disconnect', [
    ({oada, state, props}) => {
        let connection = state.get('oada.connection' + props.connection_id);
        return connection.disconnect({connection_id: props.connection_id});
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
