#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, contractevent, token, Address, Env, Vec
};

#[contract]
pub struct FundraisingContract;

// -----------------------------
// 📋 Campaign Data Structure
// -----------------------------
#[derive(Clone)]
#[contracttype]
pub struct Campaign {
    pub company_addr: Address,        // Company wallet address
    pub equity_token_addr: Address,   // EquityToken contract address
    pub target_amount: i128,          // Target raise in stroops (1 XLM = 10,000,000 stroops)
    pub price_per_token: i128,        // Price per equity token in stroops
    pub raised_amount: i128,          // Current amount raised
    pub is_active: bool,              // Campaign active status
    pub deadline: u64,                // Unix timestamp deadline
    pub min_investment: i128,         // Minimum investment amount
    pub max_investment: i128,         // Maximum investment per investor (0 = no limit)
}

// -----------------------------
// 💰 Investment Record
// -----------------------------
#[derive(Clone)]
#[contracttype]
pub struct Investment {
    pub investor: Address,
    pub amount_invested: i128,        // Total XLM invested
    pub tokens_received: i128,        // Total equity tokens received
    pub timestamp: u64,               // When investment was made
}

// -----------------------------
// 📊 Campaign Stats
// -----------------------------
#[derive(Clone)]
#[contracttype]
pub struct CampaignStats {
    pub total_campaigns: u64,
    pub active_campaigns: u64,
    pub total_raised: i128,
}

// -----------------------------
// ❌ Error Codes
// -----------------------------
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    CampaignExists = 3,
    CampaignNotFound = 4,
    CampaignInactive = 5,
    DeadlinePassed = 6,
    DeadlineInvalid = 7,
    InvalidAmount = 8,
    InvestmentTooSmall = 9,
    InvestmentTooLarge = 10,
    Unauthorized = 11,
    CannotWithdraw = 12,
    TransferFailed = 13,
    InsufficientBalance = 14,
}

// -----------------------------
// 📢 Event Definitions
// -----------------------------
#[contractevent]
pub struct InitEvent {
    pub admin: Address,
}

#[contractevent]
pub struct CampaignCreatedEvent {
    pub campaign_id: u64,
    pub company: Address,
    pub target_amount: i128,
    pub price_per_token: i128,
    pub deadline: u64,
}

#[contractevent]
pub struct InvestedEvent {
    pub campaign_id: u64,
    pub investor: Address,
    pub amount: i128,
    pub tokens_received: i128,
}

#[contractevent]
pub struct WithdrawnEvent {
    pub campaign_id: u64,
    pub company: Address,
    pub amount: i128,
}

#[contractevent]
pub struct CampaignClosedEvent {
    pub campaign_id: u64,
}

// -----------------------------
// 🗄️ Storage Keys
// -----------------------------
const KEY_INITIALIZED: &str = "INIT";
const KEY_ADMIN: &str = "ADMIN";
const KEY_XLM_TOKEN: &str = "XLM";
const KEY_STATS: &str = "STATS";

// -----------------------------
// ⚙️ Contract Implementation
// -----------------------------
#[contractimpl]
impl FundraisingContract {
    
    // =============================
    // 🚀 INITIALIZATION
    // =============================
    
    /// Initialize the fundraising contract (one-time only)
    pub fn initialize(env: Env, admin: Address, xlm_token_addr: Address) {
        if env.storage().instance().has(&KEY_INITIALIZED) {
            panic!("Already initialized");
        }

        admin.require_auth();

        // Store admin and XLM token address
        env.storage().instance().set(&KEY_ADMIN, &admin);
        env.storage().instance().set(&KEY_XLM_TOKEN, &xlm_token_addr);
        env.storage().instance().set(&KEY_INITIALIZED, &true);

        // Initialize stats
        let stats = CampaignStats {
            total_campaigns: 0,
            active_campaigns: 0,
            total_raised: 0,
        };
        env.storage().instance().set(&KEY_STATS, &stats);

        InitEvent {
            admin: admin.clone(),
        }
        .publish(&env);
    }

    // =============================
    // 📋 CAMPAIGN MANAGEMENT
    // =============================
    
