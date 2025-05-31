// config/giveawayWeights.js
import 'dotenv/config';

export default {
  roles: {
    [process.env.ROLE_ERRAND_ID]: 1.0,
    [process.env.ROLE_MULE_ID]: 1.25,
    [process.env.ROLE_GANGSTER_ID]: 1.5,
    [process.env.ROLE_UNDERBOSS_ID]: 1.75,
    [process.env.ROLE_BOSS_ID]: 2.0,
  },
};
