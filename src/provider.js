import { Provider } from "cerebral";
import oada from "@oada/oada-cache";
import uuid from "uuid";
var connections = {};

const connect = function connect(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  if (args.connection_id && connections[args.connection_id])
    return Promise.resolve(connections[args.connection_id]);
  return oada.connect(args).then((conn) => {
    conn.cache = {};
    connections[args.connection_id] = conn;
    return conn;
  });
};

const get = function get(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  if (args.watch && args.watch.signals) {
    let sigs = args.watch.signals.map((signal) => {
      if (this.context) {
        return this.context.controller.hasOwnProperty("getSignal")
          ? this.context.controller.getSignal(signal)
          : this.context.controller.getSequence(signal);
      }
    });
    args.watch.func = (payload) => {
      sigs.forEach((signal) => {
        signal(payload);
      });
    };
  }
  return connections[args.connection_id].get(args);
};

const put = function put(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  return connections[args.connection_id].put(args);
};

const post = function post(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  return connections[args.connection_id].post(args);
};

const _delete = function _delete(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  return connections[args.connection_id].delete(args);
};

const disconnect = function _disconnect(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  var connection = connections[args.connection_id];
  connections[args.connection_id] = undefined;
  return connection.disconnect();
};

const resetCache = function resetCache(args) {
  if (!args.connection_id) throw "connection_id not supplied";
  if (!connections[args.connection_id]) return; // reseting a non-existent connection
  return connections[args.connection_id].resetCache(args);
};

export default {
  connect,
  get,
  put,
  post,
  delete: _delete,
  resetCache,
  disconnect,
};