    /// Create a new fundraising campaign
    pub fn create_campaign(
        env: Env,
        campaign_id: u64,
        company_addr: Address,
        equity_token_addr: Address,
        target_amount: i128,
        price_per_token: i128,
        deadline: u64,
        min_investment: i128,
        max_investment: i128,
    ) {
        Self::require_initialized(&env);
        company_addr.require_auth();

        // Validations
        if target_amount <= 0 || price_per_token <= 0 || min_investment <= 0 {
            panic!("Invalid amount");
        }

        if deadline <= env.ledger().timestamp() {
            panic!("Deadline invalid");
        }

        if max_investment > 0 && max_investment < min_investment {
            panic!("Invalid amount");
        }

        // Check if campaign ID already exists
        let campaign_key = Self::get_campaign_key(campaign_id);
        if env.storage().persistent().has(&campaign_key) {
            panic!("Campaign exists");
        }

        // Create campaign
        let campaign = Campaign {
            company_addr: company_addr.clone(),
            equity_token_addr: equity_token_addr.clone(),
            target_amount,
            price_per_token,
            raised_amount: 0,
            is_active: true,
            deadline,
            min_investment,
            max_investment,
        };

        // Store campaign
        env.storage().persistent().set(&campaign_key, &campaign);

        // Initialize empty investors list
        let investors: Vec<Address> = Vec::new(&env);
        let investors_key = Self::get_investors_key(campaign_id);
        env.storage().persistent().set(&investors_key, &investors);

        // Update stats
        let mut stats: CampaignStats = env.storage().instance().get(&KEY_STATS).unwrap();
        stats.total_campaigns += 1;
        stats.active_campaigns += 1;
        env.storage().instance().set(&KEY_STATS, &stats);

        // Emit event
        CampaignCreatedEvent {
            campaign_id,
            company: company_addr.clone(),
            target_amount,
            price_per_token,
            deadline,
        }
        .publish(&env);
    }

    // =============================
    // 💰 INVESTMENT FUNCTIONS
    // =============================
    
    /// Invest in a campaign
    pub fn invest(
        env: Env,
        campaign_id: u64,
        investor: Address,
        amount: i128,
    ) {
        Self::require_initialized(&env);
        investor.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        // Load campaign
        let campaign_key = Self::get_campaign_key(campaign_id);
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&campaign_key)
            .unwrap_or_else(|| panic!("Campaign not found"));

        // Validate campaign status
        if !campaign.is_active {
            panic!("Campaign inactive");
        }

        if env.ledger().timestamp() > campaign.deadline {
            panic!("Deadline passed");
        }

        // Check investment limits
        if amount < campaign.min_investment {
            panic!("Investment too small");
        }

        // Check max investment per investor
        if campaign.max_investment > 0 {
            let investment_key = Self::get_investment_key(campaign_id, &investor);
            let existing_investment: Option<Investment> = env.storage().persistent().get(&investment_key);
            
            let total_investment = match existing_investment {
                Some(inv) => inv.amount_invested + amount,
                None => amount,
            };

            if total_investment > campaign.max_investment {
                panic!("Investment too large");
            }
        }

        // Transfer XLM from investor to contract
        let xlm_token_addr: Address = env.storage().instance().get(&KEY_XLM_TOKEN).unwrap();
        let xlm_token = token::Client::new(&env, &xlm_token_addr);
        let contract_addr = env.current_contract_address();

        xlm_token.transfer(&investor, &contract_addr, &amount);

        // Calculate tokens to mint
        let tokens_to_mint = amount / campaign.price_per_token;
        if tokens_to_mint <= 0 {
            panic!("Investment too small");
        }

        // Update campaign
        campaign.raised_amount += amount;
        env.storage().persistent().set(&campaign_key, &campaign);

        // Update or create investment record
        let investment_key = Self::get_investment_key(campaign_id, &investor);
        let investment = match env.storage().persistent().get::<_, Investment>(&investment_key) {
            Some(mut existing) => {
                existing.amount_invested += amount;
                existing.tokens_received += tokens_to_mint;
                existing
            }
            None => Investment {
                investor: investor.clone(),
                amount_invested: amount,
                tokens_received: tokens_to_mint,
                timestamp: env.ledger().timestamp(),
            }
        };
        env.storage().persistent().set(&investment_key, &investment);

        // Add investor to list if not already present
        let investors_key = Self::get_investors_key(campaign_id);
        let mut investors: Vec<Address> = env.storage().persistent().get(&investors_key).unwrap();
        
        if !Self::vec_contains(&investors, &investor) {
            investors.push_back(investor.clone());
            env.storage().persistent().set(&investors_key, &investors);
        }

        // Transfer equity tokens to investor (assumes company has pre-minted tokens to contract)
        let equity_token = token::Client::new(&env, &campaign.equity_token_addr);
        equity_token.transfer(&contract_addr, &investor, &tokens_to_mint);

        // Update global stats
        let mut stats: CampaignStats = env.storage().instance().get(&KEY_STATS).unwrap();
        stats.total_raised += amount;
        env.storage().instance().set(&KEY_STATS, &stats);

