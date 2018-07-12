import { Module } 	from 'cerebral';
import * as signals from './sequences';
import oada 				from '@oada/cerebral-provider'
import yaml 				from 'js-yaml';
import fs   				from 'fs';

let _redirect = "";
let _metadata = "";
let _scope    = "";

// Get OADA configuration document, or throw exception on error
try {
  let oadaConfig = yaml.safeLoad(fs.readFileSync('./config/oada.yaml', 'utf8'));
	_redirect = oadaConfig.options.redirect;
	_metadata = oadaConfig.options.metadata;
	_scope    = oadaConfig.options.scope;

} catch (err) {
  console.log('Error: ', err);
}

export default Module ({

	state: {
		isAuthenticated: false,
		options: {
			redirect: _redirect,
			metadata: _metadata,
			scope: 		_scope
		},
	},
	providers: {
		oada
	},
	signals,

})
