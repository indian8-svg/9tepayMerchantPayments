import pool from './db.js';

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users / Merchants
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(255),
        role VARCHAR(50) DEFAULT 'merchant',
        business_name VARCHAR(255),
        vpa VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending_kyc',
        is_email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Merchant Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchant_profiles (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        vpa VARCHAR(255),
        phone VARCHAR(255),
        email VARCHAR(255),
        api_key VARCHAR(255) UNIQUE,
        api_secret VARCHAR(255),
        webhook_url TEXT,
        webhook_secret VARCHAR(255),
        auto_approve_utr BOOLEAN DEFAULT false,
        settlement_rate DECIMAL(5,2) DEFAULT 0.0,
        routing_strategy VARCHAR(50) DEFAULT 'smart_round_robin',
        require_strict_utr_format BOOLEAN DEFAULT true,
        prevent_duplicate_utr BOOLEAN DEFAULT true
      );
    `);

    // Bank Accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        bank_name VARCHAR(255),
        account_holder VARCHAR(255),
        account_number VARCHAR(255),
        ifsc VARCHAR(50),
        vpa VARCHAR(255),
        qr_title VARCHAR(255),
        qr_type VARCHAR(50),
        qr_color VARCHAR(50),
        custom_qr_image TEXT,
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        daily_limit DECIMAL(15,2) DEFAULT 0,
        daily_volume DECIMAL(15,2) DEFAULT 0,
        total_settled DECIMAL(15,2) DEFAULT 0,
        routing_weight INT DEFAULT 1,
        bank_logo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(255),
        note TEXT,
        merchant_vpa VARCHAR(255),
        merchant_name VARCHAR(255),
        bank_account_id VARCHAR(255),
        bank_name VARCHAR(255),
        bank_account_name VARCHAR(255),
        custom_qr_image TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        utr_number VARCHAR(255),
        review_required BOOLEAN DEFAULT false,
        provider VARCHAR(100),
        payment_app VARCHAR(100),
        upi_string TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        paid_at TIMESTAMP,
        callback_url TEXT,
        webhook_delivered BOOLEAN DEFAULT false,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Auth & Security
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_passwords (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_token VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        type VARCHAR(100),
        severity VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(100),
        details TEXT,
        order_number VARCHAR(255),
        utr VARCHAR(255),
        status VARCHAR(50)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        order_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50),
        url TEXT,
        status_code INT,
        payload JSONB,
        response TEXT
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_inquiries (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(255),
        business_name VARCHAR(255),
        volume VARCHAR(255),
        subject VARCHAR(255),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(255) NOT NULL,
        expires_at BIGINT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        billing_address TEXT,
        items JSONB NOT NULL,
        subtotal DECIMAL(12,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        due_date TIMESTAMP,
        order_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at BIGINT NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS totp_secrets (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        secret VARCHAR(255) NOT NULL
      );
    `);

    // Magic Checkout - Remembered customer profiles across all 9tepay merchants
    await client.query(`
      CREATE TABLE IF NOT EXISTS checkout_customers (
        id VARCHAR(255) PRIMARY KEY,
        phone VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        total_payments INT DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        last_paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        amount NUMERIC NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        interval VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'yearly'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(255) REFERENCES subscription_plans(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        next_billing_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log("PostgreSQL Database Initialization Complete.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Failed to initialize database", err);
  } finally {
    client.release();
  }
}

initDB().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
