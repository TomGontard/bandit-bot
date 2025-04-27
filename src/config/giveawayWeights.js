// config/giveawayWeights.js
// Highest role found on the member decides the weight.
// (keys are Discord role-IDs, values are multipliers)
module.exports = {
  ROLE_BOSS_ID:       2.0,
  ROLE_UNDERBOSS_ID:  1.75,
  ROLE_GANGSTER_ID:   1.5,
  ROLE_MULE_ID:       1.25,
  ROLE_ERRAND_ID:     1.0,   // fallback / default
};
