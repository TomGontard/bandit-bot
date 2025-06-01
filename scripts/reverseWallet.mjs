import { HypersyncClient, Decoder, TransactionField } from "@envio-dev/hypersync-client";
import { JsonRpcProvider } from "ethers";
import { ethers } from "ethers";

async function main() {
  // Create hypersync client using the mainnet hypersync endpoint
  const client = HypersyncClient.new({
    url: "https://monad-testnet.hypersync.xyz"
  });

  const RPC_URL = "https://10143.rpc.thirdweb.com/";
  const provider = new JsonRpcProvider(RPC_URL, "any");
  const network = await provider.getNetwork();
  // 2) Récupère le numéro de bloc courant
  const block = await provider.getBlockNumber();
  console.log(`✔ Current block number: ${block}`);
  (async () => {
    try {
      // 3) Appelle getBlockNumber() pour récupérer le dernier bloc validé
      const latestBlockNumber = await provider.getBlockNumber();
      console.log('🟢 Dernier bloc sur la chaîne :', latestBlockNumber);
    } catch (err) {
      console.error('❌ Impossible de récupérer le dernier bloc :', err.message);
    }
  })

  console.log("test");

  // The query to run
  const query = {
    "fromBlock": block-1200,
    "transactions": [
      // get all transactions coming from and going to our address.
      {
        from: ["0x99227aAf5243C28E79336c459A51b1485439F7D7"]
      },
      {
        to: ["0x99227aAf5243C28E79336c459A51b1485439F7D7"]
      }
    ],
    "fieldSelection": {
      "transaction": [
        TransactionField.BlockNumber,
        TransactionField.Hash,
        TransactionField.From,
        TransactionField.To,
        TransactionField.Value,
      ]
    }
  };

  // Stream data in reverse order
  //
  // This will parallelize internal requests so we don't have to worry about pipelining/parallelizing make request -> handle response -> handle data loop
  const receiver = await client.stream(query, { reverse: false });
  const MAGIC = ethers.parseUnits('0.1', 18n);
  let i = 0;

  while (true) {
    let res = await receiver.recv();
    if (res === null) {
      break;
    }
    for (const tx of res.data.transactions) {
      if (tx.value >= MAGIC && tx.to == tx.from) {
        console.log(i + tx.hash);
        i++;
      }
    }
  }
}

main();