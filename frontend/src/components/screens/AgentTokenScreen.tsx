import { useAgentPositionsQuery } from "../../hooks/data/useAgentPositionsQuery";
import { AgentTokenRebalanceHistory } from "../Agent/AgentTokenRebalanceHistory";

type AgentTokenScreenProps = {
  agentAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
};
export function AgentTokenScreen({
  agentAddress,
  tokenAddress,
}: AgentTokenScreenProps) {
  const { data: agentPositions } = useAgentPositionsQuery(agentAddress);

  const position = agentPositions?.items.find(
    (item) => item.token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  const allocations = position?.allocations.items
    .filter(
      (allocation) =>
        Number.parseInt(allocation.timestamp) >=
        Number.parseInt(position.timestamp)
    )
    .map((allocation) => ({
      protocolCode: allocation.market.protocolCode,
      timestamp: Number.parseInt(allocation.timestamp),
    }));
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AgentTokenRebalanceHistory allocation={allocations} />
    </div>
  );
}
