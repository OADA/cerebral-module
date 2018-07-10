import { props, state } from 'cerebral/tags';
import { when, set } from 'cerebral/operators';
import { sequence } from 'cerebral';
import urlLib from 'url';
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

export const fetchTree = sequence('oada.fetchTree', [
	({props, state}) => ({
		token: state.get('oada.token'),
		url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
	}),
	fetch,
	when(props`result`), {
		true: [({state, props}) => state.set('oada.'+props.path.split('/')
															.filter(n=>n&&true).join('.'), props.result)],
		false: [],
	},
])

export const get = sequence('oada.get', [
	({oada, state, props}) => {

		const apiPromises = [];
    requestsRequired = props.requests.length;

    for (let i = requestsRequired; i > 0; i--) {
        apiPromises.push(oada.get({
					url: state.get('oada.domain') + ((props.requests[i].path[0] === '/') ?
					     '':'/') + props.requests[i].path,
					token: state.get('oada.token')
				}));
    }

    let results = [];
    Promise.all(apiPromises)
	    .then(responses => {
	        const processedResponses = [];
	        responses.map(response => {
	            processedResponses.push(response);
							results.push({
								data: response.data,
								//cerebralPath: props.path.split('/').filter(n=>n&&true).join('.')
							})
	        }

	        return results;
	    });

		)
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

export const put = sequence('oada.put', [
	({oada, state, props}) => {
		const apiPromises = [];
		requestsRequired = props.requests.length;

		for (let i = requestsRequired; i > 0; i--) {
        apiPromises.push(oada.put({
					url: state.get('oada.domain')+((props.requests[i].path[0] === '/') ?
																				'':'/')+props.requests[i].path,
					contentType: props.contentType,
					data: props.requests[i].data,
					token: state.get('oada.token'),
				}));
    }

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
	    });
			updateState,
])

// Somewhat abandoned.  PUT is preferred.  Create the uuid and send it along.
export const post = sequence('oada.post', [
	({props, state, oada}) => {
		return oada.post({
			url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
			token: state.get('oada.token'),
			contentType: props.contentType,
			data: props.data,
		}).then((response) => {
			return {
				// return the resource
				_rev: response._rev,
				id: response.headers['content-location'].split('/').filter(n => n && true).slice(-1)[0],
			}
		})
	},
	updateState
])

// When starting up, it should fetch stuff using using the setup tree, creating
export const smartFetch = sequence('oada.smartFetch', [
	({props, state}) => ({
		token: state.get('oada.token'),
		url: state.get('oada.domain')+((props.path[0] === '/') ? '':'/')+props.path,
	}),
	smartTreeFetch,
	when(props`result`), {
		true: [({state, props}) => state.set('oada.'+props.path.split('/').filter(n=>n&&true).join('.'), props.result)],
		false: [],
	},
])

function replaceLinks(obj) {
	let ret = (Array.isArray(obj)) ? [] : {};
	if (!obj) return obj;  // no defined objriptors for this level
	return Promise.map(Object.keys(obj || {}), (key)  => {
		if (key === '*') { // Don't put *s into oada. Ignore them
			return;
		}
		let val = obj[key];
		if (typeof val !== 'object' || !val) {
			ret[key] = val; // keep it asntType: 'application/vnd.oada.harvest.1+json'
			return;
		}
		if (val._type) { // If it has a '_type' key, don't worry about it.
			//It'll get created in future iterations of ensureTreeExists
			return;
		}
		if (val._id) { // If it's an object, and has an '_id', make it a link from descriptor
			ret[key] = { _id: obj[key]._id};
			if (val._rev) ret[key]._rev = '0-0'
			return;
		}
		// otherwise, recurse into the object looking for more links
		return replaceLinks(val).then((result) => {
			ret[key] = result;
			return;
		})
	}).then(() => {
		return ret;
	})
}

let tree = {
	harvest: {
		_type: 'harvest',
		_rev: '0-0',
		tiledmaps: {
			_type: 'tiled-maps',
			_rev: '0-0',
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//HERE ON DOWN
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			'dry-yield-map': {
				_type: 'dry-yield-map',
				_rev: '0-0',
				'crop-index': {
					'*': {
						_type: 'crop',
						_rev: '0-0',
						'geohash-length-index': {}
					},
					corn: {
						_type: 'crop',
						_rev: '0-0',
						'geohash-length-index': {}
					}
				}
			}
		}
	}
}

function smartTreeFetch({oada, props, state, path}) {
	let smartPut = (url, setupTree, returnData) => {
		return Promise.try(() => {
			// Perform a GET if we have reached the next resource break.
			if (setupTree._type) { // its a resource
				return oada.get({
					url,
					token: props.token
				}).then((response) => {
					returnData = response.data;
					return
				})
			}
			return
		}).then(() => {
			// Walk down the data at this url and continue recursion.
			return Promise.map(Object.keys(setupTree), (key) => {
				// If setupTree contains a *, this means we should get ALL content on the server
				// at this level and continue recursion for each returned key.
				if (key === '*') {
					return Promise.map(Object.keys(returnData), (resKey) => {
						if (resKey.charAt(0) === '_') return
						return smartPut(url+'/'+resKey, setupTree[key] || {},
						       returnData[key]).then((res) => {
							return returnData[resKey] = res;
						})
					})
				} else if (typeof setupTree[key] === 'object') {
					return smartPut(url+'/'+key, setupTree[key] || {},
					       returnData[key]).then((res) => {
						return returnData[key] = res;
					})
				} else return returnData[key]
			}).then(() => {
				return returnData
			})
		}).catch((err) => {
			console.log(err.response)
			// Put the data on the server and try to GET it over again. The
			// replaceLinks function will create all of the data down to the next
			// resource and we don't want to recursively and redundantly PUT key by
			// key all the way down. We just want to skip from one resource down to
			// the next.
			if (err.response.status === 404) {
				return replaceLinks(setupTree).then((data) => {
					return makeResourceAndLink({
						oada,
						token: props.token,
						url,
						data
					})
				}).then(() => {
					return smartPut(url, setupTree, returnData)
				})
			}
			throw err
		})
	}
	return smartPut(props.url, props.setupTree, {}).then((result) => {
		return {result}
	})
}

// Everything at this point and lower in the setupTree does not exist.
// Keep walking down, look for resources, replace links, and create them.

function makeResourceAndLink({oada, token, url, data}) {
	let urlObj = urlLib.parse(url);
	let domain = urlObj.protocol+'//'+urlObj.host;
	return oada[data._id ? 'put' : 'post']({
		url: data._id ? domain+'/'+data._id : domain+'/resources',
		contentType: data._type,
		data,
		token,
	}).then((response) => {
		data._id = response.headers['content-location'].replace(/^\//, '');
		let link = {
			url,
			'Content-Type': data._type,
			data: {_id:data._id},
			token,
		}
		if (data._rev) link.data._rev = '0-0'
		return oada.put(link).then((res) => {
			return res
		})
	})
}

function fetch({oada, props, state, path}) {
	let recursiveGet = (token, url, setupTree, returnData) => {
		return Promise.try(() => {
			// Perform a GET if we have reached the next resource break.
			if (setupTree._type) { // its a resource
				return oada.get({
					url,
					token: props.token
				}).then((response) => {
					returnData = response.data;
					return
				})
			}
			return
		}).then(() => {
			// Walk down the data at this url and continue recursion.
			return Promise.map(Object.keys(setupTree), (key) => {
				// If setupTree contains a *, this means we should get ALL content on the server
				// at this level and continue recursion for each returned key.
				if (key === '*') {
					return Promise.map(Object.keys(returnData), (resKey) => {
						if (resKey.charAt(0) === '_') return
						return recursiveGet(token, url+'/'+resKey, setupTree[key] || {}, returnData[key]).then((res) => {
							return returnData[resKey] = res;
						})
					})
				} else if (typeof setupTree[key] === 'object') {
					return recursiveGet(token, url+'/'+key, setupTree[key] || {}, returnData[key]).then((res) => {
						return returnData[key] = res;
					})
				} else return returnData[key]
			}).then(() => {
				return returnData
			})
		// Catch errors. 404s
		}).catch((err) => {
			return
		})
	}
	return recursiveGet(props.token, props.url, props.setupTree, {}).then((result) => {
		return {result}
	})
}

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

//
// linkToId		 : Whether to link to the given path (false) or the path
//							 concatenated with the uuid returned by the POST (true).
//
// path				 : Where to link the created resource.
//
// data				 : The data to put in the created resource.
//
// contentType : The necessary Content-Type header oada uses to verify write
//							 permission.
//
// uuid        : When given, create the resource via PUT using this uuid.
export const createResourceAndLink = sequence('oada.createResourceAndLink', [
	// create resource
	({state, props}) => ({
		putPath: props.path,
		path: props.uuid ? '/resources/'+ props.uuid : '/resources',
	}),
	when(props`uuid`), {
		true: [put],
		false: [post]
	},
	// Link the new resource
	({state, props}) => {
		let content = {
			_id: 'resources/'+props.id,
			_rev: props._rev || '0-0'
		}
		// Link to given path or path plus the random ID created by the POST
		// Its important to perform the PUT in this manner so that the parent
		// resource gets updated.
		let data = (props.linkToId) ? {[props.id]: content} : content;
		return {
			path: props.putPath,
			data,
		}
	},
	put,
])

])
