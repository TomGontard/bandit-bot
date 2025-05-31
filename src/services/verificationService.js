// src/services/verificationService.js
import { HypersyncClient, TransactionField } from "@envio-dev/hypersync-client";
import { JsonRpcProvider, ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const HYPERSYNC_URL = "https://monad-testnet.hypersync.xyz";
const RPC_URL = "https://10143.rpc.thirdweb.com/";
const MAGIC = ethers.parseUnits("0.1", 18n);
const BLOCK_LOOKBACK = 1200;

/**
 * Vérifie si une adresse s'est auto-transférée ≥ 0.1 MON
 * dans les 1200 derniers blocs en utilisant HyperSync.
 */
export async function checkSelfTransferEnvio(address) {
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid EVM address");
  }

  // Initialisation du client HyperSync
  const client = HypersyncClient.new({
    url: HYPERSYNC_URL,
    maxNumRetries: 3,
    bearerToken: `${process.env.HYPERSYNC_BEARER_TOKEN}`,
  });

  // Initialisation du provider standard
  const provider = new JsonRpcProvider(RPC_URL);

  const latestBlock = await provider.getBlockNumber();

  const query = {
    fromBlock: latestBlock - BLOCK_LOOKBACK,
    transactions: [
      { from: [address] },
      { to: [address] },
    ],
    fieldSelection: {
      transaction: [
        TransactionField.BlockNumber,
        TransactionField.Hash,
        TransactionField.From,
        TransactionField.To,
        TransactionField.Value,
      ],
    },
  };

  const receiver = await client.stream(query, { reverse: false });

  while (true) {
    const res = await receiver.recv();
    if (res === null) break;

    for (const tx of res.data.transactions) {
      if (
        tx.value !== undefined &&
        tx.from?.toLowerCase() === address.toLowerCase() &&
        tx.to?.toLowerCase() === address.toLowerCase() &&
        BigInt(tx.value) >= MAGIC
      ) {
        console.log(`✅ Self-transfer detected: ${tx.hash}`);
        return true;
      }
    }
  }

  return false;
}
