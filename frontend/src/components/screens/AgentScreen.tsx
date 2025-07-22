import { ModalScreenType } from "../../schemas/localstorage-schema";
import { AgentInfo } from "../Agent/AgentInfo";

type AgentScreenProps = {
  agentAddress: `0x${string}`;
  onChangeModalScreen: (modalScreen: ModalScreenType | null) => void;
};

export function AgentScreen({
  agentAddress,
  onChangeModalScreen,
}: AgentScreenProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AgentInfo
        agentAddress={agentAddress}
        onChangeModalScreen={onChangeModalScreen}
      />
    </div>
  );
}
