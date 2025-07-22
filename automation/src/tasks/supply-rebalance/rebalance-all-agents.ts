import {
  encodeFunctionData,
  // formatEther,
  // formatUnits,
  PrivateKeyAccount,
  Address,
} from "viem";
import TezoroLendingAgentAbi from "../../blockchain/abis/TezoroLendingAgent.abi";
import {
  analyzeGasLimits,
  // DEFAULT_BUFFER_MULTIPLIER,
  getAdaptiveBlocks,
  // getRecommendedGasPrice,
} from "../../blockchain/get-recommended-gas-price";
import { Config } from "../../chain";
import { generateRebalancePlan } from "./generate-rebalance-plan";
import { AbiParametersToPrimitiveTypes, ExtractAbiFunction } from "abitype";
import { indexerSDK } from "../../clients/indexer";

export async function rebalanceAllAgents(
  config: Config,
  account: PrivateKeyAccount
) {
  const { publicClient, walletClient, chain } = config;
  const {
    agents: { items: agents },
  } = await indexerSDK.allAgentsQuery();

  console.log(`On ${publicClient.chain?.name} found ${agents.length} agents.`);

  for (const agent of agents) {
    const { fromProtocols, marketsFrom, marketsTo, toProtocols } =
      await generateRebalancePlan({
        chainId: chain.id,
        publicClient,
        agent: agent.id as Address,
        account: account.address,
      });

    if (marketsFrom.length === 0) {
      console.log(
        `${new Date().toUTCString()}: No rebalancing needed. Skipping.`
      );
      continue;
    }

    console.log(
      `${new Date().toUTCString()}: Chain: ${publicClient.chain?.name} Agent: ${
        agent.id
      }`
    );

    // Build steps

    type Step = AbiParametersToPrimitiveTypes<
      ExtractAbiFunction<typeof TezoroLendingAgentAbi, "rebalance">["inputs"]
    >[number][number];

    const steps: Step[] = [];

    if (
      marketsFrom.length !== marketsTo.length ||
      marketsFrom.length !== fromProtocols.length ||
      marketsFrom.length !== toProtocols.length
    ) {
      throw new Error("Mismatched lengths in rebalance plan arrays.");
    }

    for (let i = 0; i < marketsFrom.length; i++) {
      // TEMPORARY "ONE STEP TRANSACTION" AFTER 1 STEP:
      if (i > 0) {
        console.warn(
          `${new Date().toUTCString()}: Only the first step will be executed.`
        );
        break;
      }

      const marketFrom = marketsFrom[i];
      const marketTo = marketsTo[i];
      const fromProtocol = fromProtocols[i];
      const toProtocol = toProtocols[i];

      if (marketFrom === undefined) {
        throw new Error(
          `Market from is undefined at index ${i}. MarketsFrom: ${marketsFrom}`
        );
      }
      if (marketTo === undefined) {
        throw new Error(
          `Market to is undefined at index ${i}. MarketsTo: ${marketsTo}`
        );
      }
      if (fromProtocol === undefined) {
        throw new Error(
          `From protocol is undefined at index ${i}. FromProtocols: ${fromProtocols}`
        );
      }
      if (toProtocol === undefined) {
        throw new Error(
          `To protocol is undefined at index ${i}. ToProtocols: ${toProtocols}`
        );
      }
      steps.push({
        fromMarket: marketFrom,
        fromProtocolCode: Number.parseInt(fromProtocol.toString()),
        toMarket: marketTo,
        toProtocolCode: Number.parseInt(toProtocol.toString()),
      });
    }

    const execPayload = encodeFunctionData({
      abi: TezoroLendingAgentAbi,
      functionName: "rebalance",
      args: [steps],
    });

    console.log(
      `${new Date().toUTCString()}: Rebalance plan for agent ${agent.id}`,
      JSON.stringify(
        {
          steps,
          execPayload,
        },
        null,
        2
      )
    );

    try {
      console.log(
        `${new Date().toUTCString()}: Estimating gas for transaction...`
      );
      let gasLimit;
      let baseFeePerGas = 0n;
      let priorityFeePerGas = 0n;

      if ("estimateGas" in config) {
        console.log(
          `${new Date().toUTCString()}: Using Linea's estimateGas function`
        );
        const { estimateGas } = config;
        const lineaEstimatedGas = await estimateGas?.(publicClient, {
          account,
          to: agent.id as Address,
          data: execPayload,
        });
        if (!lineaEstimatedGas) {
          console.error(
            `${new Date().toUTCString()}: No gas estimate available (linea)`
          );
          continue;
        }
        gasLimit = lineaEstimatedGas.gasLimit;
        baseFeePerGas = lineaEstimatedGas.baseFeePerGas;
        priorityFeePerGas = lineaEstimatedGas.priorityFeePerGas;

        console.log(
          `${new Date().toUTCString()}: Using overrides: maxFeePerGas = ${baseFeePerGas} wei, maxPriorityFeePerGas = ${priorityFeePerGas} wei`
        );
      } else {
        console.log(
          `${new Date().toUTCString()}: Using default estimateGas function`
        );

        try {
          gasLimit = await publicClient.estimateGas({
            account: walletClient.account,
            to: agent.id as Address,
            data: execPayload,
          });
        } catch (error) {
          console.error(
            `${new Date().toUTCString()}: Error estimating gas:`,
            error
          );

          // Try to understand reason of failure and simulate call
          const simulationResult = await publicClient.simulateContract({
            address: agent.id as Address,
            abi: TezoroLendingAgentAbi,
            functionName: "rebalance",
            args: [steps],
            account: walletClient.account,
          });

          console.log(
            `${new Date().toUTCString()}: Simulation result: ${JSON.stringify(
              simulationResult,
              null,
              2
            )}`
          );

          throw new Error(
            `${new Date().toUTCString()}: Failed to estimate gas: ${error}`
          );
        }
      }

      console.log(`${new Date().toUTCString()}: Estimated gas: ${gasLimit}`);

      const blocks = await getAdaptiveBlocks(publicClient);

      console.log(
        `${new Date().toUTCString()}: Analyzing ${blocks.length} blocks...`
      );

      const { medianGasLimit, maxGasLimit } = analyzeGasLimits(blocks);

      console.log(
        `${new Date().toUTCString()}: Median gas limit: ${medianGasLimit}, max gas limit: ${maxGasLimit}`
      );

      if (gasLimit > maxGasLimit) {
        console.warn(
          `${new Date().toUTCString()}: Estimated gas (${gasLimit}) is greater than max gas limit (${maxGasLimit}). Exiting...`
        );
        continue;
      }

      // const gasEstimates = await getRecommendedGasPrice(blocks, {
      //   minGasUsed: estimatedGas,
      //   buffer: DEFAULT_BUFFER_MULTIPLIER,
      //   client: publicClient,
      // });
      // if (!gasEstimates) {
      //   console.error(
      //     `${new Date().toUTCString()}: No gas estimates available`
      //   );
      //   continue;
      // }

      // console.log(
      //   `${new Date().toUTCString()}: Using overrides: maxFeePerGas = ${formatUnits(
      //     gasEstimates.suggestedMaxFeePerGas,
      //     9
      //   )} Gwei, maxPriorityFeePerGas = ${formatUnits(
      //     gasEstimates.suggestedPriorityFeePerGas,
      //     9
      //   )} Gwei`
      // );

      // const expectedCostWei =
      //   gasEstimates.suggestedMaxFeePerGas * estimatedGas;

      // const expectedCostETH = formatEther(expectedCostWei);
      // console.log(
      //   `${new Date().toUTCString()}: Expected cost: ${expectedCostWei} wei, ${expectedCostETH} ETH`
      // );

      const isEIP1559Supported = baseFeePerGas > 0n || priorityFeePerGas > 0n;

      let txHash;

      if (isEIP1559Supported) {
        console.log(
          `${new Date().toUTCString()}: Using EIP-1559 transaction with maxFeePerGas = ${
            baseFeePerGas + priorityFeePerGas
          } wei, maxPriorityFeePerGas = ${priorityFeePerGas} wei`
        );
        txHash = await walletClient.sendTransaction({
          chain: publicClient.chain,
          account,
          to: agent.id as Address,
          data: execPayload,
          gas: gasLimit,
          maxFeePerGas: baseFeePerGas + priorityFeePerGas,
          maxPriorityFeePerGas: priorityFeePerGas,
        });
      } else {
        console.log(`${new Date().toUTCString()}: Getting legacy gasPrice`);
        const gasPrice = await publicClient.getGasPrice();
        console.log(
          `${new Date().toUTCString()}: Using legacy gasPrice = ${gasPrice} wei`
        );

        try {
          await publicClient.call({
            account,
            to: agent.id as Address,
            data: execPayload,
            gas: gasLimit,
            gasPrice,
          });
        } catch (error) {
          console.error(
            `${new Date().toUTCString()}: Error during call simulation:`,
            error
          );
          continue;
        }

        txHash = await walletClient.sendTransaction({
          chain: publicClient.chain,
          account,
          to: agent.id as Address,
          data: execPayload,
          gas: gasLimit,
          gasPrice,
        });
      }

      console.log(`${new Date().toUTCString()}: Transaction sent: ${txHash}`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      console.log(
        `${new Date().toUTCString()}: Transaction confirmed: ${
          receipt.transactionHash
        }`
      );
    } catch (error) {
      console.error(
        `${new Date().toUTCString()}: Error sending transaction:`,
        error
      );
    }
  }
}
