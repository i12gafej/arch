import onionLayout from "./onionLayout.ts";
import hexLayout from "./hexLayout.ts";
import infraLayout from "./infraLayout.ts";
import distributedLayout from "./distributedLayout.ts";

export function layoutGraph(viewMode, nodes, edges) {
  switch (viewMode) {
    case "hex":
      return hexLayout(nodes, edges);
    case "infra":
      return infraLayout(nodes, edges);
    case "distributed":
      return distributedLayout(nodes, edges);
    case "onion":
    default:
      return onionLayout(nodes, edges);
  }
}
