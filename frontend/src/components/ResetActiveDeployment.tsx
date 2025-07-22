import { TabsEnum } from "../constants";
import { useActiveAgent } from "../hooks/useActiveAgent";
import { useActiveAllocation } from "../hooks/useActiveAllocation";
import { useConfirm } from "../hooks/useConfirm";
import { ScreenType } from "../schemas/localstorage-schema";
import { Button } from "../ui/button";
import { ButtonVariants } from "../ui/button.types";
import { ResetIcon } from "../ui/icons/reset";

type ResetActiveDeploymentButtonProps = {
  onChangeScreen: (screen: ScreenType) => void;
};

export function ResetActiveDeploymentButton({
  onChangeScreen,
}: ResetActiveDeploymentButtonProps) {
  const { updateActiveAllocation: updateActiveDeployment } =
    useActiveAllocation();
  const { confirm } = useConfirm();
  const activeAgent = useActiveAgent();
  const handleReset = async () => {
    const isConfirmed = await confirm({
      title: "Reset active deployment?",
      description:
        "This action erases all data related to the active deployment. This action cannot be undone.",
      confirmText: "Reset",
      cancelText: "Cancel",
    });

    if (isConfirmed) {
      updateActiveDeployment((draft) => {
        draft.tokens = [];
        draft.distributionTx = undefined;
      });

      console.log("Active deployment reset");

      onChangeScreen({
        type: "home",
        tab: TabsEnum.ASSETS,
      });
    }
  };

  if (!activeAgent) return null;

  return (
    <Button
      type="button"
      onClick={handleReset}
      className="w-full h-auto max-[510px]:h-auto rounded-r-[14px] rounded-l-none py-3 px-4 flex justify-center items-center"
      variant={ButtonVariants.SECONDARY}
    >
      <div className="flex flex-col gap-[5px] max-[410px]:gap-[2px] justify-center items-center">
        <ResetIcon />
        <span className="text-[18px] max-[540px]:text-[14px] max-[410px]:text-[12px] leading-[140%]">
          Restart
        </span>
      </div>
    </Button>
  );
}
