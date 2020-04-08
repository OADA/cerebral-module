import sequences from "./sequences";
import oada from "@oada/cerebral-provider";
import state from "./state"

export default {
  state,

  providers: { oada },

  sequences,
};
