import { format } from "date-fns";
import { Loader } from "../../ui/loader";
import { useTezoro } from "../../hooks";

type AgentTokenRebalanceHistoryProps = {
  allocation?: {
    protocolCode: number;
    timestamp: number;
  }[];
};

export function AgentTokenRebalanceHistory({
  allocation,
}: AgentTokenRebalanceHistoryProps) {
  const { currentChainInfo } = useTezoro();

  if (!allocation) {
    return (
      <div className="absolute top-0 left-0 z-10 w-full h-full flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (allocation.length === 0) {
    return <p>No rebalancing history</p>;
  }

  return (
    <div className="flex flex-col gap-[10px] overflow-y-scroll scrollbar-none">
      <div className="flex flex-col gap-4">
        {allocation?.map(({ protocolCode, timestamp }) => {
          const allocationProtocol = currentChainInfo?.protocols.find(
            (a) => a.code === protocolCode
          );

          const Icon = allocationProtocol?.icon;
          return (
            <div
              key={`${protocolCode}-${timestamp}`}
              className="flex justify-between gap-2 border border-[#f4f4f4] rounded-[20px] p-4"
            >
              <div className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 inline-block mr-2" />}
                {allocationProtocol?.name}
              </div>
              <div>
                {format(
                  Number.parseInt(timestamp.toString()) * 1000,
                  "dd.MM.yyyy HH:mm:ss"
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
