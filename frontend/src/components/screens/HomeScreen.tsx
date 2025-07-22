"use client";

import { TabsEnum } from "../../constants";
import { capitalize, cn } from "../../utils/utils";
import { AssetsTab } from "../tabs/AssetsTab";
import { LaunchTab } from "../tabs/LaunchTab";
import { SettingsButton } from "../SettingsButton";
import { ModalScreenType, ScreenType } from "../../schemas/localstorage-schema";
import { useLocalStorageSelector } from "../../hooks/useLocalStorageSelector";
import { useActiveAgent } from "../../hooks/useActiveAgent";
import { useAccount } from "wagmi";
import { config } from "../../blockchain/config";
import { BorrowTab } from "../tabs/BorrowTab";
import { ModalScreenWrapper } from "./ModalScreenWrapper";
import { OneTimeLoan } from "../OneTimeLoan";
import { RegularLoan } from "../RegularLoan";
import { useActiveAllocation } from "../../hooks/useActiveAllocation";
import { RiskTab } from "../tabs/RiskTab";
import { useState } from "react";

type HomeScreenProps = {
  isBottomLayer: boolean;
  onChangeScreen: (screen: ScreenType) => void;
  onChangeModalScreen: (modalScreen: ModalScreenType) => void;
  setSelectToken: (token: string | null | undefined) => void;
};

