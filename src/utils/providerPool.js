// src/utils/providerPool.js
import { JsonRpcProvider } from 'ethers';

/**
 * Récupère les URLs RPC (MONAD_RPC_URL_1 … MONAD_RPC_URL_3)
 * et s’assure qu’il y en a au moins une.
 */
function urlsFromEnv() {
  const urls = [];
  for (let i = 1; i <= 3; i++) {
    const key = `MONAD_RPC_URL_${i}`;
    if (process.env[key]) {
      urls.push(process.env[key]);
    }
  }
  if (!urls.length) {
    throw new Error('❌ Aucun MONAD_RPC_URL_{1..3} défini dans .env');
  }
  return urls;
}

const urls = urlsFromEnv();

/**
 * Déclaration du réseau pour ethers
 */
const MONAD_NETWORK = {
  name:    'monad-testnet',
  chainId: 10143,
  _defaultProvider: provs => provs[0]
};

/**
 * Création des providers JSON-RPC
 */
const providers = urls.map(url => {
  const p = new JsonRpcProvider(url, MONAD_NETWORK);
  console.log(`✅ Provider initialized for ${url}`);
  return p;
});

/**
 * Round-robin simple : renvoie providers[i % providers.length]
 */
export function getProvider(i = 0) {
  return providers[i % providers.length];
}

export { providers };
