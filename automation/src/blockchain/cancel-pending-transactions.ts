// cancelPendingTxs.ts
import { PrivateKeyAccount, PublicClient, WalletClient, parseGwei } from "viem";

export async function cancelPendingTransactions({
  publicClient,
  walletClient,
  account,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: PrivateKeyAccount;
}) {
  const confirmedNonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "latest",
  });
  const pendingNonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });

  if (confirmedNonce === pendingNonce) {
    console.log("✅ No pending transactions to cancel.");
    return;
  }

  console.warn(
    `⚠️  Cancelling pending transactions from nonce ${confirmedNonce} to ${
      pendingNonce - 1
    }...`
  );

  const minGasPrice = await publicClient.getGasPrice();
  const gasPrice = (minGasPrice * 11n) / 10n;

  for (let nonce = confirmedNonce; nonce < pendingNonce; nonce++) {
    console.log(`🚀 Sending cancel tx for nonce ${nonce}...`);

    const txHash = await walletClient.sendTransaction({
      chain: publicClient.chain,
      account,
      to: account.address,
      value: 0n,
      nonce,
      gas: 21000n,
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: gasPrice - 7n,
    });

    console.log(`⏳ Waiting for confirmation of cancel tx: ${txHash}...`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    console.log(
      `✅ Cancelled nonce ${nonce}, tx confirmed in block ${receipt.blockNumber}`
    );
  }

  console.log("🎉 All pending transactions cancelled and confirmed!");
}
