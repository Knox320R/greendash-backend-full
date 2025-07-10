require("dotenv").config();
const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Staking, AdminSetting, StakingPackage, Transaction } = require('./db/models');

// Main function to calculate and distribute the daily bonus
// This function is called automatically by the scheduler at the configured time
async function calculateAndDistributeBonus() {
    try {
        // 1. Fetch relevant admin settings for the daily bonus logic
        // - daily_pool: tokens locked in staking today
        // - total_staking_pool: cumulative tokens locked in staking
        // - platform_fee: percentage of daily_pool to use as bonus (default 10%)
        const [dailyPoolSetting, totalStakingPoolSetting, platformFeeSetting] = await Promise.all([
            AdminSetting.findOne({ where: { title: 'daily_pool' } }),
            AdminSetting.findOne({ where: { title: 'total_staking_pool' } }),
            AdminSetting.findOne({ where: { title: 'platform_fee' } })
        ]);
        
        // Parse all values from strings to numbers for calculation
        let dailyPool = parseFloat(dailyPoolSetting.value || '0');
        let totalStakingPool = parseFloat(totalStakingPoolSetting.value || '0');
        let platformFeePercent = platformFeeSetting ? parseFloat(platformFeeSetting.value) : 10.0;
        
        // Validate platformFeePercent (should be between 0 and 100)
        if (isNaN(platformFeePercent) || platformFeePercent <= 0 || platformFeePercent > 100) {
            platformFeePercent = 10.0;
        }

        // If no new staking today, skip bonus distribution
        if (dailyPool <= 0) {
            console.log('No new staking today. Skipping daily bonus.');
            return;
        }

        // 2. Calculate the bonus pool and the amount to add to total_staking_pool
        // - bonusPool: the portion of daily_pool to distribute as bonus (platformFeePercent%)
        // - toTotalStaking: the remaining 90% (or 100% - platformFeePercent%)
        const bonusPool = dailyPool * (platformFeePercent / 100);
        const toTotalStaking = dailyPool - bonusPool;
        const newTotalStakingPool = totalStakingPool + toTotalStaking;

        // 3. Fetch all users with active staking and calculate their total staked EGD
        // Only users with at least one active staking are eligible for the bonus
        const stakers = await User.findAll({
            include: [{
                model: Staking,
                as: 'stakings',
                where: { status: 'active' },
                required: true,
                include: [{ model: StakingPackage, as: 'package' }]
            }]
        });
        
        let totalStakedEGD = 0;
        // Build a list of each staker's total staked EGD and daily yield
        const userStakingInfo = stakers.map(user => {
            let userTotalStaked = 0;
            let userDailyYield = 0;
            user.stakings.forEach(staking => {
                const pkg = staking.package;
                if (pkg) {
                    userTotalStaked += parseFloat(pkg.stake_amount);
                    userDailyYield += pkg.stake_amount * (pkg.daily_yield_percentage / 100);
                }
            });
            totalStakedEGD += userTotalStaked;
            console.log(user.id, userTotalStaked, userDailyYield);
            return { user, userTotalStaked, userDailyYield };
        });

        // 4. Credit daily yield from staking packages to each user
        for (const info of userStakingInfo) {
            if (info.userDailyYield > 0) {
                await info.user.increment('egd_balance', { by: info.userDailyYield });
                await Transaction.create({
                    user_id: info.user.id,
                    type: 'daily_reward',
                    amount: info.userDailyYield,
                });
            }
        }

        // 5. Distribute the universal bonus pool proportionally to all active stakers
        // Each user's share is based on their proportion of the total staked EGD
        if (bonusPool > 0 && totalStakedEGD > 0) {
            for (const info of userStakingInfo) {
                if (info.userTotalStaked > 0) {
                    // Calculate the user's share of the bonus pool
                    const userShare = bonusPool * (info.userTotalStaked / totalStakedEGD);
                    // Increment the user's EGD balance
                    await info.user.increment('egd_balance', { by: userShare });
                    // Record the bonus as a transaction for transparency and audit
                    await Transaction.create({
                        user_id: info.user.id,
                        type: 'universal_cashback',
                        amount: userShare,
                    });
                }
            }
        }

        // 6. Update the pools in admin_settings
        // - total_staking_pool is increased by 90% of daily_pool
        // - daily_pool is reset to 0 for the next day
        await totalStakingPoolSetting.update({ value: newTotalStakingPool.toString() });
        await dailyPoolSetting.update({ value: '0' });

        console.log(`✅ Daily bonus distributed: ${bonusPool} EGD to ${stakers.length} stakers. ${toTotalStaking} EGD moved to total_staking_pool. Daily yields credited.`);
    } catch (err) {
        console.error('❌ Error in daily bonus distribution:', err);
    }
}

// Scheduler initialization
// Reads the daily_bonus_time from admin_settings and schedules the daily bonus job accordingly
module.exports = async () => {
    try {
        // Fetch the scheduled time for the daily bonus from admin_settings
        const dailyBonusTimeSetting = await AdminSetting.findOne({ where: { title: 'daily_bonus_time' } });
        const timeStr = dailyBonusTimeSetting ? dailyBonusTimeSetting.value : '0:0';

        // const ss = Date.now() +10000
        // const s = new Date(ss).getUTCSeconds()
        // const cronTime = `${s} * * * * *`; // Run daily at the specified time

        // Convert time string (e.g., '13:06') to cron expression
        const [hour, minute] = timeStr.split(':').map(Number);
        const cronTime = `${minute} ${hour} * * *`; // Run daily at the specified time

        // Validate cron expression
        if (!cron.validate(cronTime)) {
            console.error('❌ Invalid cron expression:', cronTime);
            return;
        }

        await calculateAndDistributeBonus();
        // Schedule the daily bonus calculation at the specified time every day
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