        // Emit event
        InvestedEvent {
            campaign_id,
            investor: investor.clone(),
            amount,
            tokens_received: tokens_to_mint,
        }
        .publish(&env);
    }

    // =============================
    // 💸 WITHDRAWAL FUNCTIONS
    // =============================
    
    /// Withdraw raised funds (company only, after conditions met)
    pub fn withdraw_funds(env: Env, campaign_id: u64) {
        Self::require_initialized(&env);

        let campaign_key = Self::get_campaign_key(campaign_id);
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&campaign_key)
            .unwrap_or_else(|| panic!("Campaign not found"));

        campaign.company_addr.require_auth();

        if !campaign.is_active {
            panic!("Campaign inactive");
        }

        // Check if conditions met for withdrawal
        let can_withdraw = campaign.raised_amount >= campaign.target_amount
            || env.ledger().timestamp() > campaign.deadline;

        if !can_withdraw {
            panic!("Cannot withdraw");
        }

        let withdraw_amount = campaign.raised_amount;

        // Transfer XLM from contract to company
        let xlm_token_addr: Address = env.storage().instance().get(&KEY_XLM_TOKEN).unwrap();
        let xlm_token = token::Client::new(&env, &xlm_token_addr);
        let contract_addr = env.current_contract_address();

        xlm_token.transfer(&contract_addr, &campaign.company_addr, &withdraw_amount);

        // Mark campaign as closed
        campaign.is_active = false;
        env.storage().persistent().set(&campaign_key, &campaign);

        // Update stats
        let mut stats: CampaignStats = env.storage().instance().get(&KEY_STATS).unwrap();
        stats.active_campaigns = stats.active_campaigns.saturating_sub(1);
        env.storage().instance().set(&KEY_STATS, &stats);

        // Emit event
        WithdrawnEvent {
            campaign_id,
            company: campaign.company_addr.clone(),
            amount: withdraw_amount,
        }
        .publish(&env);
    }

    /// Emergency close campaign (admin or company)
    pub fn close_campaign(env: Env, campaign_id: u64, caller: Address) {
        Self::require_initialized(&env);
        caller.require_auth();

        let campaign_key = Self::get_campaign_key(campaign_id);
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&campaign_key)
            .unwrap_or_else(|| panic!("Campaign not found"));

        // Only admin or company can close
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).unwrap();
        if caller != admin && caller != campaign.company_addr {
            panic!("Unauthorized");
        }

        if campaign.is_active {
            campaign.is_active = false;
            env.storage().persistent().set(&campaign_key, &campaign);

            // Update stats
            let mut stats: CampaignStats = env.storage().instance().get(&KEY_STATS).unwrap();
            stats.active_campaigns = stats.active_campaigns.saturating_sub(1);
            env.storage().instance().set(&KEY_STATS, &stats);

            CampaignClosedEvent { campaign_id }.publish(&env);
        }
    }

    // =============================
    // 🔍 QUERY FUNCTIONS
    // =============================
    
    /// Get campaign details
    pub fn get_campaign(env: Env, campaign_id: u64) -> Campaign {
        let campaign_key = Self::get_campaign_key(campaign_id);
        env.storage()
            .persistent()
            .get(&campaign_key)
            .unwrap_or_else(|| panic!("Campaign not found"))
    }

    /// Get investment details for an investor
    pub fn get_investment(env: Env, campaign_id: u64, investor: Address) -> Investment {
        let investment_key = Self::get_investment_key(campaign_id, &investor);
        env.storage()
            .persistent()
            .get(&investment_key)
            .unwrap_or(Investment {
                investor: investor.clone(),
                amount_invested: 0,
                tokens_received: 0,
                timestamp: 0,
            })
    }

    /// Get all investors for a campaign
    pub fn get_investors(env: Env, campaign_id: u64) -> Vec<Address> {
        let investors_key = Self::get_investors_key(campaign_id);
        env.storage()
            .persistent()
            .get(&investors_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Get investor count
    pub fn get_investor_count(env: Env, campaign_id: u64) -> u32 {
        let investors = Self::get_investors(env.clone(), campaign_id);
        investors.len()
    }

    /// Get global stats
    pub fn get_stats(env: Env) -> CampaignStats {
        env.storage()
            .instance()
            .get(&KEY_STATS)
            .unwrap_or(CampaignStats {
                total_campaigns: 0,
                active_campaigns: 0,
                total_raised: 0,
            })
    }

    /// Check if investor has invested in campaign
    pub fn has_invested(env: Env, campaign_id: u64, investor: Address) -> bool {
        let investment_key = Self::get_investment_key(campaign_id, &investor);
        env.storage().persistent().has(&investment_key)
    }

    /// Get campaign progress (percentage)
    pub fn get_campaign_progress(env: Env, campaign_id: u64) -> i128 {
        let campaign = Self::get_campaign(env, campaign_id);
        if campaign.target_amount == 0 {
            return 0;
        }
        (campaign.raised_amount * 100) / campaign.target_amount
    }

    // =============================
    // 🔧 HELPER FUNCTIONS
    // =============================
    
    fn require_initialized(env: &Env) {
        if !env.storage().instance().has(&KEY_INITIALIZED) {
            panic!("Not initialized");
        }
    }

    fn get_campaign_key(campaign_id: u64) -> (&'static str, u64) {
        ("CAMP", campaign_id)
    }

    fn get_investment_key(campaign_id: u64, investor: &Address) -> ((&'static str, u64), Address) {
        (("INV", campaign_id), investor.clone())
    }

    fn get_investors_key(campaign_id: u64) -> (&'static str, u64) {
        ("INVS", campaign_id)
    }

    fn vec_contains(vec: &Vec<Address>, addr: &Address) -> bool {
        for i in 0..vec.len() {
            if let Some(item) = vec.get(i) {
                if item == *addr {
                    return true;
                }
            }
        }
        false
    }
}

#[cfg(test)]
mod test;