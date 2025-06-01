// scripts/testSingleProvider.js
const { ethers } = require('ethers');

async function testRpc(url) {
  console.log(`\n--- Testing ${url}`);
  // Essayer avec un network “any” pour contourner les vérifications automatiques
  const provider = new ethers.JsonRpcProvider(url, "any");
  try {
    // 1) Test de la connexion / détection de réseau
    const network = await provider.getNetwork();
      console.log(`✔ Detected network:`, network);
      console.log("chainId =", network.chainId, "name =", network.name);
  } catch (err) {
    console.error(`❌ getNetwork() failed:`, err.message);
  }
  try {
    // 2) Récupère le numéro de bloc courant
    const block = await provider.getBlockNumber();
    console.log(`✔ Current block number: ${block}`);
  } catch (err) {
    console.error(`❌ getBlockNumber() failed:`, err.message);
  }
}

(async () => {
  const RPC_URLS = [
    "https://10143.rpc.thirdweb.com/",
    "https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6",
    "https://testnet-rpc.monad.xyz",
    "https://monad-testnet.drpc.org",
    // "https://cold-alien-pine.monad-testnet.quiknode.pro/…"  // à désactiver si bug SSL
  ];
  for (const url of RPC_URLS) {
    await testRpc(url);
  }
})();
