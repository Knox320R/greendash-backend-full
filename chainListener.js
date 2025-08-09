require("dotenv").config();
const { ethers } = require("ethers");
const { TxHash, AdminSetting } = require("./db/models");
const ERC20_ABI = require('./contract/bep-20.json');

let provider, contract, isListening = false;
let reconnectAttempts = 0;
let blockScannerInterval;
let lastProcessedBlock = 0;
let globalCallback;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;
const BLOCK_SCAN_INTERVAL = 15000; // Scan every 15 seconds

async function startListening(callback) {
    try {
        globalCallback = callback;
        
        const platform_info = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } });
        const platform_address = platform_info.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e';
        const usdt_token_address = '0x55d398326f99059fF775485246999027B3197955';

        provider = new ethers.JsonRpcProvider(process.env.BSC_MAINNET);
        contract = new ethers.Contract(usdt_token_address, ERC20_ABI, provider);

        const decimals = await contract.decimals();
        const symbol = await contract.symbol();
        console.log(decimals, symbol);
        
        // Get current block number for block scanner
        const currentBlock = await provider.getBlockNumber();
        lastProcessedBlock = currentBlock - 1;
        
        // Process historical transactions first
        await processHistoricalTransactions(platform_address, decimals, symbol, callback);

        // Set up real-time event listeners
        setupEventListeners(platform_address, decimals, symbol, callback);

        // Start block scanner as backup
        startBlockScanner(platform_address, decimals, symbol, callback);

        // Set up reconnection logic
        setupReconnectionLogic(platform_address, decimals, symbol, callback);

        isListening = true;
        reconnectAttempts = 0;

        console.log("🚀 Chain listener started with real-time events + block scanning backup");

    } catch (error) {
        console.error("Failed to start listening:", error);
        throw error;
    }
}

async function processHistoricalTransactions(platform_address, decimals, symbol, callback) {
    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100);
        
        console.log(`Processing historical transactions from block ${fromBlock} to ${currentBlock}`);

        const filter = contract.filters.Transfer(null, platform_address);
        const events = await contract.queryFilter(filter, fromBlock, currentBlock);

        console.log(`Found ${events.length} historical transfer events`);

        for (const event of events) {
            try {
                const txHash = event.transactionHash;
                
                // Check if already in database
                const existingTx = await TxHash.findOne({ where: { tx_hash: txHash } });
                if (existingTx) continue;

                // Verify transaction actually occurred by getting receipt
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt && receipt.status === 1) { // Transaction successful
                    const { from, to, value } = event.args;
                    const amount = ethers.formatUnits(value, decimals);

                    // Store in database immediately
                    await TxHash.create({ 
                        tx_hash: txHash, 
                        amount, 
                        created_at: new Date() 
                    });

                    console.log(`Processed historical transaction: ${amount} ${symbol} from ${from} to ${to}`);

                    callback({
                        from,
                        to,
                        symbol,
                        amount,
                        txHash: txHash
                    });
                }
            } catch (eventError) {
                console.error(`Error processing historical event ${event.transactionHash}:`, eventError);
                continue;
            }
        }
        
        console.log(`Historical transaction processing completed`);
    } catch (error) {
        console.error("Error processing historical transactions:", error);
        console.log("Continuing with real-time event listening...");
    }
}

