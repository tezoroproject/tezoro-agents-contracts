import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { config, availableChains } from "../../blockchain/config";
import { cn } from "../../utils/utils";
import { useEffect } from "react";
import { Button } from "../../ui/button";
import { SuccessCheckMarkIcon } from "../../ui/icons/success-check-mark";
import { ButtonVariants } from "../../ui/button.types";
import { ResetActiveDeploymentButton } from "../ResetActiveDeployment";
import { ScreenType } from "../../schemas/localstorage-schema";
import { TabsEnum } from "../../constants";
import { useTezoro } from "../../hooks";
import { HomeIcon } from "../../ui/icons/home";
import { DashboardIcon } from "../../ui/icons/dashboard";
import { DisconnectIcon } from "../../ui/icons/disconnect";
import { useActiveAgent } from "../../hooks/useActiveAgent";
// import { useActiveAgent } from "../../hooks/useActiveAgent";

type SettingsScreenProps = {
  onDisconnect?: () => void;
  onChangeScreen: (screen: ScreenType) => void;
};

export function SettingsScreen({
  onDisconnect,
  onChangeScreen,
}: SettingsScreenProps) {
  const { disconnect } = useDisconnect();
  const { isDisconnected } = useAccount();
  const { switchChain } = useSwitchChain({ config });
  const { chain: chainData } = useAccount({ config });

  const { currentChainInfo, refetchAgents } = useTezoro();

  const activeAgent = useActiveAgent();

  useEffect(() => {
    if (isDisconnected) {
      onDisconnect?.();
    }
  }, [isDisconnected, onDisconnect]);

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div
          className={cn(
            "gap-3",
            availableChains.length > 3
              ? "flex flex-col min-[540px]:grid min-[540px]:grid-cols-2"
              : "flex flex-col"
          )}
        >
          {availableChains.map(({ chain, icon }) => {
            const Icon = icon;
            return (
              <button
                type="button"
                key={chain.id}
                onClick={() => {
                  switchChain({ chainId: chain.id });

                  setTimeout(() => {
                    if (currentChainInfo) {
                      // If current chain in wallet presents in available chains
                      refetchAgents((agents) => {
                        if (agents && agents.length > 0) {
                          onChangeScreen({
                            type: "dashboard",
                          });
                        } else {
                          onChangeScreen({
                            type: "home",
                            tab: TabsEnum.ASSETS,
                          });
                        }
                      });
                    } else {
                      onChangeScreen({
                        type: "home",
                        tab: TabsEnum.ASSETS,
                      });
                    }
                  }, 1000);
                }}
                className={cn(
                  "w-full h-[58px] rounded-2xl border border-[#F4F4F4] flex items-center gap-[6px] py-[9px] px-5 transition",
                  chainData?.id === chain.id
                    ? "pointer-events-none"
                    : "cursor-pointer hover:bg-[#F5F5F5]"
                )}
              >
                <div className="w-10 h-10 flex justify-center items-center">
                  <div className="flex relative h-[30px] w-[30px] rounded-full overflow-hidden items-center justify-center">
                    <Icon />
                  </div>
                </div>
                <span className="text-[16px] min-[540px]:text-[18px] font-medium">
                  {chain.name.split(" ")[0]}
                </span>
                {chainData?.id === chain.id ? (
                  <div className="ml-auto flex items-center">
                    <SuccessCheckMarkIcon />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {/* <div className="mt-auto mx-auto flex w-full relative pb-8"> */}
      <div className="mt-auto mx-auto flex w-full relative">
        {/* {activeAgent ? null : ( */}
        <Button
          type="button"
          onClick={() => {
            onChangeScreen({
              type: "home",
              tab: TabsEnum.ASSETS,
            });
          }}
          className="w-full h-auto max-[510px]:h-auto rounded-l-[14px] rounded-r-none py-2 px-4 flex justify-center items-center"
          variant={ButtonVariants.SECONDARY}
        >
          <div className="flex flex-col gap-[5px] max-[410px]:gap-[2px] justify-center items-center">
            <HomeIcon />
            <span className="text-[18px] max-[540px]:text-[14px] max-[410px]:text-[12px] leading-[140%]">
              Home
            </span>
          </div>
        </Button>
        {/* )} */}
        <div className="bg-[#f5f5f5] h-full w-[1px] relative">
          <div className="absolute z-10 w-[1px] top-[6px] bottom-[6px] left-0 bg-[#E4E4E4]" />
        </div>
        <Button
          type="button"
          onClick={() => {
            onChangeScreen({
              type: "dashboard",
            });
          }}
          className="w-full h-auto max-[510px]:h-auto rounded-none py-2 px-4 flex justify-center items-center"
          variant={ButtonVariants.SECONDARY}
        >
          <div className="flex flex-col gap-[5px] max-[410px]:gap-[2px] justify-center items-center">
            <DashboardIcon />
            <span className="text-[18px] max-[540px]:text-[14px] max-[410px]:text-[12px] leading-[140%]">
              Dashboard
            </span>
          </div>
        </Button>
        <div className="bg-[#f5f5f5] h-full w-[1px] relative">
          <div className="absolute z-10 w-[1px] top-[6px] bottom-[6px] left-0 bg-[#E4E4E4]" />
        </div>
        <Button
          type="button"
          onClick={() => disconnect()}
          variant={ButtonVariants.SECONDARY}
          className={cn(
            "w-full h-auto max-[510px]:h-auto rounded-none py-3 px-4 flex justify-center items-center",
            !activeAgent && "rounded-r-[14px]"
          )}
        >
          <div className="flex flex-col gap-[5px] max-[410px]:gap-[2px] justify-center items-center">
            <DisconnectIcon />
            <span className="text-[18px] max-[540px]:text-[14px] max-[410px]:text-[12px] leading-[140%]">
              Disconnect
            </span>
          </div>
        </Button>
        {activeAgent ? (
          <>
            <div className="bg-[#f5f5f5] h-full w-[1px] relative">
              <div className="absolute z-10 w-[1px] top-[6px] bottom-[6px] left-0 bg-[#E4E4E4]" />
            </div>
            <ResetActiveDeploymentButton onChangeScreen={onChangeScreen} />
          </>
        ) : null}
        {/* <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2
          flex justify-center items-center gap-1"
        >
          <span className="text-[14px] whitespace-nowrap">Powered by</span>
          <LogoIcon
            width={34}
            height={12}
            className="cursor-pointer hover:opacity-70"
            onClick={() => {
              if (window) {
                window.location.href = "https://tezoro.io/";
              }
            }}
          />
        </div> */}
      </div>
    </div>
  );
}
