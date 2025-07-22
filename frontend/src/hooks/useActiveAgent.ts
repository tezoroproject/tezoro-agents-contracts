import { useTezoro } from "./useTezoro";

export function useActiveAgent() {
  const { agents } = useTezoro();

  const activeAgent = agents?.find((agent) => !agent.isDisabled);

  return activeAgent;
}
