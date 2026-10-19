import find from "models/firewall/find.js";
import review from "models/firewall/review.js";
import rules from "models/firewall/rules.js";

const firewall = Object.freeze({
  ...find,
  ...review,
  ...rules,
});

export default firewall;