export function HomeScreen({
  isBottomLayer,
  onChangeScreen,
  onChangeModalScreen,
  setSelectToken,
}: HomeScreenProps) {
  const screen = useLocalStorageSelector((state) => state?.screen);
  const activeAgent = useActiveAgent();
  const { isConnected, chain } = useAccount({ config });

  const { activeAllocation } = useActiveAllocation();

  const [isBorrowError, setIsBorrowError] = useState(false);
  // const [isCollateralError, setIsCollateralError] = useState(false);

  const [isOneTimeLoanModalScreenOpen, setIsOneTimeLoanModalScreenOpen] =
    useState(false);
  const [isRegularLoanModalScreenOpen, setIsRegularLoanModalScreenOpen] =
    useState(false);
  // const [isCollateralModalScreenOpen, setIsCollateralModalScreenOpen] =
  //   useState(false);

  // const [collaterals, setCollaterals] = useState<
  //   | {
  //       symbol: string;
  //     }[]
  //   | null
  // >(null);

  // const [ltv, setLtv] = useState(30);

  // useEffect(() => {
  //   if (activeAgent) {
  //     onChangeScreen({
  //       type: "dashboard",
  //     });
  //   }
  // }, [activeAgent, onChangeScreen]);

  if (screen?.type !== "home") {
    return null;
  }

  const setActiveTab = (tab: TabsEnum) => {
    onChangeScreen({
      type: "home",
      tab,
    });
  };

  const { tab: activeTab } = screen;

  return (
    <>
      <div
        className={cn(
          "flex flex-col w-full gap-4 h-full max-[410px]:p-[14px_16px_16px]",
          "max-[540px]:p-[14px_20px_20px] p-[14px_25px_25px] border border-[#f4f4f4]",
          "rounded-[20px] bg-white transition-all ease-out duration-200",
          (isBottomLayer ||
            isOneTimeLoanModalScreenOpen ||
            // isCollateralModalScreenOpen ||
            isRegularLoanModalScreenOpen) &&
            "bg-neutral-100 scale-95 -translate-y-2"
        )}
      >
        <div className="flex items-center justify-between w-full h-[40px] shrink-0">
          <div className="flex items-center gap-[30px] max-[540px]:gap-4 max-[410px]:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(TabsEnum.ASSETS)}
              className={cn(
                "text-left rounded-md transition-colors cursor-pointer hover:text-neutral-700",
                "text-[18px] max-[540px]:text-[16px] outline-none",
                {
                  "text-black": activeTab === TabsEnum.ASSETS,
                  "text-gray-500": activeTab !== TabsEnum.ASSETS,
                }
              )}
            >
              {capitalize(TabsEnum.ASSETS)}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(TabsEnum.RISK)}
              className={cn(
                "text-left rounded-md transition-colors cursor-pointer hover:text-neutral-700",
                "text-[18px] max-[540px]:text-[16px] outline-none",
                {
                  "text-black": activeTab === TabsEnum.RISK,
                  "text-gray-500": activeTab !== TabsEnum.RISK,
                }
              )}
            >
              {capitalize(TabsEnum.RISK)}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(TabsEnum.BORROW)}
              className={cn(
                "text-left rounded-md transition-colors cursor-pointer hover:text-neutral-700",
                "text-[18px] max-[540px]:text-[16px] outline-none",
                {
                  "text-black": activeTab === TabsEnum.BORROW,
                  "text-gray-500": activeTab !== TabsEnum.BORROW,
                }
              )}
            >
              {capitalize(TabsEnum.BORROW)}
            </button>

            {/* {!activeAgent && (
              <button
                type="button"
                onClick={() => setActiveTab(TabsEnum.AGENT)}
                className={cn(
                  "text-left rounded-md transition-colors cursor-pointer hover:text-neutral-700",
                  "text-[18px] max-[540px]:text-[16px] outline-none",
                  {
                    "text-black": activeTab === TabsEnum.AGENT,
                    "text-gray-500": activeTab !== TabsEnum.AGENT,
                  }
                )}
              >
                {capitalize(TabsEnum.AGENT)}
              </button>
            )} */}

            <button
              type="button"
              onClick={() => setActiveTab(TabsEnum.LAUNCH)}
              className={cn(
                "text-left rounded-md transition-colors cursor-pointer hover:text-neutral-700",
                "text-[18px] max-[540px]:text-[16px] outline-none",
                {
                  "text-black": activeTab === TabsEnum.LAUNCH,
                  "text-gray-500": activeTab !== TabsEnum.LAUNCH,
                }
              )}
            >
              {activeAgent ? "Approve" : capitalize(TabsEnum.LAUNCH)}
            </button>
          </div>
          <SettingsButton
            onClick={() => onChangeScreen({ type: "settings" })}
          />
        </div>
        {/* {activeAgent && (
          <div className="text-[16px] max-[410px]:text-[14px] bg-blue-600 bg-opacity-10 rounded-[9px] py-2 px-3 text-white">
            You're adding funds to the agent{" "}
            <ExplorerLink address={activeAgent.address} />
          </div>
        )} */}
        {isConnected && !chain && (
          <div className="text-[16px] max-[410px]:text-[14px] bg-blue-600 bg-opacity-10 rounded-[9px] py-2 px-3 text-white flex items-center gap-1">
            <span>Please switch to one of the supported networks.</span>
            <span
              className="text-white border-b border-white cursor-pointer hover:border-transparent leading-none"
              onClick={() => onChangeScreen({ type: "settings" })}
            >
              Switch
            </span>
          </div>
        )}
        {activeTab === TabsEnum.ASSETS && (
          <AssetsTab
            setSelectToken={setSelectToken}
            onNext={() => {
              setActiveTab(TabsEnum.RISK);
            }}
            onConnectWallet={() => {
              onChangeModalScreen({ type: "connect_wallet" });
            }}
          />
        )}
        {activeTab === TabsEnum.RISK && (
          <RiskTab
            onNext={() => setActiveTab(TabsEnum.BORROW)}
            onYieldBacktest={() => {
              onChangeModalScreen({ type: "yieldBacktest" });
            }}
            onRiskManagement={() => {
              onChangeModalScreen({ type: "riskManagement" });
            }}
          />
        )}
        {activeTab === TabsEnum.BORROW && (
          <BorrowTab
            onNext={() => {
              if (!activeAllocation?.borrowing?.token) {
                setIsBorrowError(true);
              }

              // if (!collaterals) {
              //   setIsCollateralError(true);
              // }

              // if ((oneTimeLoanAsset || regularLoanAsset) && collaterals) {
              if (activeAllocation?.borrowing?.token) {
                setActiveTab(TabsEnum.LAUNCH);
              }
            }}
            onSkip={() => {
              setIsBorrowError(false);
              // setIsCollateralError(false);
              setActiveTab(TabsEnum.LAUNCH);
            }}
            isBorrowError={isBorrowError}
            // isCollateralError={isCollateralError}
            // collaterals={collaterals}
            // ltv={ltv}
            setIsOneTimeLoanModalScreenOpen={setIsOneTimeLoanModalScreenOpen}
            setIsRegularLoanModalScreenOpen={setIsRegularLoanModalScreenOpen}
            // setIsCollateralModalScreenOpen={setIsCollateralModalScreenOpen}
          />
        )}
        {/* {activeTab === TabsEnum.AGENT && (
          <PriorityTab
            onNext={() => {
              setActiveTab(TabsEnum.LAUNCH);
            }}
          />
        )} */}
        {activeTab === TabsEnum.LAUNCH && (
          <LaunchTab
            onComplete={(agentAddress) => {
              onChangeScreen({ type: "dashboard" });
              onChangeModalScreen({
                type: "agent",
                agentAddress,
              });
            }}
          />
        )}
      </div>
      <ModalScreenWrapper
        headerText="One-time"
        isVisible={isOneTimeLoanModalScreenOpen}
        onBack={() => setIsOneTimeLoanModalScreenOpen(false)}
      >
        {isOneTimeLoanModalScreenOpen ? (
          <OneTimeLoan
            clearError={() => setIsBorrowError(false)}
            onSubmit={() => {
              setIsOneTimeLoanModalScreenOpen(false);
            }}
          />
        ) : null}
      </ModalScreenWrapper>
      <ModalScreenWrapper
        headerText="Recurring"
        isVisible={isRegularLoanModalScreenOpen}
        onBack={() => setIsRegularLoanModalScreenOpen(false)}
      >
        {isRegularLoanModalScreenOpen ? (
          <RegularLoan
            clearError={() => setIsBorrowError(false)}
            onSubmit={() => setIsRegularLoanModalScreenOpen(false)}
          />
        ) : null}
      </ModalScreenWrapper>
      {/* <ModalScreenWrapper
        headerText="Collateral"
        isVisible={isCollateralModalScreenOpen}
        onBack={() => setIsCollateralModalScreenOpen(false)}
      >
        {isCollateralModalScreenOpen ? (
          <Collateral
            ltv={ltv}
            setLtv={setLtv}
            collaterals={collaterals}
            setCollaterals={(value) => {
              setCollaterals(value);

              if (value) {
                setIsCollateralError(false);
              }
            }}
            onNext={() => setIsCollateralModalScreenOpen(false)}
          />
        ) : null}
      </ModalScreenWrapper> */}
    </>
  );
}
