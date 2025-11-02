#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contractevent, token, Address, Env, Symbol, String};

#[contract]
pub struct EquityToken;

// -----------------------------
// 🧾 Company Info
// -----------------------------
#[derive(Clone)]
#[contracttype]
pub struct CompanyInfo {
    pub name: String,
    pub symbol: String,
    pub total_supply: i128,
    pub owner: Address,
    pub equity_percent: i128,
    pub description: String,
    pub token_price: i128,
    pub target_amount: i128,
}

// -----------------------------
// 📢 Event Definitions
// -----------------------------
#[contractevent]
pub struct InitCompanyEvent {
    pub name: String,
    pub symbol: String,
    pub total_supply: i128,
    pub owner: Address,
    pub equity_percent: i128,
}

#[contractevent]
pub struct MintEvent {
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct TransferEvent {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct BurnEvent {
    pub from: Address,
    pub amount: i128,
}

// -----------------------------
// ⚙️ Contract Implementation
// -----------------------------
#[contractimpl]
impl EquityToken {
    // --- Initialize company token ---
    pub fn init_company(
        env: Env,
        name: String,
        symbol: String,
        total_supply: i128,
        owner_addr: Address,
        equity_percent: i128,
        description: String,
        token_price: i128,
        target_amount: i128,
    ) {
        if env.storage().instance().has(&Symbol::new(&env, "initialized")) {
            panic!("Already initialized");
        }

        // Clone for event
        let name_clone = name.clone();
        let symbol_clone = symbol.clone();

        env.storage().instance().set(
            &Symbol::new(&env, "company_info"),
            &CompanyInfo {
                name,
                symbol,
                total_supply,
                owner: owner_addr.clone(),
                equity_percent,
                description,
                token_price,
                target_amount,
            },
        );

        env.storage().persistent().set(&owner_addr, &total_supply);
        env.storage().instance().set(&Symbol::new(&env, "initialized"), &true);

        // ✅ Emit event using macro’s auto `.publish()`
        InitCompanyEvent {
            name: name_clone,
            symbol: symbol_clone,
            total_supply,
            owner: owner_addr,
            equity_percent,
        }
        .publish(&env);
    }

    // --- Mint tokens (buyer purchases from owner) ---
    // Buyer signs the transaction and receives tokens from owner's balance
    // XLM token address must be provided for payment
    pub fn mint(env: Env, to: Address, amount: i128, xlm_token: Address) {
        // Buyer must authorize this transaction
        to.require_auth();

        let company: CompanyInfo = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "company_info"))
            .unwrap();

        let owner = company.owner.clone();

        // Get balances
        let mut owner_balance: i128 = env.storage().persistent().get(&owner).unwrap_or(0);
        let mut buyer_balance: i128 = env.storage().persistent().get(&to).unwrap_or(0);

        // Check if owner has enough tokens
        if owner_balance < amount {
            panic!("Not enough tokens available for purchase");
        }

        // Calculate payment amount (token_price is in stroops)
        let payment_amount = amount * company.token_price;

        // Transfer XLM from buyer to company owner
        let xlm_client = token::Client::new(&env, &xlm_token);
        xlm_client.transfer(&to, &owner, &payment_amount);

        // Transfer equity tokens from owner to buyer (no supply inflation)
        owner_balance -= amount;
        buyer_balance += amount;

        // Save updated balances
        env.storage().persistent().set(&owner, &owner_balance);
        env.storage().persistent().set(&to, &buyer_balance);

        // ✅ Emit typed event
        MintEvent { to, amount }.publish(&env);
    }

    // --- Transfer tokens (free - no payment) ---
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let mut from_balance: i128 = env.storage().persistent().get(&from).unwrap_or(0);
        let mut to_balance: i128 = env.storage().persistent().get(&to).unwrap_or(0);

        if from_balance < amount {
            panic!("Insufficient balance");
        }

        from_balance -= amount;
        to_balance += amount;

        env.storage().persistent().set(&from, &from_balance);
        env.storage().persistent().set(&to, &to_balance);

        // ✅ Typed event
        TransferEvent { from, to, amount }.publish(&env);
    }

    // --- Transfer with payment (for resale market) ---
    // Buyer initiates, pays seller, and receives tokens
    pub fn transfer_with_payment(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        price_per_token: i128,
        xlm_token: Address,
    ) {
        // Buyer must authorize this transaction
        to.require_auth();

        let mut from_balance: i128 = env.storage().persistent().get(&from).unwrap_or(0);
        let mut to_balance: i128 = env.storage().persistent().get(&to).unwrap_or(0);

        if from_balance < amount {
            panic!("Seller has insufficient balance");
        }

        // Calculate payment amount
        let payment_amount = amount * price_per_token;

        // Transfer XLM from buyer to seller
        let xlm_client = token::Client::new(&env, &xlm_token);
        xlm_client.transfer(&to, &from, &payment_amount);

        // Transfer tokens from seller to buyer
        from_balance -= amount;
        to_balance += amount;

        env.storage().persistent().set(&from, &from_balance);
        env.storage().persistent().set(&to, &to_balance);

        // ✅ Emit event
        TransferEvent { from, to, amount }.publish(&env);
    }

    // --- Check balance ---
    pub fn balance_of(env: Env, addr: Address) -> i128 {
        env.storage().persistent().get(&addr).unwrap_or(0)
    }

    // --- Burn tokens ---
    pub fn burn(env: Env, from: Address, amount: i128) {
        let mut company: CompanyInfo = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "company_info"))
            .unwrap();

        if from == company.owner {
            company.owner.require_auth();
        } else {
            from.require_auth();
        }

        let mut balance: i128 = env.storage().persistent().get(&from).unwrap_or(0);
        if balance < amount {
            panic!("Insufficient balance to burn");
        }

        balance -= amount;
        company.total_supply -= amount;

        env.storage().persistent().set(&from, &balance);
        env.storage().instance().set(&Symbol::new(&env, "company_info"), &company);

        // ✅ Typed event
        BurnEvent { from, amount }.publish(&env);
    }

    // --- Getter for tests & read-only access ---
    pub fn get_company_info(env: Env) -> CompanyInfo {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "company_info"))
            .unwrap()
    }
}

#[cfg(test)]
mod test;