function setupEventListeners(platform_address, decimals, symbol, callback) {
    try {
        contract.on("Transfer", async (from, to, value, event) => {
            try {
                if (to.toLowerCase() === platform_address.toLowerCase()) {
                    const txHash = event.transactionHash;
                    
                    // Check if already in database
                    const existingTx = await TxHash.findOne({ where: { tx_hash: txHash } });
                    if (existingTx) return;

                    console.log(`New transfer detected: ${ethers.formatUnits(value, decimals)} ${symbol} from ${from} to ${to}`);

                    // Verify transaction actually occurred
                    const receipt = await provider.getTransactionReceipt(txHash);
                    if (receipt && receipt.status === 1) {
                        const amount = ethers.formatUnits(value, decimals);
                        
                        // Store in database immediately
                        await TxHash.create({ 
                            tx_hash: txHash, 
                            amount, 
                            created_at: new Date() 
                        });

                        console.log(`Transaction verified and processed: ${amount} ${symbol}`);

                        callback({
                            from,
                            to,
                            symbol,
                            amount,
                            txHash: txHash
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing transfer event:", error);
            }
        });

        console.log("✅ Transfer event listener set up successfully");
    } catch (error) {
        console.error("Failed to set up Transfer event listener:", error);
        setTimeout(() => handleDisconnection(), 5000);
    }
}

async function startBlockScanner(platform_address, decimals, symbol, callback) {
    if (blockScannerInterval) {
        clearInterval(blockScannerInterval);
    }

    blockScannerInterval = setInterval(async () => {
        try {
            if (!isListening) return;

            const currentBlock = await provider.getBlockNumber();
            
            if (currentBlock > lastProcessedBlock) {
                await scanBlocks(lastProcessedBlock + 1, currentBlock, platform_address, decimals, symbol, callback);
                lastProcessedBlock = currentBlock;
            }
        } catch (error) {
            console.error("Block scanner error:", error);
        }
    }, BLOCK_SCAN_INTERVAL);

    console.log("🔍 Block scanner started - scanning every 15 seconds");
}

async function scanBlocks(fromBlock, toBlock, platform_address, decimals, symbol, callback) {
    try {
        if (fromBlock > toBlock) return;

        console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock}`);
        
        for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
            try {
                await scanSingleBlock(blockNumber, platform_address, decimals, symbol, callback);
            } catch (blockError) {
                console.error(`Error scanning block ${blockNumber}:`, blockError);
                continue;
            }
        }
    } catch (error) {
        console.error("Error in block scanning:", error);
    }
}

async function scanSingleBlock(blockNumber, platform_address, decimals, symbol, callback) {
    try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) return;

        for (const tx of block.transactions) {
            try {
                if (tx.to && tx.to.toLowerCase() === platform_address.toLowerCase()) {
                    const receipt = await provider.getTransactionReceipt(tx.hash);
                    if (receipt && receipt.logs && receipt.logs.length > 0) {
                        for (const log of receipt.logs) {
                            try {
                                const parsedLog = contract.interface.parseLog(log);
                                if (parsedLog && parsedLog.name === 'Transfer') {
                                    const { from, to, value } = parsedLog.args;
                                    
                                    if (to.toLowerCase() === platform_address.toLowerCase()) {
                                        const txHash = tx.hash;
                                        
                                        // Check if already in database
                                        const existingTx = await TxHash.findOne({ where: { tx_hash: txHash } });
                                        if (existingTx) continue;

                                        const amount = ethers.formatUnits(value, decimals);
                                        
                                        // Store in database immediately
                                        await TxHash.create({ 
                                            tx_hash: txHash, 
                                            amount, 
                                            created_at: new Date() 
                                        });

                                        console.log(`🔍 Block scanner found missed transaction: ${amount} ${symbol} from ${from} to ${to} in block ${blockNumber}`);

                                        callback({
                                            from,
                                            to,
                                            symbol,
                                            amount,
                                            txHash: txHash
                                        });
                                    }
                                }
                            } catch (logError) {
                                continue;
                            }
                        }
                    }
                }
            } catch (txError) {
                continue;
            }
        }
    } catch (error) {
        console.error(`Error scanning block ${blockNumber}:`, error);
    }
}

function setupReconnectionLogic(platform_address, decimals, symbol, callback) {
    setInterval(async () => {
        try {
            if (!isListening) return;
            
            const blockNumber = await provider.getBlockNumber();
            if (!blockNumber || blockNumber <= 0) {
                throw new Error("Invalid block number received");
            }
            
            if (reconnectAttempts > 0) {
                console.log("✅ Connection health restored");
                reconnectAttempts = 0;
            }
            
        } catch (error) {
            console.error("Connection health check failed:", error);
            handleDisconnection();
        }
    }, 30000);
}

async function handleDisconnection() {
    if (!isListening) return;
    
    isListening = false;
    
    if (blockScannerInterval) {
        clearInterval(blockScannerInterval);
        blockScannerInterval = null;
    }
    
    reconnectAttempts++;
    
    if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        setTimeout(async () => {
            try {
                await startListening(globalCallback);
            } catch (error) {
                console.error("Reconnection failed:", error);
                handleDisconnection();
            }
        }, RECONNECT_DELAY);
    } else {
        console.error("Max reconnection attempts reached. Please restart manually.");
    }
}

async function stopListening() {
    isListening = false;
    
    if (blockScannerInterval) {
        clearInterval(blockScannerInterval);
        blockScannerInterval = null;
        console.log("🔍 Block scanner stopped");
    }
    
    if (contract) {
        contract.removeAllListeners();
        console.log("📡 Contract event listeners removed");
    }
    
    console.log("⏹️ Chain listener stopped");
}

// Manual block scan function for catching up on missed blocks
async function manualBlockScan(fromBlock, toBlock, callback) {
    try {
        if (!globalCallback) {
            globalCallback = callback;
        }
        
        const platform_info = await AdminSetting.findOne({ where: { title: 'platform_wallet_address' } });
        const platform_address = platform_info.value || '0x3148c5c8178f340ed7f18d1B81E926C83d2B765e';
        const usdt_token_address = '0x55d398326f99059fF775485246999027B3197955';
        
        const contract = new ethers.Contract(usdt_token_address, ERC20_ABI, provider);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();
        
        console.log(`🔍 Manual block scan from ${fromBlock} to ${toBlock}`);
        await scanBlocks(fromBlock, toBlock, platform_address, decimals, symbol, globalCallback);
        console.log(`✅ Manual block scan completed`);
        
    } catch (error) {
        console.error("Manual block scan failed:", error);
        throw error;
    }
}

module.exports = { 
    startListening, 
    stopListening, 
    manualBlockScan
};
