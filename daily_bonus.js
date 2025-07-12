require("dotenv").config();
const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Staking, StakingPackage, Transaction, AdminSetting, TotalToken, TokenPool } = require('./db/models');
const fs = require('fs');

// Main function to calculate and distribute the daily bonus (staking rewards only)
async function calculateAndDistributeBonus() {
    try {
        // 1. Fetch daily and total staking pools from TokenPool
        const dailyPoolToken = await TokenPool.findOne({ where: { title: 'daily_staking' } });
        const totalPoolToken = await TokenPool.findOne({ where: { title: 'total_staking' } });
        let dailyPool = dailyPoolToken ? parseFloat(dailyPoolToken.amount) : 0;
        let totalStakingPool = totalPoolToken ? parseFloat(totalPoolToken.amount) : 0;

        // If no new staking today, skip bonus distribution
        if (dailyPool <= 0) {
            console.log('No new staking today. Skipping daily bonus.');
            return;
        }

        // 2. Move all daily pool to total staking pool
        const newTotalStakingPool = totalStakingPool + dailyPool;

        // 3. Fetch all users with active staking and calculate their total staked EGD and daily yield
        const stakers = await User.findAll({
            include: [{
                model: Staking,
                as: 'stakings',
                where: { status: 'active' },
                required: true,
                include: [{ model: StakingPackage, as: 'package' }]
            }]
        });

        const userStakingInfo = stakers.map(user => {
            let userTotalStaked = 0;
            let userDailyYield = 0;
            user.stakings.forEach(staking => {
                const pkg = staking.package;
                if (pkg) {
                    userTotalStaked += parseFloat(pkg.stake_amount);
                    userDailyYield += parseFloat(pkg.stake_amount) * (parseFloat(pkg.daily_yield_percentage) / 100);
                }
            });
            return { user, userTotalStaked, userDailyYield };
        });

        // Write stakers info to report.json
        try {
            fs.writeFileSync('report.json', JSON.stringify(userStakingInfo, null, 2), 'utf8');
            console.log('✅ Stakers info written to report.json');
        } catch (err) {
            console.error('❌ Failed to write report.json:', err);
        }

        // 4. Credit daily yield from staking packages to each user
        let total_daily_rewards = 0;
        for (const info of userStakingInfo) {
            if (info.userDailyYield > 0) {
                total_daily_rewards += info.userDailyYield;
                await info.user.increment('egd_balance', { by: info.userDailyYield });
                await Transaction.create({ user_id: info.user.id, type: 'daily_reward', amount: info.userDailyYield });
            }
        }
        // Deduct rewards from 'staking & reserves' in TotalToken
        await TotalToken.increment('amount', { by: -total_daily_rewards }, { where: { title: "staking & reserves" } });

        // 5. Update the pools in TokenPool
        await totalPoolToken.update({ amount: newTotalStakingPool });
        await dailyPoolToken.update({ amount: 0 });

        console.log(`✅ Daily staking rewards distributed to ${stakers.length} stakers. ${dailyPool} EGD moved to total_staking. Daily yields credited.`);
    } catch (err) {
        console.error('❌ Error in daily bonus distribution:', err);
    }
}

// Scheduler initialization
module.exports = async () => {
    try {
        // Fetch the scheduled time for the daily bonus from admin_settings
        const dailyBonusTimeSetting = await AdminSetting.findOne({ where: { title: 'daily_bonus_time' } });
        const timeStr = dailyBonusTimeSetting ? dailyBonusTimeSetting.value : '0:0';
        const [hour, minute] = timeStr.split(':').map(Number);
        const cronTime = `${minute} ${hour} * * *`;
        if (!cron.validate(cronTime)) {
            console.error('❌ Invalid cron expression:', cronTime);
            return;
        }
        await calculateAndDistributeBonus();
        const job = cron.schedule(cronTime, async () => {
            console.log('🎯 Daily bonus job triggered at', new Date().toISOString());
            try {
                await calculateAndDistributeBonus();
            } catch (error) {
                console.error('❌ Error in daily bonus calculation:', error);
            }
        }, {
            scheduled: true,
            timezone: "UTC"
        });
        console.log(`⏰ Daily bonus scheduler initialized (runs daily at ${timeStr} UTC)`);
        return job;
    } catch (error) {
        console.error('❌ Error initializing daily bonus scheduler:', error);
    }
}