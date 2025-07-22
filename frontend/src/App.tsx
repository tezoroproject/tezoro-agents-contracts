import "./App.css";

import { useCallback, useEffect, useState } from "react";
import { HomeScreen } from "./components/screens/HomeScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import { ScreenWrapper } from "./components/screens/ScreenWrapper";
import { cn } from "./utils/utils";
import { ConnectWalletScreen } from "./components/screens/ConnectWalletScreen";
import { DashboardScreen } from "./components/screens/DashboardScreen";
import { useResetActiveDeployment } from "./hooks/useResetActiveDeployment";
import { useAggregatedTokens } from "./hooks/useAggregatedTokens";
import { SettingsButton } from "./components/SettingsButton";
import { useLocalStorageSelector } from "./hooks/useLocalStorageSelector";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { ModalScreenType, ScreenType } from "./schemas/localstorage-schema";
import { TabsEnum } from "./constants";
import { useInitializeAllocation } from "./hooks/useInitializeAllocation";
import { AgentScreen } from "./components/screens/AgentScreen";
// import { AgentTokenScreen } from "./components/screens/AgentTokenScreen";
import { useTezoro } from "./hooks";
import { ToastContainer } from "./components/ToastContainer";
import { useCleanUnreachableTokens } from "./hooks/useCleanUnreachableTokens";
import { useSetFirstToken } from "./hooks/useSetFirstToken";
import { ConfirmationContainer } from "./components/ConfirmationContainer";
import { ModalScreenWrapper } from "./components/screens/ModalScreenWrapper";
import { AgentTokenScreen } from "./components/screens/AgentTokenScreen";
import { SelectToken } from "./components/SelectToken";
import { AssetsScreen } from "./components/screens/AssetsScreen";
import { ExplorerLink } from "./components/ExplorerLink";
import { YieldBacktestScreen } from "./components/screens/YieldBacktestScreen";
import { RiskManagementScreen } from "./components/screens/RiskManagementScreen";

