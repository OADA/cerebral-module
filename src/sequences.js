import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';
import urlLib from 'url';
import Promise from 'bluebird';
import * as oada from '@oada/cerebral-provider';

//TODO: make the function that recursively gets a tree and creates it if it doesn't exist
// Make lookup tree for resources -> path so it can quickly be found in cerebral


// What assumptions should we make regarding PUTs to resources? Can users PUT to
// deep parts of a resource??? (They'll need to if putting data points to
// as-harvested.

export const connect = sequence('oada.connect', [
	({state, oada, path}) => {
		return oada.connect({
			domain: state.get('oada.hostname'),
			options: state.get('oada.options')
		}).then((response) => {
			return path.authorized({token:response.accessToken})
		}).catch(() => {
			return path.unauthorized({})
		})
	}, {
		authorized: sequence('authorized', [
			set(state`oada.token`, props`token`),
			set(state`oada.isAuthenticated`, true),
		]),
		unauthorized: sequence('unauthorized', [
			set(state`oada.isAuthenticated`, false),
			set(state`error`, {})
		]),
	}
])

export const init = sequence('oada.init', [
	connect,
])

export const get = sequence('oada.get', [
	({oada, state, props}) => {

		const apiPromises = [];
		const htIndex = {};
    requestsRequired = props.requests.length;

    for(let i = 0; i < arrayLength; i++){
        apiPromises.push(oada.get({
					url: state.get('oada.domain') + ((props.requests[i].path[0] === '/') ?
					                                    '':'/') + props.requests[i].path,
					token: state.get('oada.token')
				}));
				htIndex[props.requests[i].path] = i;
    }//for

    let results = [];
    Promise.all(apiPromises)
	    .then(responses => {
	        const processedResponses = [];
	        responses.map(response => {
	            processedResponses.push(response);
							results.push({
								_id: response.data._id,
								data: response.data,
								//cerebralPath: props.path.split('/').filter(n=>n&&true).join('.')
								cerebralPath: props.requests[htIndex[response.data.localtion]]
																.path.split('/').filter(n=>n&&true).join('.')
							})
	        });

	        return results;
	    });
		}
	//set(state`oada.${props`cerebralPath`}`, props`data`),
])

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
])

// export const updateStates = sequence('oada.updateStates', [
//
// 	props.requests.forEach(function(request) {
//     console.log(request);
// 		when(request, (value) => /^\/?resources/.test(value)), {
// 			true: sequence('postedToResources', [
// 				when(props`putPath`), {
// 					true: [
// 						//A reverse index should be added for POSTs/PUTs to /resources
// 						set(state`oada.resources.${props`id`}`, props`putPath`),
// 					],
// 					false: [],
// 				},
// 			]),
// 			// Set path for a GET to propagate PUT data into state tree
// 			false: sequence('didntPostToResources', [
// 				get,
// 			]),
// 		},
// 	});
// ])

export const put = sequence('oada.put', [
	({oada, state, props}) => {
		const apiPromises = [];
		const htIndex = {};
		requestsRequired = props.requests.length;

		for (let i = 0; i < requestsRequired; i++) {
        apiPromises.push(oada.put({
					url: state.get('oada.domain') + ((props.requests[i].path[0] === '/') ?
																				'':'/') + props.requests[i].path,
					contentType: props.contentType,
					data: props.requests[i].data,
					token: state.get('oada.token'),
				}));
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
	        })

	        return results;
	    })
		}
		//updateState
])

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
export const post = sequence('oada.post', [
	({props, state, oada}) => {
		const apiPromises = [];
		const htIndex = {};
		requestsRequired = props.requests.length;

		for (let i = 0; i < requestsRequired; i++) {
        apiPromises.push(oada.post({
						url: state.get('oada.domain')+((props.requests[i].path[0] === '/') ?
																						'':'/') + props.requests[i].path,
						token: state.get('oada.token'),
						contentType: props.contentType,
						data: props.requests[i].data,
					})
				)//push
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
	        })
	        return results;
	    })
		}
	//updateState
])

export const oadaDelete = sequence('oada.delete', [
	({oada, state, props}) => {
		return oada.delete({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			token: state.get('oada.token'),
		})
	},
	when(props`path`, (value) => /^\/?resources/.test(value)), {
		true: sequence('deletedResource', []),
		false: sequence('didntDeleteResource', [
			({state, props}) => {
				let pieces = props.path.split('/').filter(n=>n&&true)
				return {
					path: pieces.slice(0,pieces.length-1).join('/'),
				}
			},
		]),
	},
])
