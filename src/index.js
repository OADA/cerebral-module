import { Module } 	from 'cerebral';
import * as signals from './sequences';
import oada	from '@oada/cerebral-provider';
import StorageModule from '@cerebral/storage'

const storage = StorageModule({

  target: localStorage,
  json: true,
  sync: {
    'connections': 'connections'
  }

})

export default Module ({

  state: {
    connections: {},
  },

	providers: {
		oada
  },

  signals,

  modules: {storage}

})
