import { Module } 	from 'cerebral';
import signals from './sequences';
import oada 				from '@oada/cerebral-provider';

export default Module ({

  state: {
    connections: {}
  },

	providers: {
		oada
  },

	signals,

})
