'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('admin_settings', [
      { title: 'platform_wallet_address', description: 'Platform wallet public key', value: '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e', created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'total_staking_pool', description: 'total staking amount', value: '500000', created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'daily_pool', description: 'staking amount accumulated for today', value: '10000', created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'usdt_token_address', description: 'token address', value: '0x6B4DB11F674d3A3e471Bea12dCfbE44c6F6A0438', created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'token_price', description: 'Current EGD token price in USDT', value: '0.01', created_at: new Date(Date.now() - 1000000), updated_at: new Date(Date.now() - 1000000) },
      { title: 'platform_fee', description: 'Platform fee to redistribute to all stakers(daily in EGD)', value: '10.0', created_at: new Date(Date.now() - 2000000), updated_at: new Date(Date.now() - 2000000) },
      { title: 'min_withdrawal', description: 'Minimum withdrawal amount', value: '10', created_at: new Date(Date.now() - 3000000), updated_at: new Date(Date.now() - 3000000) },
      { title: 'max_withdrawal', description: 'Maximum withdrawal amount', value: '1000', created_at: new Date(Date.now() - 4000000), updated_at: new Date(Date.now() - 4000000) },
      { title: 'unilevel_commission_enable', description: 'Unilevel commission enabled', value: 'true', created_at: new Date(Date.now() - 7000000), updated_at: new Date(Date.now() - 7000000) },
      { title: 'rank_reward_enable', description: 'Pay in USDT or electric vehicle equivalent', value: 'true', created_at: new Date(Date.now() - 5000000), updated_at: new Date(Date.now() - 5000000) },
      { title: 'platform_name', description: 'Platform display name', value: 'GreenDash', created_at: new Date(Date.now() - 10000000), updated_at: new Date(Date.now() - 10000000) }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('admin_settings', null, {});
  }
}; 