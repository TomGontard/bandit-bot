# 🤠 Bandit Bot (Discord + Web3 + Monad)

Ce bot Discord permet de :
- Lier un compte Discord à une adresse EVM (Monad)
- Vérifier la possession d’un NFT sur Monad pour attribuer un rôle
- Synchroniser les rôles périodiquement via cron
- Relayer les tweets d’un compte Twitter dans un salon Discord
- Prévoir une intégration future avec une interface web

## 🧱 Stack technique

- Node.js + Discord.js
- MongoDB (Atlas)
- ethers.js (Web3 EVM)
- node-cron (synchronisation)
- Twitter API v2
- PM2 pour le déploiement

## 🚀 Démarrer le projet

```bash
# Installation des dépendances
npm install

# Lancer en dev
npm run dev

# Fichier .env requis à la racine
