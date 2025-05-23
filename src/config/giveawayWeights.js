// config/giveawayWeights.js
module.exports = {
  roles: {
    [process.env.ROLE_ERRAND_ID]: 1.00,
    [process.env.ROLE_MULE_ID]: 1.25,
    [process.env.ROLE_GANGSTER_ID]: 1.50,
    [process.env.ROLE_UNDERBOSS_ID]: 1.75,
    [process.env.ROLE_BOSS_ID]: 2.00,
  },
  registrationMultipliers: [
    { min:   0, max: 100, weight: 2 },
    { min: 101, max: 200, weight: 1.9 },
    { min: 201, max: 300, weight: 1.8 },
    { min: 301, max: 400, weight: 1.7 },
    { min: 401, max: 500, weight: 1.6 },
    { min: 501, max: 600, weight: 1.5 },
    { min: 601, max: 700, weight: 1.4 },
    { min: 701, max: 800, weight: 1.3 },
    { min: 801, max: 900, weight: 1.2 },
    { min: 901, max: 1000, weight: 1.1 },
    { min: 1001, max: 1100, weight: 1 },
  ]
};
