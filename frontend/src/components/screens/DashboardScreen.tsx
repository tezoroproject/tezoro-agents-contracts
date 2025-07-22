import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useMemo } from "react";
import { Address } from "viem";
import { AgentPreviewInfo } from "../Agent/AgentPreviewInfo";
import { ModalScreenType } from "../../schemas/localstorage-schema";
import { useTezoro } from "../../hooks";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
// import { deduplicatePositions } from "../../utils/deduplicate-positions";
import { useActiveAgent } from "../../hooks/useActiveAgent";
import { Loader } from "../../ui/loader";

type DashboardScreenProps = {
  goHome: () => void;
  onChangeModalScreen: (modalScreen: ModalScreenType) => void;
};

export function DashboardScreen({
  goHome,
  onChangeModalScreen,
}: DashboardScreenProps) {
  const activeAgent = useActiveAgent();

  const { address: accountAddress } = useAccount();

  const setSelectedAgent = (address: Address | undefined) => {
    onChangeModalScreen({
      type: "agent",
      agentAddress: address,
    });
  };

  const { agents, refetchAgents } = useTezoro();

  useEffect(() => {
    refetchAgents();
  }, [refetchAgents]);

  // Reverse the order of user agents to display the most recent ones first
  const invertedUserAgents = useMemo(() => agents?.slice().reverse(), [agents]);

  useEffect(() => {
    if (!accountAddress) {
      goHome();
    }
  }, [accountAddress, goHome]);

  const {
    // data: agentsProtocols,
    isFetched: isFetchedProtocols,
    // failureReason: agentsProtocolsFailureReason,
  } = useReadContracts({
    contracts: invertedUserAgents?.map(
      ({ address }) =>
        ({
          address,
          abi: TezoroLendingAgentAbi,
          functionName: "getProtocols",
        } as const)
    ),
    allowFailure: false,
  });

  // if (agentsProtocolsFailureReason) {
  //   console.error(
  //     "Error fetching agents protocols:",
  //     agentsProtocolsFailureReason
  //   );
  // }

  // const positionsInfo = useMemo(
  //   () =>
  //     agentsPositionsInfo?.map((positions) =>
  //       deduplicatePositions([...positions])
  //     ),
  //   [agentsPositionsInfo]
  // );

  // const agentsData = useMemo(
  //   () =>
  //     invertedUserAgents
  //       ?.map(({ address, isDisabled }, i) => {
  //         const agentProtocols = agentsProtocols?.[i];

  //         if (agentProtocols === undefined) return null;
  //         const agentPositionsInfo = positionsInfo?.[i];
  //         if (agentPositionsInfo === undefined) return null;

  //         return {
  //           address,
  //           isDisabled,
  //           protocols: agentProtocols,
  //           positionsInfo: agentPositionsInfo,
  //         };
  //       })
  //       .filter((agentData) => agentData !== null),
  //   [invertedUserAgents, agentsProtocols, positionsInfo]
  // );

  const onAddFunds = () => {
    onChangeModalScreen({
      type: "addFunds",
      agentAddress: activeAgent?.address,
      typeBefore: "dashboard",
    });
  };

  const isLoading = !isFetchedProtocols;

  if (invertedUserAgents && invertedUserAgents?.length > 0 && isLoading) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 z-10 w-full h-full bg-white flex justify-center items-center">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {invertedUserAgents && invertedUserAgents.length > 0 ? (
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="flex flex-col gap-3">
            {invertedUserAgents.map(({ address, isDisabled }) => (
              <div key={address}>
                <AgentPreviewInfo
                  key={address}
                  agentAddress={address}
                  isDisabled={isDisabled}
                  onView={() => setSelectedAgent(address)}
                  onAddFunds={onAddFunds}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[#6F6F6F]">You have no agents in this network</div>
      )}
    </div>
  );
}
