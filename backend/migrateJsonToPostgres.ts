import fs from "fs";
import path from "path";
import pool from "./db.js";

const dataDirectory = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data")
);

const authDataPath = path.join(dataDirectory, "auth-store.json");

interface AuthStore {
  merchants: any[];
  passwordHashes: Record<string, string>;
  verifiedEmailUserIds: string[];
  profiles: Record<string, any>;
  bankAccounts: Record<string, any[]>;
  orders: any[];
  contactInquiries: any[];
}

async function migrate() {
  console.log("Starting PostgreSQL migration...");

  if (!fs.existsSync(authDataPath)) {
    console.log("auth-store.json does not exist.");
    console.log("Nothing to migrate.");
    await pool.end();
    return;
  }

  const rawData = fs.readFileSync(authDataPath, "utf-8");
  const data: AuthStore = JSON.parse(rawData);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Connected to PostgreSQL.");

    // --------------------------------------------------
    // 1. MIGRATE MERCHANTS → USERS
    // --------------------------------------------------

    console.log("Migrating users...");

    for (const merchant of data.merchants || []) {
      const passwordHash =
        data.passwordHashes?.[merchant.id] || null;

      const emailVerified =
        data.verifiedEmailUserIds?.includes(merchant.id) || false;

      await client.query(
        `
        INSERT INTO users (
          id,
          name,
          email,
          phone,
          role,
          business_name,
          vpa,
          status,
          password_hash,
          email_verified,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, 'merchant',
          $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          business_name = EXCLUDED.business_name,
          vpa = EXCLUDED.vpa,
          status = EXCLUDED.status,
          password_hash = EXCLUDED.password_hash,
          email_verified = EXCLUDED.email_verified
        `,
        [
          merchant.id,
          merchant.ownerName,
          merchant.email,
          merchant.phone || null,
          merchant.businessName,
          merchant.vpa,
          merchant.status,
          passwordHash,
          emailVerified,
          merchant.createdAt,
        ]
      );
    }

    console.log(
      `Users migrated: ${(data.merchants || []).length}`
    );

    // --------------------------------------------------
    // 2. MIGRATE ADMIN USER
    // --------------------------------------------------

    console.log("Migrating administrator...");

    const adminPasswordHash =
      data.passwordHashes?.["usr_admin_001"] || null;

    const adminEmailVerified =
      data.verifiedEmailUserIds?.includes("usr_admin_001") || false;

    await client.query(
      `
      INSERT INTO users (
        id,
        name,
        email,
        phone,
        role,
        business_name,
        vpa,
        status,
        password_hash,
        email_verified,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
      )
      ON CONFLICT (id)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        email_verified = EXCLUDED.email_verified
      `,
      [
        "usr_admin_001",
        "Master Administrator",
        "admin@9tepay.com",
        "+91 90000 00001",
        "admin",
        "9tepay Master Administration",
        "admin.gateway@icici",
        "active",
        adminPasswordHash,
        adminEmailVerified,
        "2026-01-01T00:00:00.000Z",
      ]
    );

    // --------------------------------------------------
    // 3. MIGRATE MERCHANTS TABLE
    // --------------------------------------------------

    console.log("Migrating merchants...");

    for (const merchant of data.merchants || []) {
      await client.query(
        `
        INSERT INTO merchants (
          id,
          business_name,
          owner_name,
          email,
          phone,
          vpa,
          bank_account,
          ifsc,
          commission_rate,
          status,
          total_volume,
          total_orders,
          created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        )
        ON CONFLICT (id)
        DO UPDATE SET
          business_name = EXCLUDED.business_name,
          owner_name = EXCLUDED.owner_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          vpa = EXCLUDED.vpa,
          bank_account = EXCLUDED.bank_account,
          ifsc = EXCLUDED.ifsc,
          commission_rate = EXCLUDED.commission_rate,
          status = EXCLUDED.status,
          total_volume = EXCLUDED.total_volume,
          total_orders = EXCLUDED.total_orders
        `,
        [
          merchant.id,
          merchant.businessName,
          merchant.ownerName,
          merchant.email,
          merchant.phone || null,
          merchant.vpa || null,
          merchant.bankAccount || null,
          merchant.ifsc || null,
          merchant.commissionRate ?? 0,
          merchant.status || "pending_kyc",
          merchant.totalVolume ?? 0,
          merchant.totalOrders ?? 0,
          merchant.createdAt,
        ]
      );
    }

    console.log(
      `Merchants migrated: ${(data.merchants || []).length}`
    );

    // --------------------------------------------------
    // 4. MIGRATE USER PROFILES
    // --------------------------------------------------

    console.log("Migrating user profiles...");

    for (const [userId, profile] of Object.entries(
      data.profiles || {}
    )) {
      await client.query(
        `
        INSERT INTO user_profiles (
          user_id,
          business_name,
          vpa,
          email,
          phone,
          api_key,
          api_secret,
          webhook_url,
          webhook_secret,
          auto_approve_utr,
          settlement_rate,
          routing_strategy,
          require_strict_utr_format,
          prevent_duplicate_utr
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          business_name = EXCLUDED.business_name,
          vpa = EXCLUDED.vpa,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          api_key = EXCLUDED.api_key,
          api_secret = EXCLUDED.api_secret,
          webhook_url = EXCLUDED.webhook_url,
          webhook_secret = EXCLUDED.webhook_secret,
          auto_approve_utr = EXCLUDED.auto_approve_utr,
          settlement_rate = EXCLUDED.settlement_rate,
          routing_strategy = EXCLUDED.routing_strategy,
          require_strict_utr_format = EXCLUDED.require_strict_utr_format,
          prevent_duplicate_utr = EXCLUDED.prevent_duplicate_utr
        `,
        [
          userId,
          profile.businessName,
          profile.vpa,
          profile.email,
          profile.phone || null,
          profile.apiKey,
          profile.apiSecret,
          profile.webhookUrl || null,
          profile.webhookSecret || null,
          profile.autoApproveUtr ?? false,
          profile.settlementRate ?? 0,
          profile.routingStrategy || "smart_round_robin",
          profile.requireStrictUtrFormat ?? true,
          profile.preventDuplicateUtr ?? true,
        ]
      );
    }

    console.log(
      `Profiles migrated: ${Object.keys(data.profiles || {}).length}`
    );

    // --------------------------------------------------
    // 5. MIGRATE BANK ACCOUNTS
    // --------------------------------------------------

    console.log("Migrating bank accounts...");

    let bankCount = 0;

    for (const [userId, accounts] of Object.entries(
      data.bankAccounts || {}
    )) {
      for (const account of accounts) {
        await client.query(
          `
          INSERT INTO bank_accounts (
            id,
            user_id,
            bank_name,
            account_holder,
            account_number,
            ifsc,
            vpa,
            qr_title,
            qr_type,
            qr_color,
            custom_qr_image,
            is_primary,
            is_active,
            daily_limit,
            daily_volume,
            total_settled,
            routing_weight,
            bank_logo,
            created_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19
          )
          ON CONFLICT (id)
          DO UPDATE SET
            bank_name = EXCLUDED.bank_name,
            account_holder = EXCLUDED.account_holder,
            account_number = EXCLUDED.account_number,
            ifsc = EXCLUDED.ifsc,
            vpa = EXCLUDED.vpa,
            qr_title = EXCLUDED.qr_title,
            qr_type = EXCLUDED.qr_type,
            qr_color = EXCLUDED.qr_color,
            custom_qr_image = EXCLUDED.custom_qr_image,
            is_primary = EXCLUDED.is_primary,
            is_active = EXCLUDED.is_active,
            daily_limit = EXCLUDED.daily_limit,
            daily_volume = EXCLUDED.daily_volume,
            total_settled = EXCLUDED.total_settled,
            routing_weight = EXCLUDED.routing_weight,
            bank_logo = EXCLUDED.bank_logo
          `,
          [
            account.id,
            userId,
            account.bankName || null,
            account.accountHolder || null,
            account.accountNumber || null,
            account.ifsc || null,
            account.vpa || null,
            account.qrTitle || null,
            account.qrType || "dynamic_intent",
            account.qrColor || null,
            account.customQrImage || null,
            account.isPrimary ?? false,
            account.isActive ?? true,
            account.dailyLimit ?? 0,
            account.dailyVolume ?? 0,
            account.totalSettled ?? 0,
            account.routingWeight ?? 1,
            account.bankLogo || null,
            account.createdAt || new Date().toISOString(),
          ]
        );

        bankCount++;
      }
    }

    console.log(`Bank accounts migrated: ${bankCount}`);

    // --------------------------------------------------
    // 6. MIGRATE ORDERS
    // --------------------------------------------------

    console.log("Migrating orders...");

    let orderCount = 0;

    for (const order of data.orders || []) {
      await client.query(
        `
        INSERT INTO orders (
          id,
          order_number,
          amount,
          currency,
          customer_name,
          customer_email,
          customer_phone,
          note,
          merchant_vpa,
          merchant_name,
          bank_account_id,
          custom_qr_image,
          status,
          utr_number,
          review_required,
          provider,
          payment_app,
          upi_string,
          created_at,
          expires_at,
          paid_at,
          callback_url,
          webhook_delivered,
          user_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24
        )
        ON CONFLICT (id)
        DO UPDATE SET
          status = EXCLUDED.status,
          utr_number = EXCLUDED.utr_number,
          review_required = EXCLUDED.review_required,
          provider = EXCLUDED.provider,
          payment_app = EXCLUDED.payment_app,
          paid_at = EXCLUDED.paid_at,
          webhook_delivered = EXCLUDED.webhook_delivered
        `,
        [
          order.id,
          order.orderNumber,
          order.amount,
          order.currency || "INR",
          order.customerName || null,
          order.customerEmail || null,
          order.customerPhone || null,
          order.note || null,
          order.merchantVpa || null,
          order.merchantName || null,
          order.bankAccountId || null,
          order.customQrImage || null,
          order.status || "PENDING",
          order.utrNumber || null,
          order.reviewRequired ?? false,
          order.provider || null,
          order.paymentApp || null,
          order.upiString || null,
          order.createdAt,
          order.expiresAt,
          order.paidAt || null,
          order.callbackUrl || null,
          order.webhookDelivered ?? false,
          order.userId || null,
        ]
      );

      orderCount++;
    }

    console.log(`Orders migrated: ${orderCount}`);

    await client.query("COMMIT");

    console.log("");
    console.log("=================================");
    console.log("Migration completed successfully!");
    console.log("=================================");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error("Migration failed!");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();