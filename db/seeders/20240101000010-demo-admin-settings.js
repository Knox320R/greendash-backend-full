'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('admin_settings', [
      { title: 'platform_wallet_address', description: 'Platform wallet public key', value: '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e'},
      { title: 'usdt_token_address', description: 'token address', value: '0x6B4DB11F674d3A3e471Bea12dCfbE44c6F6A0438'},
      { title: 'platform_fee', description: 'Platform fee to redistribute to all stakers(daily in EGD)', value: '10.0'},
      { title: 'min_withdrawal', description: 'Minimum withdrawal amount', value: '10'},
      { title: 'max_withdrawal', description: 'Maximum withdrawal amount', value: '1000'},
      { title: 'unilevel_commission_enable', description: 'Unilevel commission enabled', value: 'true'},
      { title: 'universal_cashback_enable', description: 'Universal cashbakc enabled', value: 'true'},
      { title: 'rank_reward_enable', description: 'Pay in USDT or electric vehicle equivalent', value: 'true'},
      { title: 'daily_bonus_time', description: 'When this platform calculates all daily bonus for stakers.', value: '10:00'},
      { title: 'platform_name', description: 'Platform display name', value: 'GreenDash'}
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('admin_settings', null, {});
  }
}; 