function App() {
  const screen = useLocalStorageSelector((state) => state?.screen);
  const prevScreen = useLocalStorageSelector((state) => state?.prevScreen);
  const { updateLocalStorage } = useLocalStorage();

  const setScreen = useCallback(
    (newScreen: ScreenType) => {
      updateLocalStorage?.((draft) => {
        draft.screen = newScreen;
      });
    },
    [updateLocalStorage]
  );

  const [modalScreen, setModalScreen] = useState<ModalScreenType | null>(null);

  const [selectToken, setSelectToken] = useState<string | null | undefined>();

  useEffect(() => {
    if (screen && screen.type !== "settings") {
      updateLocalStorage?.((draft) => {
        draft.prevScreen = screen;
      });
    }
  }, [screen, updateLocalStorage]);

  useAggregatedTokens();
  useInitializeAllocation();
  useSetFirstToken();
  useResetActiveDeployment();
  useCleanUnreachableTokens();

  const { currentChainInfo, refetchAgents } = useTezoro();

  const handleWalletConnect = () => {
    if (currentChainInfo) {
      // If current chain in wallet presents in available chains
      refetchAgents((agents) => {
        if (agents && agents.length > 0) {
          setScreen({
            type: "dashboard",
          });
        } else {
          setScreen({
            type: "home",
            tab: TabsEnum.ASSETS,
          });
        }
      });
    } else {
      setScreen({
        type: "home",
        tab: TabsEnum.ASSETS,
      });
    }

    setModalScreen(null);
  };

  useEffect(() => {
    if (!currentChainInfo) {
      setScreen({
        type: "home",
        tab: TabsEnum.ASSETS,
      });
    }
  }, [currentChainInfo, setScreen]);

  return (
    <div className="relative py-[14px] max-[540px]:px-1 px-5 w-full max-w-[620px]">
      <div
        className={cn(
          "overflow-hidden w-full max-w-[580px] h-[503px]",
          "relative flex flex-col"
        )}
      >
        {screen?.type === "home" && (
          <HomeScreen
            isBottomLayer={Boolean(
              modalScreen?.type === "connect_wallet" ||
                modalScreen?.type === "yieldBacktest" ||
                modalScreen?.type === "riskManagement" ||
                selectToken ||
                selectToken === null
            )}
            onChangeScreen={setScreen}
            onChangeModalScreen={setModalScreen}
            setSelectToken={setSelectToken}
          />
        )}
        {screen?.type === "settings" && (
          <ScreenWrapper
            headerText="Settings"
            renderActionButton={() => (
              <SettingsButton
                onClick={() => {
                  if (prevScreen?.type === "dashboard") {
                    setScreen({
                      type: "dashboard",
                    });
                  } else {
                    setScreen({
                      type: "home",
                      tab: TabsEnum.ASSETS,
                    });
                  }
                }}
              />
            )}
            // containerClassName="max-[410px]:pb-4 max-[540px]:pb-4 pb-4"
          >
            <SettingsScreen
              onDisconnect={() =>
                setScreen({ type: "home", tab: TabsEnum.ASSETS })
              }
              onChangeScreen={setScreen}
            />
          </ScreenWrapper>
        )}
        {screen?.type === "dashboard" && (
          <ScreenWrapper
            headerText="Dashboard"
            renderActionButton={() => (
              <SettingsButton onClick={() => setScreen({ type: "settings" })} />
            )}
            isBottomLayer={Boolean(modalScreen)}
          >
            {modalScreen ? null : (
              <DashboardScreen
                goHome={() => {
                  setScreen({
                    type: "home",
                    tab: TabsEnum.ASSETS,
                  });
                }}
                onChangeModalScreen={setModalScreen}
              />
            )}
          </ScreenWrapper>
        )}
        <SelectToken
          selectToken={selectToken}
          setSelectToken={setSelectToken}
        />
        <ModalScreenWrapper
          onBack={() => setModalScreen(null)}
          headerText="Connect a wallet"
          isVisible={modalScreen?.type === "connect_wallet"}
        >
          {modalScreen?.type === "connect_wallet" ? (
            <ConnectWalletScreen onConnect={handleWalletConnect} />
          ) : null}
        </ModalScreenWrapper>
        <ModalScreenWrapper
          onBack={() => setModalScreen(null)}
          headerText="Yield Farming Backtest"
          isVisible={modalScreen?.type === "yieldBacktest"}
        >
          {modalScreen?.type === "yieldBacktest" ? (
            <YieldBacktestScreen />
          ) : null}
        </ModalScreenWrapper>
        <ModalScreenWrapper
          onBack={() => setModalScreen(null)}
          headerText="AI-powered Risk Management"
          isVisible={modalScreen?.type === "riskManagement"}
        >
          {modalScreen?.type === "riskManagement" ? (
            <RiskManagementScreen />
          ) : null}
        </ModalScreenWrapper>
        <ModalScreenWrapper
          headerText="Yield Farming agent"
          onBack={() => setModalScreen(null)}
          isVisible={Boolean(
            modalScreen?.type === "agent" && modalScreen.agentAddress
          )}
          isBottomLayer={
            modalScreen?.type === "agentToken" ||
            modalScreen?.type === "addFunds"
          }
        >
          {modalScreen?.type === "agent" && modalScreen.agentAddress ? (
            <AgentScreen
              agentAddress={modalScreen.agentAddress}
              onChangeModalScreen={setModalScreen}
            />
          ) : null}
        </ModalScreenWrapper>
        <ModalScreenWrapper
          headerText="Yield Farming history"
          onBack={() => {
            const agentAddress =
              modalScreen?.type === "agentToken"
                ? modalScreen?.agentAddress
                : null;

            if (agentAddress) {
              setModalScreen({
                type: "agent",
                agentAddress,
              });
            }
          }}
          isVisible={Boolean(
            modalScreen?.type === "agentToken" &&
              modalScreen.agentAddress &&
              modalScreen.tokenAddress
          )}
          isBottomLayer={modalScreen?.type === "addFunds"}
        >
          {modalScreen?.type === "agentToken" &&
          modalScreen.agentAddress &&
          modalScreen.tokenAddress ? (
            <AgentTokenScreen
              agentAddress={modalScreen.agentAddress}
              tokenAddress={modalScreen.tokenAddress}
            />
          ) : null}
        </ModalScreenWrapper>
        <ModalScreenWrapper
          headerText={
            <>
              <span className="max-[540px]:block">
                You're adding funds to the agent
              </span>{" "}
              {modalScreen?.type === "addFunds" && modalScreen.agentAddress ? (
                <ExplorerLink address={modalScreen.agentAddress} />
              ) : null}
            </>
          }
          onBack={() => {
            if (
              modalScreen?.type === "addFunds" &&
              modalScreen.typeBefore === "agent"
            ) {
              setModalScreen({
                type: "agent",
                agentAddress: modalScreen.agentAddress,
              });
            } else {
              setModalScreen(null);
            }
          }}
          isVisible={modalScreen?.type === "addFunds"}
          isBottomLayer={Boolean(selectToken || selectToken === null)}
        >
          {modalScreen?.type === "addFunds" ? (
            <AssetsScreen
              setSelectToken={setSelectToken}
              onComplete={(agentAddress) => {
                setModalScreen({
                  type: "agent",
                  agentAddress,
                });
              }}
              onConnectWallet={() => {
                setModalScreen({ type: "connect_wallet" });
              }}
            />
          ) : null}
        </ModalScreenWrapper>
        <ToastContainer />
        <ConfirmationContainer />
      </div>
    </div>
  );
}

export default App;
