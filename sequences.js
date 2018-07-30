'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.post = exports.disconnect = exports.resetCache = exports.oadaDelete = exports.put = exports.get = exports.init = exports.connect = undefined;

var _templateObject = _taggedTemplateLiteral(['oada.connections.', '.token'], ['oada.connections.', '.token']),
    _templateObject2 = _taggedTemplateLiteral(['connection_id'], ['connection_id']),
    _templateObject3 = _taggedTemplateLiteral(['token'], ['token']),
    _templateObject4 = _taggedTemplateLiteral(['error'], ['error']);

var _tags = require('cerebral/tags');

var _operators = require('cerebral/operators');

var _cerebral = require('cerebral');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

/**
 * connects to the oada, returns and object with get, put, post, resetCache, disconnect
 * @type {Primitive}
 */
var connect = exports.connect = (0, _cerebral.sequence)('connect', [function (_ref) {
    var state = _ref.state,
        oada = _ref.oada,
        path = _ref.path,
        props = _ref.props;

    //console.log(props);
    return oada.connect({
        domain: props.domain,
        options: props.options,
        cache: props.cache,
        token: props.token,
        noWebsocket: props.noWebsocket,
        connection_id: props.connection_id
    }).then(function (response) {
        //console.log('response ', response);
        return path.authorized({
            token: response.token,
            connection_id: response.connection_id,
            connection: response
        });
        //return result;
    }).catch(function (err) {
        console.log(err);
        return path.unauthorized({});
    });
}, {
    authorized: (0, _cerebral.sequence)('authorized', [(0, _operators.set)((0, _tags.state)(_templateObject, (0, _tags.props)(_templateObject2)), (0, _tags.props)(_templateObject3))]),
    unauthorized: (0, _cerebral.sequence)('unauthorized', [(0, _operators.set)((0, _tags.state)(_templateObject4), {})])
}]);

/**
 * initializaes the oada mocule (connects)
 * @type {Primitive}
 */
var init = exports.init = (0, _cerebral.sequence)('oada.init', [connect]);

/**
 * using the connection_id provided, it GET requests to the server
 * @type {Primitive}
 */
var get = exports.get = (0, _cerebral.sequence)('oada.get', [function (_ref2) {
    var oada = _ref2.oada,
        state = _ref2.state,
        props = _ref2.props;


    return _bluebird2.default.map(props.requests || [props], function (request) {

        return oada.get({
            connection_id: request.connection_id,
            url: request.url, //props.domain + ((request.path[0] === '/') ? '':'/') + request.path,
            path: request.path,
            headers: request.header,
            watch: request.watch,
            tree: request.tree
        }).then(function (response) {
            var _cerebralPath = request.path.split('/').filter(function (n) {
                return n && true;
            }).join('.');
            var _responseData = response.data;
            /*
              results.push({
                  _id: response.data._id,
                  data: _responseData,
                  cerebralPath: _cerebralPath
              });
              */

            if (_responseData) state.set('oada.' + props.connection_id + '.' + _cerebralPath, _responseData);

            return response;
        }).catch(function (error) {
            console.log(error);
            return error;
        });
    }).then(function (responses) {
        return { responses: responses };
    });
} // oada state props
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
var put = exports.put = (0, _cerebral.sequence)('oada.put', [function (_ref3) {
    var oada = _ref3.oada,
        state = _ref3.state,
        props = _ref3.props;

    return _bluebird2.default.map(props.requests || [props], function (request) {
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
        });
    }).then(function (responses) {
        return { responses: responses };
    });
}, get]);

/**
 * requests a DELETE operation to the server. We utilize the connection_id to know which connection to use
 * @type {Primitive}
 */
var oadaDelete = exports.oadaDelete = (0, _cerebral.sequence)('oada.delete', [function (_ref4) {
    var oada = _ref4.oada,
        state = _ref4.state,
        props = _ref4.props;

    return _bluebird2.default.map(props.requests || [props], function (request) {

        return oada.delete({
            connection_id: props.connection_id,
            url: props.url,
            path: props.path,
            headers: props.headers
            // url: props.domain + ((request.path[0] === '/') ? '':'/') +
            // request.path,
            // token: props.token,
        });
    }).then(function (responses) {

        var _cerebralPath = request.path.split('/').filter(function (n) {
            return n && true;
        }).join('.');

        state.unset('oada.' + props.connection_id + '.' + _cerebralPath);

        return { responses: responses };
    });
}] // oada state props
//get,
);

/**
 * resets or clears the cache
 * @type {Primitive}
 */
var resetCache = exports.resetCache = (0, _cerebral.sequence)('oada.resetCache', [function (_ref5) {
    var oada = _ref5.oada,
        state = _ref5.state,
        props = _ref5.props;

    return oada.resetCache();
}]);

/**
 * disconnects from the framework
 * @type {Primitive}
 */
var disconnect = exports.disconnect = (0, _cerebral.sequence)('oada.disconnect', [function (_ref6) {
    var oada = _ref6.oada,
        state = _ref6.state,
        props = _ref6.props;

    return oada.disconnect({ connection_id: props.connection_id });
}]);

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
var post = exports.post = (0, _cerebral.sequence)('oada.post', [function (_ref7) {
    var props = _ref7.props,
        state = _ref7.state,
        oada = _ref7.oada;

    var apiPromises = [];
    var htIndex = {};
    requestsRequired = props.requests.length;

    for (var i = 0; i < requestsRequired; i++) {
        apiPromises.push(oada.post({
            url: props.domain + (props.requests[i].path[0] === '/' ? '' : '/') + props.requests[i].path,
            token: props.token,
            contentType: props.contentType,
            data: props.requests[i].data
        })); //push
        htIndex[props.requests[i].path] = i;
    } //for

    var results = [];
    _bluebird2.default.all(apiPromises).then(function (responses) {
        var processedResponses = [];
        responses.map(function (response) {
            processedResponses.push(response);
            results.push({
                // return the resource
                _rev: response._rev,
                id: response.headers['content-location'].split('/').filter(function (n) {
                    return n && true;
                }).slice(-1)[0]
            });
        });
        return results;
    });
}
//updateState
]);