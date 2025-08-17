require('dotenv').config();
const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Staking, StakingPackage, Transaction, AdminSetting, TotalToken, TokenPool } = require('./db/models');
const fs = require('fs');
const { monitorUserProfit } = require('./utils/common');

/**
 * Main function to calculate and distribute the daily staking bonus (rewards)
 */
async function calculateAndDistributeBonus() {
    try {
        // 1. Fetch daily and total staking pools from TokenPool
        const dailyPoolToken = await TokenPool.findOne({ where: { title: 'daily_staking' } });
        const totalPoolToken = await TokenPool.findOne({ where: { title: 'total_staking' } });

        // // Check if pools exist
        // if (!dailyPoolToken || !totalPoolToken) {
        //     console.log('❌ Required token pools not found. Skipping daily bonus.');
        //     return;
        // }

        // // If no new staking today, skip bonus distribution
        // if (dailyPool <= 0) {
        //     console.log('No new staking today. Skipping daily bonus.');
        //     return;
        // }

        let dailyPool = parseFloat(dailyPoolToken.amount) || 0;
        let totalStakingPool = parseFloat(totalPoolToken.amount) || 0;

        const newTotalStakingPool = totalStakingPool + dailyPool;

        // 5. Update the pools in TokenPool
        await totalPoolToken.update({ amount: newTotalStakingPool });
        await dailyPoolToken.update({ amount: 0 });

        // 2. Move all daily pool to total staking pool
        // 3. Fetch all users with active staking and calculate their total staked EGD and daily yield
        const stakers = await User.findAll({
            include: [{
                model: Staking,
                as: 'stakings',
                where: { status: { [Op.in]: ['active', 'free_staking']} },
                required: true,
                include: [{ model: StakingPackage, as: 'package' }]
            }]
        });

        // Calculate each user's total staked and daily yield
        const userStakingInfo = stakers.map(user => {
            let userTotalStaked = 0;
            let userDailyYield = 0;
            user.stakings.forEach(staking => {
                const pkg = staking.package;
                if (pkg) {
                    userTotalStaked += parseFloat(pkg.stake_amount) || 0;
                    userDailyYield += (parseFloat(pkg.stake_amount) || 0) * ((parseFloat(pkg.daily_yield_percentage) || 0) / 100);
                }
            });
            return { user, userTotalStaked, userDailyYield };
        });

        // 4. Credit daily yield from staking packages to each user
        let total_daily_rewards = 0;
        for (const info of userStakingInfo) {
            if (info.userDailyYield > 0) {
                if(info.user.benefit_overflow) continue;
                total_daily_rewards += info.userDailyYield;
                await info.user.increment('new_egd_balance', { by: info.userDailyYield });
                await Transaction.create({
                    user_id: info.user.id,
                    type: 'daily_reward',
                    amount: info.userDailyYield,
                    created_at: new Date()
                });
                await monitorUserProfit(info.user.id);
            }
        }

        // Deduct rewards from 'staking & reserves' in TotalToken
        await TotalToken.increment('amount', { by: -total_daily_rewards, where: { title: 'staking_reserves' } });

        console.log(`✅ Daily staking rewards distributed to ${stakers.length} stakers. ${dailyPool} EGD moved to total_staking. Daily yields credited.`);
    } catch (err) {
        console.error('❌ Error in daily bonus distribution:', err);
    }
}

/**
 * Scheduler initialization
 * This function sets up the cron job to run the daily bonus at the configured time
 */
module.exports = async () => {
    try {
        // Fetch the scheduled time for the daily bonus from admin_settings
        const dailyBonusTimeSetting = await AdminSetting.findOne({ where: { title: 'daily_bonus_time' } });

        if (!dailyBonusTimeSetting) {
            console.error('❌ daily_bonus_time setting not found in admin_settings.');
            return;
        }

        const timeStr = dailyBonusTimeSetting.value;
        const [hour, minute] = timeStr.split(':').map(Number);

        // Validate time format
        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            console.error('❌ Invalid time format in daily_bonus_time setting:', timeStr);
            return;
        }

        const cronTime = `${minute} ${hour} * * *`;
        if (!cron.validate(cronTime)) {
            console.error('❌ Invalid cron expression:', cronTime);
            return;
        }

        // Run initial calculation immediately on startup
        // await calculateAndDistributeBonus();

        // Schedule the daily job
        const job = cron.schedule(cronTime, async () => {
            console.log('🎯 Daily bonus job triggered at', new Date().toISOString());
            try {
                await calculateAndDistributeBonus();
            } catch (error) {
                console.error('❌ Error in daily bonus calculation:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        console.log(`⏰ Daily bonus scheduler initialized (runs daily at ${timeStr} UTC)`);
        return job;
    } catch (error) {
        console.error('❌ Error initializing daily bonus scheduler:', error);
    }
};