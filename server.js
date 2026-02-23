// ==========================================
// 🏦 PROFESSIONAL BANKING PORTAL
// VERSION 3.0 - P2P + SPECIAL TAGS
// ==========================================

const express = require("express");
const session = require("express-session");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const https = require("https");

const app = express();
const PORT = 3000;

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// CONFIGURATION
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "banking-secret-key-change-this";
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// Currency configurations
const CURRENCIES = {
  USD: {
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    icon: "💵",
    locale: "en-US",
    paymentMethods: ["chime", "applepay", "visaprepaid", "cashapp"],
    paymentMethodNames: {
      chime: "Chime",
      applepay: "Apple Pay",
      visaprepaid: "Visa Prepaid Card",
      cashapp: "Cash App",
    },
  },
  EUR: {
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    icon: "💶",
    locale: "de-DE",
    paymentMethods: ["sepa"],
    paymentMethodNames: {
      sepa: "Instant SEPA Credit Transfer",
    },
  },
  GBP: {
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    icon: "💷",
    locale: "en-GB",
    paymentMethods: ["banktransfer"],
    paymentMethodNames: {
      banktransfer: "Bank Transfer",
    },
  },
};

// Payment method logo URLs
const PAYMENT_LOGOS = {
  chime: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Chime_company_logo.svg",
  applepay: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg",
  visaprepaid: "https://www.svgrepo.com/show/328144/visa.svg",
  sepa: "https://www.ecb.europa.eu/shared/img/logo/logo_only.svg",
  banktransfer: "https://www.svgrepo.com/show/311631/bank-landmark.svg",
  cashapp: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Square_Cash_app_logo.svg",
};

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ==========================================
// DATABASE CONNECTION
// ==========================================

let db;

async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db("BankingAdmin");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatCurrency(amount, currency = "EUR") {
  const config = CURRENCIES[currency] || CURRENCIES.EUR;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency,
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskAccountNumber(number, lastDigits = 4) {
  if (!number) return "****";
  const str = number.toString().replace(/[\s-]/g, "");
  if (str.length <= lastDigits) return str;
  return "****" + str.slice(-lastDigits);
}

function generateRequestId(prefix) {
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

function generateAccountNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${timestamp}${random}`;
}

function generateTag(name) {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `@${cleanName}${random}`;
}

function formatTag(tag) {
  if (!tag) return "";
  return tag.startsWith("@") ? tag.toLowerCase() : `@${tag.toLowerCase()}`;
}

function generateIBAN(currency) {
  if (currency === "EUR") {
    const countryCode = "DE";
    const checkDigits = Math.floor(Math.random() * 90 + 10).toString();
    const bankCode = "37040044";
    const accountNum = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
    return `${countryCode}${checkDigits}${bankCode}${accountNum}`;
  } else if (currency === "GBP") {
    const sortCode = Math.floor(Math.random() * 900000 + 100000).toString();
    const accountNum = Math.floor(Math.random() * 90000000 + 10000000).toString();
    return {
      sortCode: `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`,
      accountNumber: accountNum,
    };
  } else {
    const routingNumber = "021000021";
    const accountNum = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
    return { routingNumber, accountNumber: accountNum };
  }
}

function getTransactionIcon(description) {
  const desc = (description || "").toLowerCase();
  if (desc.includes("fitness") || desc.includes("gym")) return { letter: "F", color: "red" };
  if (desc.includes("transfer") || desc.includes("wise")) return { letter: "T", color: "green" };
  if (desc.includes("amazon")) return { letter: "A", color: "orange" };
  if (desc.includes("spotify") || desc.includes("music")) return { letter: "S", color: "blue" };
  if (desc.includes("grocery") || desc.includes("supermarket") || desc.includes("rewe")) return { letter: "R", color: "purple" };
  if (desc.includes("atm") || desc.includes("cash")) return { letter: "💳", color: "gray" };
  if (desc.includes("deposit")) return { letter: "D", color: "green" };
  if (desc.includes("withdrawal")) return { letter: "W", color: "red" };
  if (desc.includes("incoming") || desc.includes("from") || desc.includes("payment from")) return { letter: "📥", color: "green" };
  if (desc.includes("payment to")) return { letter: "📤", color: "red" };
  return { letter: description ? description.charAt(0).toUpperCase() : "?", color: "gray" };
}

function groupTransactionsByDate(transactions) {
  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  transactions.forEach((tx) => {
    const txDate = new Date(tx.createdAt);
    txDate.setHours(0, 0, 0, 0);

    let dateKey;
    if (txDate.getTime() === today.getTime()) {
      dateKey = "Today";
    } else if (txDate.getTime() === yesterday.getTime()) {
      dateKey = "Yesterday";
    } else {
      dateKey = txDate.toLocaleDateString("en-GB", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
  });

  return groups;
}

// ==========================================
// DATABASE FUNCTIONS
// ==========================================

async function getCustomerByEmail(email) {
  return await db.collection("customers").findOne({ email: email.toLowerCase() });
}

async function getCustomerById(id) {
  try {
    return await db.collection("customers").findOne({ _id: new ObjectId(id) });
  } catch (e) {
    return null;
  }
}

async function getCustomerByTag(tag) {
  const formattedTag = formatTag(tag);
  return await db.collection("customers").findOne({ tag: formattedTag });
}

async function getSpecialTagByTag(tag) {
  const formattedTag = formatTag(tag);
  return await db.collection("specialTags").findOne({ tag: formattedTag });
}

async function lookupTag(tagOrEmail) {
  // First check if it's an email
  if (tagOrEmail.includes("@") && tagOrEmail.includes(".")) {
    const customer = await getCustomerByEmail(tagOrEmail);
    if (customer) {
      return {
        found: true,
        type: "customer",
        id: customer._id,
        tag: customer.tag,
        name: customer.name,
        currency: customer.currency,
      };
    }
  }

  // Check if it's a tag
  const formattedTag = formatTag(tagOrEmail);

  // Check customers first
  const customer = await getCustomerByTag(formattedTag);
  if (customer) {
    return {
      found: true,
      type: "customer",
      id: customer._id,
      tag: customer.tag,
      name: customer.name,
      currency: customer.currency,
    };
  }

  // Check special tags
  const specialTag = await getSpecialTagByTag(formattedTag);
  if (specialTag) {
    return {
      found: true,
      type: "special",
      id: specialTag._id,
      tag: specialTag.tag,
      name: specialTag.displayName,
      currency: null, // Special tags work with any currency
    };
  }

  return { found: false };
}

async function isTagAvailable(tag, excludeCustomerId = null) {
  const formattedTag = formatTag(tag);

  // Check customers
  const customerQuery = { tag: formattedTag };
  if (excludeCustomerId) {
    customerQuery._id = { $ne: new ObjectId(excludeCustomerId) };
  }
  const customerExists = await db.collection("customers").findOne(customerQuery);
  if (customerExists) return false;

  // Check special tags
  const specialExists = await db.collection("specialTags").findOne({ tag: formattedTag });
  if (specialExists) return false;

  return true;
}

async function createCustomer(data) {
  const currency = data.currency || "EUR";
  let accountDetails = {};

  if (currency === "EUR") {
    accountDetails = {
      iban: generateIBAN("EUR"),
      bic: "DEUTDEDBFRA",
    };
  } else if (currency === "GBP") {
    const details = generateIBAN("GBP");
    accountDetails = {
      sortCode: details.sortCode,
      bankAccountNumber: details.accountNumber,
    };
  } else {
    const details = generateIBAN("USD");
    accountDetails = {
      routingNumber: details.routingNumber,
      bankAccountNumber: details.accountNumber,
    };
  }

  const customer = {
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    address: data.address || "",
    accountNumber: generateAccountNumber(),
    tag: data.tag || generateTag(data.name),
    tagUpdatedAt: new Date(),
    currency: currency,
    ...accountDetails,
    balance: 0,
    pin: data.pin,
    pinUpdatedAt: new Date(),
    pinUpdatedBy: "customer",
    status: "active",
    withdrawalAccounts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("customers").insertOne(customer);
  customer._id = result.insertedId;

  await createNotification(result.insertedId, "welcome", {
    title: "Welcome to Our Bank!",
    message: "Your account has been created successfully.",
    type: "info",
  });

  return customer;
}

async function updateCustomerTag(customerId, newTag) {
  const formattedTag = formatTag(newTag);
  await db.collection("customers").updateOne(
    { _id: new ObjectId(customerId) },
    {
      $set: {
        tag: formattedTag,
        tagUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

async function getCustomerTransactions(customerId, limit = 50) {
  return await db
    .collection("transactions")
    .find({ customerId: new ObjectId(customerId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

async function getMonthlySpending(customerId, months = 7) {
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const spending = await db
      .collection("transactions")
      .aggregate([
        {
          $match: {
            customerId: new ObjectId(customerId),
            type: "debit",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ])
      .toArray();

    result.push({
      month: startOfMonth.toLocaleDateString("en-US", { month: "short" }),
      amount: spending[0]?.total || 0,
    });
  }

  return result;
}

async function getUnreadNotifications(customerId) {
  return await db
    .collection("notifications")
    .find({ customerId: new ObjectId(customerId), read: false })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
}

async function getUnreadNotificationCount(customerId) {
  return await db.collection("notifications").countDocuments({
    customerId: new ObjectId(customerId),
    read: false,
  });
}

async function markNotificationsAsRead(customerId) {
  await db
    .collection("notifications")
    .updateMany({ customerId: new ObjectId(customerId), read: false }, { $set: { read: true } });
}

async function createNotification(customerId, type, data) {
  await db.collection("notifications").insertOne({
    customerId: new ObjectId(customerId),
    type: type,
    title: data.title,
    message: data.message,
    notificationType: data.type || "info",
    read: false,
    createdAt: new Date(),
  });
}

async function getActiveAlerts(customerId) {
  return await db
    .collection("customerAlerts")
    .find({ customerId: new ObjectId(customerId), dismissed: false })
    .sort({ createdAt: -1 })
    .toArray();
}

async function dismissAlert(alertId) {
  await db.collection("customerAlerts").updateOne({ _id: new ObjectId(alertId) }, { $set: { dismissed: true } });
}

async function getCustomerPendingPayments(customerId) {
  return await db
    .collection("pendingPayments")
    .find({
      customerId: new ObjectId(customerId),
      status: "pending",
    })
    .sort({ createdAt: -1 })
    .toArray();
}

async function createDepositRequest(data) {
  const request = {
    requestId: generateRequestId("DEP-"),
    customerId: new ObjectId(data.customerId),
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    currency: data.currency,
    amount: parseFloat(data.amount),
    paymentMethod: data.paymentMethod,
    status: "pending_details",
    bankDetails: null,
    receiptData: null,
    prepaidCardPin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("depositRequests").insertOne(request);
  request._id = result.insertedId;
  return request;
}

async function getDepositRequestByRequestId(requestId) {
  return await db.collection("depositRequests").findOne({ requestId: requestId });
}

async function updateDepositRequest(requestId, updates) {
  await db
    .collection("depositRequests")
    .updateOne({ requestId: requestId }, { $set: { ...updates, updatedAt: new Date() } });
}

async function createWithdrawalRequest(data) {
  const request = {
    requestId: generateRequestId("WD-"),
    customerId: new ObjectId(data.customerId),
    customerName: data.customerName,
    currency: data.currency,
    amount: parseFloat(data.amount),
    withdrawalAccount: data.withdrawalAccount,
    status: "pending",
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("withdrawalRequests").insertOne(request);
  request._id = result.insertedId;
  return request;
}

async function createP2PRequest(data) {
  const request = {
    requestId: generateRequestId("P2P-"),
    type: data.type, // "request" or "send"
    fromCustomerId: data.fromCustomerId ? new ObjectId(data.fromCustomerId) : null,
    fromTag: data.fromTag,
    fromName: data.fromName,
    toCustomerId: data.toCustomerId ? new ObjectId(data.toCustomerId) : null,
    toTag: data.toTag,
    toName: data.toName,
    amount: parseFloat(data.amount),
    currency: data.currency,
    isSpecialTag: data.isSpecialTag || false,
    specialTagId: data.specialTagId ? new ObjectId(data.specialTagId) : null,
    status: "pending",
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("p2pRequests").insertOne(request);
  request._id = result.insertedId;
  return request;
}

async function addWithdrawalAccount(customerId, accountData) {
  const accountId = new ObjectId();
  await db.collection("customers").updateOne(
    { _id: new ObjectId(customerId) },
    {
      $push: {
        withdrawalAccounts: {
          _id: accountId,
          ...accountData,
          createdAt: new Date(),
        },
      },
    }
  );
  return accountId;
}

async function deleteWithdrawalAccount(customerId, accountId) {
  await db
    .collection("customers")
    .updateOne({ _id: new ObjectId(customerId) }, { $pull: { withdrawalAccounts: { _id: new ObjectId(accountId) } } });
}

async function updateCustomerPin(customerId, newPin) {
  await db.collection("customers").updateOne(
    { _id: new ObjectId(customerId) },
    {
      $set: {
        pin: newPin,
        pinUpdatedAt: new Date(),
        pinUpdatedBy: "customer",
        updatedAt: new Date(),
      },
    }
  );
}

// ==========================================
// TELEGRAM FUNCTIONS
// ==========================================

function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: ADMIN_ID,
      text: message,
      parse_mode: "Markdown",
      disable_notification: false,
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data), // Use Buffer.byteLength for correct length
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(JSON.parse(body)));
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function sendTelegramMessageWithButtons(message, buttons) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: ADMIN_ID,
      text: message,
      parse_mode: "Markdown",
      disable_notification: false,
      reply_markup: {
        inline_keyboard: buttons
      }
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(JSON.parse(body)));
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function sendTelegramPhoto(photoBuffer, caption) {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);

    let body = "";
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${ADMIN_ID}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="parse_mode"\r\n\r\nMarkdown\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="disable_notification"\r\n\r\nfalse\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="photo"; filename="receipt.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;

    const bodyStart = Buffer.from(body, "utf8");
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
    const fullBody = Buffer.concat([bodyStart, photoBuffer, bodyEnd]);

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendPhoto`,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": fullBody.length,
      },
    };

    const req = https.request(options, (res) => {
      let respBody = "";
      res.on("data", (chunk) => (respBody += chunk));
      res.on("end", () => resolve(JSON.parse(respBody)));
    });

    req.on("error", reject);
    req.write(fullBody);
    req.end();
  });
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

function requireAuth(req, res, next) {
  if (req.session && req.session.customerId) {
    next();
  } else {
    res.redirect("/");
  }
}

// ==========================================
// COMPLETE CSS STYLES
// ==========================================

const FULL_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #f7f7f7;
  min-height: 100vh;
  color: #1a1a1a;
}

a {
  text-decoration: none;
  color: inherit;
}

.homepage-body {
  background: #ffffff;
}

.top-nav {
  background: white;
  border-bottom: 1px solid #eee;
  padding: 8px 0;
  display: none;
}

@media (min-width: 992px) {
  .top-nav {
    display: block;
  }
}

.top-nav .nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
}

.top-nav a {
  font-size: 13px;
  color: #7c7c7c;
  transition: color 0.3s;
}

.top-nav a:hover {
  color: #00796B;
}

.home-header {
  background: white;
  padding: 15px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.home-header .nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #00897B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
  fill: white;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #00796B;
}

.logo-text span {
  color: #00897B;
}

.desktop-nav {
  display: none;
  align-items: center;
  gap: 30px;
}

@media (min-width: 992px) {
  .desktop-nav {
    display: flex;
  }
}

.nav-item {
  position: relative;
}

.nav-link {
  font-size: 15px;
  font-weight: 600;
  color: #3b3b3b;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.nav-link:hover {
  color: #00796B;
}

.nav-link svg {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  min-width: 200px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 15px 0;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s;
}

.nav-item:hover .nav-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.nav-dropdown a {
  display: block;
  padding: 10px 20px;
  font-size: 14px;
  color: #3b3b3b;
  transition: all 0.3s;
}

.nav-dropdown a:hover {
  background: #f7f7f7;
  color: #00796B;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-member {
  background: #00897B;
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  display: none;
}

@media (min-width: 992px) {
  .btn-member {
    display: block;
  }
}

.btn-member:hover {
  background: #00695C;
  transform: translateY(-2px);
}

.btn-login-home {
  background: #00796B;
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-login-home:hover {
  background: #00695C;
}

.btn-login-home svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.login-container {
  position: relative;
}

.login-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: white;
  width: 320px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 25px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s;
  z-index: 1001;
}

.login-dropdown.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.login-dropdown::before {
  content: '';
  position: absolute;
  top: -8px;
  right: 30px;
  width: 16px;
  height: 16px;
  background: white;
  transform: rotate(45deg);
}

.login-dropdown h3 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #00796B;
  text-align: center;
}

.login-form-group {
  margin-bottom: 15px;
}

.login-form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #374151;
}

.login-form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.login-form-group input:focus {
  outline: none;
  border-color: #00796B;
}

.login-submit {
  width: 100%;
  padding: 12px;
  background: #00796B;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.login-submit:hover {
  background: #00695C;
}

.login-links {
  margin-top: 15px;
  font-size: 12px;
  color: #7c7c7c;
  text-align: center;
}

.login-links a {
  color: #00796B;
}

.login-signup {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  text-align: center;
}

.login-signup a {
  color: #00796B;
  font-weight: 600;
}

.login-error-msg {
  background: #FFEBEE;
  border: 1px solid #FFCDD2;
  color: #C62828;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 13px;
}

.mobile-menu-toggle {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  padding: 10px;
  background: none;
  border: none;
}

.mobile-menu-toggle span {
  width: 25px;
  height: 2px;
  background: #00796B;
  transition: all 0.3s;
}

@media (min-width: 992px) {
  .mobile-menu-toggle {
    display: none;
  }
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.mobile-menu-overlay.active {
  opacity: 1;
  visibility: visible;
}

.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: white;
  z-index: 999;
  transform: translateX(-100%);
  transition: transform 0.3s;
  overflow-y: auto;
}

.mobile-menu.active {
  transform: translateX(0);
}

.mobile-menu-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-menu-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #7c7c7c;
}

.mobile-menu-nav {
  padding: 20px;
}

.mobile-menu-nav a {
  display: block;
  padding: 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #3b3b3b;
  border-bottom: 1px solid #eee;
}

.mobile-menu-nav a:hover {
  color: #00796B;
}

.mobile-login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.mobile-login-overlay.active {
  opacity: 1;
  visibility: visible;
}

.mobile-login-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 30px 25px;
  z-index: 10000;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
}

.mobile-login-overlay.active .mobile-login-modal {
  transform: translateY(0);
}

.mobile-login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.mobile-login-header h3 {
  font-size: 20px;
  color: #00796B;
}

.mobile-login-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f7f7f7;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-login-close svg {
  width: 14px;
  height: 14px;
}

.hero {
  position: relative;
  height: 450px;
  overflow: hidden;
}

@media (min-width: 768px) {
  .hero {
    height: 500px;
  }
}

.hero-slide {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.8s ease-in-out;
}

.hero-slide.active {
  opacity: 1;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 121, 107, 0.85) 0%, rgba(0, 121, 107, 0.6) 100%);
}

.hero-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  width: 90%;
  max-width: 700px;
}

.hero-content h1 {
  font-size: 28px;
  font-weight: 300;
  line-height: 1.3;
  margin-bottom: 15px;
}

@media (min-width: 768px) {
  .hero-content h1 {
    font-size: 42px;
  }
}

.hero-content p {
  font-size: 15px;
  opacity: 0.9;
  margin-bottom: 25px;
}

@media (min-width: 768px) {
  .hero-content p {
    font-size: 17px;
  }
}

.hero-btn {
  display: inline-block;
  background: #00897B;
  color: white;
  padding: 15px 40px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s;
}

.hero-btn:hover {
  background: #00695C;
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.hero-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.hero-nav:hover {
  background: rgba(255, 255, 255, 0.3);
}

.hero-nav svg {
  width: 20px;
  height: 20px;
  fill: white;
}

.hero-nav.prev {
  left: 20px;
}

.hero-nav.next {
  right: 20px;
}

.hero-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.hero-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.hero-dot.active {
  background: white;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  background: #00796B;
}

@media (min-width: 768px) {
  .quick-links {
    grid-template-columns: repeat(4, 1fr);
  }
}

.quick-link {
  padding: 20px;
  text-align: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  cursor: pointer;
}

.quick-link:hover {
  background: #00695C;
}

.quick-link.active {
  background: #00897B;
}

@media (min-width: 768px) {
  .quick-link {
    padding: 25px;
    font-size: 15px;
    border-bottom: none;
  }
}

.home-section {
  padding: 60px 20px;
}

@media (min-width: 768px) {
  .home-section {
    padding: 80px 20px;
  }
}

.home-section-container {
  max-width: 1100px;
  margin: 0 auto;
}

.home-section-title {
  font-size: 28px;
  font-weight: 300;
  text-align: center;
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  .home-section-title {
    font-size: 38px;
  }
}

.home-section-title strong {
  font-weight: 700;
}

.home-section-desc {
  text-align: center;
  color: #7c7c7c;
  max-width: 800px;
  margin: 0 auto 40px;
  font-size: 15px;
  line-height: 1.8;
}

.rate-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

@media (min-width: 768px) {
  .rate-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}

.rate-card {
  text-align: center;
  padding: 25px 15px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
}

.rate-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.rate-label {
  font-size: 12px;
  color: #7c7c7c;
  margin-bottom: 5px;
}

.rate-value {
  font-size: 36px;
  font-weight: 300;
  color: #00796B;
}

@media (min-width: 768px) {
  .rate-value {
    font-size: 48px;
  }
}

.rate-value sup {
  font-size: 14px;
  color: #00897B;
}

.rate-title {
  font-size: 14px;
  font-weight: 700;
  margin-top: 10px;
  color: #3b3b3b;
}

.home-section-cta {
  display: block;
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
  padding: 15px 30px;
  background: #00897B;
  color: white;
  text-align: center;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s;
}

.home-section-cta:hover {
  background: #00695C;
  transform: translateY(-2px);
}

.banking-type-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  margin-top: 40px;
}

@media (min-width: 768px) {
  .banking-type-section {
    grid-template-columns: 1fr 1fr;
  }
}

.banking-type-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: all 0.3s;
}

.banking-type-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
}

.banking-type-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.banking-type-card h3 {
  font-size: 22px;
  font-weight: 600;
  color: #00796B;
  margin-bottom: 16px;
}

.banking-type-card p {
  color: #666;
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 20px;
}

.banking-type-card .learn-more {
  color: #00796B;
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.banking-type-card .learn-more:hover {
  text-decoration: underline;
}

.community-section {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  padding: 80px 20px;
}

.community-content {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.community-content h2 {
  font-size: 28px;
  font-weight: 300;
  color: #1a1a1a;
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  .community-content h2 {
    font-size: 36px;
  }
}

.community-content h2 strong {
  font-weight: 700;
  color: #00796B;
}

.community-content > p {
  font-size: 16px;
  color: #555;
  line-height: 1.8;
  margin-bottom: 30px;
}

.community-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 40px;
}

@media (max-width: 768px) {
  .community-stats {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

.community-stat {
  text-align: center;
}

.community-stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #00796B;
}

@media (min-width: 768px) {
  .community-stat-value {
    font-size: 48px;
  }
}

.community-stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.trust-section {
  background: #fafafa;
  padding: 60px 20px;
}

.trust-container {
  max-width: 1100px;
  margin: 0 auto;
}

.trust-section h2 {
  font-size: 28px;
  font-weight: 300;
  text-align: center;
  margin-bottom: 40px;
}

.trust-section h2 strong {
  font-weight: 700;
}

.trust-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

@media (min-width: 768px) {
  .trust-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.trust-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.trust-card-icon {
  width: 60px;
  height: 60px;
  background: #E8F5E9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 28px;
}

.trust-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.trust-card p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.join-section {
  background: #00796B;
  padding: 60px 20px;
  text-align: center;
}

.join-section h2 {
  font-size: 28px;
  font-weight: 300;
  color: white;
  margin-bottom: 30px;
}

@media (min-width: 768px) {
  .join-section h2 {
    font-size: 42px;
  }
}

.join-section h2 strong {
  font-weight: 700;
}

.join-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

@media (min-width: 768px) {
  .join-buttons {
    flex-direction: row;
    justify-content: center;
  }
}

.join-btn {
  padding: 15px 40px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  min-width: 180px;
  transition: all 0.3s;
}

.join-btn.outline {
  background: transparent;
  border: 2px solid white;
  color: white;
}

.join-btn.outline:hover {
  background: white;
  color: #00796B;
}

.join-btn.filled {
  background: #00897B;
  border: 2px solid #00897B;
  color: white;
}

.join-btn.filled:hover {
  background: #00695C;
  border-color: #00695C;
}

.home-footer {
  background: #00796B;
  color: white;
  padding: 50px 20px 30px;
}

.footer-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

@media (min-width: 768px) {
  .footer-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

.footer-section h4 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
  color: #80CBC4;
}

.footer-section a,
.footer-section p {
  display: block;
  font-size: 14px;
  margin-bottom: 10px;
  opacity: 0.9;
  transition: opacity 0.3s;
  color: white;
}

.footer-section a:hover {
  opacity: 1;
}

.footer-badges {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: 20px;
}

.footer-badge {
  background: white;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 11px;
  color: #3b3b3b;
  text-align: center;
  font-weight: 600;
}

.footer-bottom {
  max-width: 1100px;
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.footer-bottom p {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 10px;
}

.footer-links-bottom {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.footer-links-bottom a {
  font-size: 12px;
  opacity: 0.8;
  color: white;
}

.footer-links-bottom a:hover {
  opacity: 1;
}

.register-container {
  min-height: 100vh;
  background: white;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
}

@media (min-width: 768px) {
  .register-container {
    background: linear-gradient(135deg, #00796B 0%, #00897B 100%);
    align-items: center;
    padding: 40px 20px;
  }
}

.register-card {
  background: white;
  padding: 30px 20px;
  border-radius: 0;
  box-shadow: none;
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .register-card {
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
    max-width: 450px;
    min-height: auto;
  }
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  font-size: 24px;
  color: #00796B;
  margin-bottom: 8px;
}

.register-header p {
  font-size: 14px;
  color: #666;
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 30px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e0e0e0;
  transition: all 0.3s;
}

.step-dot.active {
  background: #00796B;
  transform: scale(1.2);
}

.step-dot.completed {
  background: #4CAF50;
}

.step-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.register-step {
  display: none;
  flex: 1;
  flex-direction: column;
}

.register-step.active {
  display: flex;
  animation: fadeInStep 0.4s ease;
}

@keyframes fadeInStep {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-title .step-icon {
  font-size: 28px;
}

.step-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.step-input-group {
  position: relative;
  margin-bottom: 20px;
}

.step-input {
  width: 100%;
  padding: 16px 50px 16px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s;
  font-family: inherit;
}

.step-input:focus {
  outline: none;
  border-color: #00796B;
}

.step-input.valid {
  border-color: #4CAF50;
  background-color: #f8fff8;
}

.step-input.invalid {
  border-color: #f44336;
}

.step-input-check {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(-50%) scale(0);
  transition: all 0.3s;
}

.step-input-check.show {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.step-input-check svg {
  width: 16px;
  height: 16px;
  fill: white;
}

.step-error {
  color: #f44336;
  font-size: 13px;
  margin-top: 8px;
  display: none;
}

.step-error.show {
  display: block;
}

.step-btn {
  width: 100%;
  padding: 16px;
  background: #00796B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: auto;
}

.step-btn:hover:not(:disabled) {
  background: #00695C;
}

.step-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.step-back {
  display: block;
  text-align: center;
  margin-top: 16px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
}

.step-back:hover {
  color: #00796B;
}

.currency-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.currency-option {
  padding: 16px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.currency-option:hover {
  border-color: #00796B;
  background: #f8f8f8;
}

.currency-option.selected {
  border-color: #00796B;
  background: #E8F5E9;
}

.currency-option .flag {
  font-size: 28px;
}

.currency-option .details {
  flex: 1;
}

.currency-option .name {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 15px;
}

.currency-option .code {
  font-size: 13px;
  color: #666;
}

.currency-option .check {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.currency-option.selected .check {
  background: #00796B;
  border-color: #00796B;
}

.currency-option.selected .check::after {
  content: '✓';
  color: white;
  font-size: 14px;
}

.verification-screen {
  display: none;
  text-align: center;
  flex: 1;
  flex-direction: column;
  justify-content: center;
}

.verification-screen.active {
  display: flex;
  animation: fadeInStep 0.4s ease;
}

.verification-screen h2 {
  font-size: 20px;
  color: #00796B;
  margin-bottom: 10px;
}

.verification-screen > p {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}

.otp-container {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 30px 0;
}

.otp-box {
  width: 48px;
  height: 56px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  outline: none;
  transition: all 0.3s;
  color: #333;
  background: #fafafa;
}

.otp-box:focus {
  border-color: #00796B;
  box-shadow: 0 0 15px rgba(0, 121, 107, 0.3);
  background: white;
}

.otp-box.filled {
  border-color: #00796B;
  background: #E8F5E9;
}

.otp-box.auto-fill {
  animation: popIn 0.3s ease;
}

.verification-status {
  margin: 20px 0;
  padding: 15px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.verification-status.waiting {
  background: #FFF8E1;
  color: #F57C00;
  border: 1px solid #FFE082;
}

.verification-status.received {
  background: #E8F5E9;
  color: #388E3C;
  border: 1px solid #A5D6A7;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 3px solid #FFE082;
  border-top: 3px solid #F57C00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  vertical-align: middle;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes popIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.verify-btn {
  width: 100%;
  padding: 16px;
  background: #00796B;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.verify-btn:hover:not(:disabled) {
  background: #00695C;
}

.verify-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.success-screen-reg {
  display: none;
  text-align: center;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0;
}

.success-screen-reg.active {
  display: flex;
  animation: fadeInStep 0.4s ease;
}

.success-icon-large {
  font-size: 70px;
  margin-bottom: 20px;
  animation: bounceIn 0.6s ease;
}

@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-screen-reg h2 {
  color: #4CAF50;
  font-size: 24px;
  margin-bottom: 10px;
}

.success-screen-reg p {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.redirect-message {
  margin-top: 20px;
  font-size: 13px;
  color: #888;
}

.register-login-link {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  font-size: 14px;
  color: #666;
  border-top: 1px solid #eee;
}

.register-login-link a {
  color: #00796B;
  font-weight: 600;
}

.top-navbar {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  height: 64px;
}

.navbar-content {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-nav a {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.main-nav a:hover {
  background-color: #f5f5f5;
  color: #1a1a1a;
}

.main-nav a.active {
  background-color: #E8F5F3;
  color: #00796B;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  position: relative;
}

.nav-icon-btn:hover {
  background-color: #f5f5f5;
}

.nav-icon-btn svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  background-color: #E53935;
  border-radius: 50%;
  border: 2px solid white;
  font-size: 10px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px 6px 6px;
  border-radius: 100px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  color: inherit;
}

.user-menu:hover {
  background-color: #f5f5f5;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00796B 0%, #00897B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar span {
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.main-layout {
  padding-top: 64px;
  min-height: 100vh;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
}

.account-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.account-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  overflow: hidden;
}

.account-card-header {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-type-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00796B 0%, #00897B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-type-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.account-details h2 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.account-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-number span {
  font-size: 13px;
  color: #888;
  font-family: 'SF Mono', Monaco, monospace;
}

.balance-section {
  padding: 32px 24px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
}

.balance-label {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 48px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -1px;
}

@media (max-width: 768px) {
  .balance-amount {
    font-size: 36px;
  }
}

.quick-actions {
  padding: 24px;
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .quick-actions {
    gap: 16px;
    padding: 20px;
  }
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-decoration: none;
}

.quick-action-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

@media (max-width: 768px) {
  .quick-action-btn {
    width: 48px;
    height: 48px;
  }
}

.quick-action-btn.primary {
  background-color: #00796B;
}

.quick-action-btn.primary:hover {
  background-color: #00695C;
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 121, 107, 0.3);
}

.quick-action-btn.secondary {
  background-color: #D4C5A9;
}

.quick-action-btn.secondary:hover {
  background-color: #c4b599;
  transform: scale(1.05);
}

.quick-action-btn svg {
  width: 20px;
  height: 20px;
  color: white;
}

.quick-action-btn.secondary svg {
  color: #1a1a1a;
}

.quick-action-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.alert-section {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.alert-card {
  background: linear-gradient(135deg, #F5EFE6 0%, #E8E0D0 100%);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.alert-card:last-child {
  margin-bottom: 0;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.alert-icon {
  width: 44px;
  height: 44px;
  background-color: #FFD54F;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-icon svg {
  width: 22px;
  height: 22px;
  color: #F57C00;
}

.alert-icon.error {
  background-color: #FFCDD2;
}

.alert-icon.error svg {
  color: #E53935;
}

.alert-text h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.alert-text p {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.alert-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .alert-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .alert-actions {
    width: 100%;
  }
}

.alert-btn {
  padding: 10px 20px;
  border-radius: 24px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.alert-btn.primary {
  background-color: #00796B;
  color: white;
  border: none;
}

.alert-btn.primary:hover {
  background-color: #00695C;
}

.alert-btn.secondary {
  background: none;
  border: none;
  color: #666;
  padding: 10px 12px;
}

.alert-btn.secondary:hover {
  color: #1a1a1a;
}

.pending-payment-section {
  border-bottom: 1px solid #f0f0f0;
}

.pending-section-header {
  padding: 14px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #FB8C00;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFF8E1;
}

.pending-section-header svg {
  width: 16px;
  height: 16px;
  fill: #FB8C00;
}

.pending-payment-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: #FFFBF0;
  border-bottom: 1px solid #FFF3E0;
}

.pending-payment-item:last-child {
  border-bottom: none;
}

.pending-payment-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #FFF3E0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
  font-size: 20px;
}

.pending-payment-content {
  flex: 1;
  min-width: 0;
}

.pending-payment-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.pending-payment-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.pending-payment-amount {
  font-size: 14px;
  font-weight: 600;
  color: #FB8C00;
  margin-left: 16px;
}

.pending-payment-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pending-payment-status {
  font-size: 12px;
  color: #FB8C00;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pending-dot {
  width: 6px;
  height: 6px;
  background: #FB8C00;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.pending-payment-time {
  font-size: 12px;
  color: #888;
}

.transactions-section {
  padding: 0;
}

.transactions-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

@media (max-width: 768px) {
  .transactions-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

.transactions-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.transactions-filter {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .transactions-filter {
    width: 100%;
  }
}

.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: white;
  width: 200px;
}

@media (max-width: 768px) {
  .search-input {
    flex: 1;
  }
}

.search-input input {
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  width: 100%;
}

.search-input svg {
  width: 16px;
  height: 16px;
  color: #888;
  flex-shrink: 0;
}

.transaction-list {
  max-height: 400px;
  overflow-y: auto;
}

.transaction-date-group {
  padding: 12px 24px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.15s;
}

.transaction-item:hover {
  background-color: #fafafa;
}

.transaction-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
}

.transaction-icon.red { background-color: #FFEBEE; color: #E53935; }
.transaction-icon.blue { background-color: #E3F2FD; color: #1976D2; }
.transaction-icon.green { background-color: #E8F5E9; color: #43A047; }
.transaction-icon.orange { background-color: #FFF3E0; color: #FB8C00; }
.transaction-icon.purple { background-color: #F3E5F5; color: #8E24AA; }
.transaction-icon.gray { background-color: #F5F5F5; color: #666; }

.transaction-content {
  flex: 1;
  min-width: 0;
}

.transaction-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.transaction-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-amount {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 16px;
}

.transaction-amount.negative { color: #1a1a1a; }
.transaction-amount.positive { color: #00796B; }

.transaction-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.transaction-category {
  font-size: 12px;
  color: #888;
}

.transaction-time {
  font-size: 12px;
  color: #888;
}

.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.spending-widget {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  padding: 20px;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.widget-link {
  font-size: 13px;
  color: #00796B;
  text-decoration: none;
  font-weight: 500;
}

.widget-link:hover {
  text-decoration: underline;
}

.spending-chart {
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0 8px;
}

.chart-bar {
  flex: 1;
  background-color: #E8F5F3;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s;
  cursor: pointer;
  min-height: 8px;
}

.chart-bar:hover {
  background-color: #00796B;
}

.chart-bar.active {
  background-color: #00796B;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.chart-label {
  font-size: 11px;
  color: #888;
  text-align: center;
  flex: 1;
}

.spending-summary {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

.spending-item {
  text-align: center;
}

.spending-value {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.spending-label {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.no-transactions {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.no-transactions svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.transaction-list::-webkit-scrollbar {
  width: 6px;
}

.transaction-list::-webkit-scrollbar-track {
  background: transparent;
}

.transaction-list::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.form-container {
  max-width: 500px;
  margin: 0 auto;
}

.form-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  padding: 32px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-header p {
  color: #666;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #00796B;
}

.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #00796B;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background-color: #00796B;
  color: white;
}

.btn-primary:hover {
  background-color: #00695C;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e5e5;
}

.btn-block {
  width: 100%;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 15px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #00796B;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}

.back-link:hover {
  text-decoration: underline;
}

.back-link svg {
  width: 16px;
  height: 16px;
}

.waiting-screen {
  text-align: center;
  padding: 60px 20px;
}

.waiting-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #00796B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

.waiting-screen h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.waiting-screen p {
  color: #666;
  font-size: 14px;
}

.polling-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 13px;
  color: #666;
}

.polling-dot {
  width: 8px;
  height: 8px;
  background-color: #00796B;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.payment-details-box {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.payment-details-box h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.payment-row:last-child {
  border-bottom: none;
}

.payment-row-label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.payment-row-value {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 14px;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
}

.timer-box {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #00796B 0%, #00897B 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
}

.timer-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.timer-display {
  font-size: 36px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
}

.file-upload {
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.file-upload:hover {
  border-color: #00796B;
  background-color: #f8f9fa;
}

.file-upload-icon {
  font-size: 32px;
  color: #ccc;
  margin-bottom: 12px;
}

.file-upload p {
  font-size: 13px;
  color: #666;
}

.file-upload input {
  display: none;
}

.file-name {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #00796B;
}

.success-screen {
  text-align: center;
  padding: 60px 20px;
}

.success-icon {
  width: 80px;
  height: 80px;
  background-color: #E8F5E9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 40px;
  color: #43A047;
}

.success-screen h2 {
  font-size: 24px;
  margin-bottom: 12px;
}

.success-screen p {
  color: #666;
  font-size: 14px;
  margin-bottom: 24px;
}

.prepaid-instructions {
  background-color: #FFF8E1;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.prepaid-instructions h3 {
  font-size: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prepaid-instructions ol {
  margin-left: 20px;
}

.prepaid-instructions li {
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.account-item {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.account-item-info h4 {
  font-size: 15px;
  margin-bottom: 4px;
}

.account-item-info p {
  font-size: 13px;
  color: #666;
  font-family: 'SF Mono', Monaco, monospace;
}

.account-item-actions {
  display: flex;
  gap: 8px;
}

.account-item-actions button,
.account-item-actions a {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e5e5;
  background: white;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}

.account-item-actions button:hover,
.account-item-actions a:hover {
  background-color: #f5f5f5;
}

.account-item-actions .delete {
  color: #E53935;
  border-color: #FFCDD2;
}

.account-item-actions .delete:hover {
  background-color: #FFEBEE;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-title {
  font-size: 12px;
  text-transform: uppercase;
  color: #888;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item-label {
  font-size: 14px;
  font-weight: 500;
}

.settings-item-value {
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-item-value code {
  font-family: 'SF Mono', Monaco, monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.login-error {
  background: #FFEBEE;
  border: 1px solid #FFCDD2;
  color: #C62828;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
}

/* Receive Page Styles */
.receive-container {
  max-width: 500px;
  margin: 0 auto;
}

.receive-tag-section {
  background: linear-gradient(135deg, #00796B 0%, #00897B 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: white;
  margin-bottom: 24px;
}

.receive-tag-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.receive-tag-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 16px 24px;
  margin-bottom: 16px;
}

.receive-tag-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
}

.receive-tag-copy {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.receive-tag-copy:hover {
  background: rgba(255,255,255,0.3);
}

.receive-tag-copy svg {
  width: 16px;
  height: 16px;
}

.receive-tag-hint {
  font-size: 13px;
  opacity: 0.85;
}

.receive-form-section {
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  padding: 32px;
}

.receive-form-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.receive-form-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.tag-lookup-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 12px;
  margin-bottom: 20px;
}

.tag-lookup-result.found {
  background: #E8F5E9;
}

.tag-lookup-result.not-found {
  background: #FFEBEE;
}

.tag-lookup-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-lookup-icon svg {
  width: 18px;
  height: 18px;
  color: #666;
  opacity: 0.7;
}

.tag-lookup-result.found .tag-lookup-icon {
  background: rgba(0, 121, 107, 0.1);
}

.tag-lookup-result.found .tag-lookup-icon svg {
  color: #00796B;
  opacity: 1;
}

.tag-lookup-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.tag-lookup-result.not-found .tag-lookup-name {
  color: #C62828;
}

.receive-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.receive-buttons .btn {
  flex: 1;
}

.receive-buttons .btn-request {
  background: #00796B;
  color: white;
}

.receive-buttons .btn-request:hover {
  background: #00695C;
}

.receive-buttons .btn-send {
  background: #1976D2;
  color: white;
}

.receive-buttons .btn-send:hover {
  background: #1565C0;
}

@media (max-width: 768px) {
  .main-nav {
    display: none;
  }
  .navbar-content {
    padding: 0 16px;
  }
  .page-content {
    padding: 16px;
  }
  .account-card-header {
    flex-direction: column;
    gap: 16px;
  }
  .user-name {
    display: none;
  }
  .receive-buttons {
    flex-direction: column;
  }
}

.payment-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}

.payment-logo {
  max-width: 150px;
  max-height: 60px;
  object-fit: contain;
}

.payment-logo-large {
  max-width: 180px;
  max-height: 70px;
  object-fit: contain;
}

.payment-details-header {
  text-align: center;
  margin-bottom: 24px;
}

.payment-details-header h1 {
  margin-top: 16px;
}
`;

// ==========================================
// HTML TEMPLATES
// ==========================================

function getNavbar(activePage, customer, notificationCount = 0) {
  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return `
    <nav class="top-navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          <div class="main-nav">
            <a href="/dashboard" class="${activePage === "dashboard" ? "active" : ""}">Dashboard</a>
            <a href="/transactions" class="${activePage === "transactions" ? "active" : ""}">Transactions</a>
            <a href="/receive" class="${activePage === "receive" ? "active" : ""}">Receive</a>
            <a href="/settings" class="${activePage === "settings" ? "active" : ""}">Settings</a>
          </div>
        </div>
        <div class="navbar-right">
          <button class="nav-icon-btn" title="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </button>
          <a href="/notifications" class="nav-icon-btn" title="Notifications" style="position: relative;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            ${notificationCount > 0 ? `<span class="notification-dot">${notificationCount > 9 ? "9+" : notificationCount}</span>` : ""}
          </a>
          <a href="/settings" class="user-menu">
            <div class="user-avatar">
              <span>${initials}</span>
            </div>
            <span class="user-name">${customer.name}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  `;
}

function getPageWrapper(content, activePage, customer, notificationCount = 0) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Banking Portal</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>${FULL_CSS}</style>
    </head>
    <body>
      ${getNavbar(activePage, customer, notificationCount)}
      <main class="main-layout">
        <div class="page-content">
          ${content}
        </div>
      </main>
    </body>
    </html>
  `;
}
// ==========================================
// ROUTES - HOMEPAGE
// ==========================================

app.get("/", (req, res) => {
  if (req.session.customerId) {
    return res.redirect("/dashboard");
  }

  const error = req.query.error;
  let errorHtml = "";
  if (error === "invalid") {
    errorHtml = `<div class="login-error-msg">Invalid email or PIN. Please try again.</div>`;
  } else if (error === "frozen") {
    errorHtml = `<div class="login-error-msg">Your account has been frozen. Please contact support.</div>`;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Community Credit Union - Banking</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>${FULL_CSS}</style>
    </head>
    <body class="homepage-body">
      <nav class="top-nav">
        <div class="nav-container">
          <a href="#">Contact Us</a>
          <a href="#">Rates</a>
          <a href="#">Locations</a>
          <a href="#">Help</a>
        </div>
      </nav>

      <header class="home-header">
        <div class="nav-container">
          <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
            <span></span><span></span><span></span>
          </button>
          <a href="/" class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <span class="logo-text">Community<span>CU</span></span>
          </a>
          <nav class="desktop-nav">
            <div class="nav-item">
              <span class="nav-link">Personal<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></span>
              <div class="nav-dropdown">
                <a href="#">Checking Accounts</a><a href="#">Savings Accounts</a><a href="#">Credit Cards</a><a href="#">Mortgages</a><a href="#">Auto Loans</a>
              </div>
            </div>
            <div class="nav-item">
              <span class="nav-link">Business<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></span>
              <div class="nav-dropdown">
                <a href="#">Business Checking</a><a href="#">Business Savings</a><a href="#">Business Loans</a>
              </div>
            </div>
          </nav>
          <div class="header-actions">
            <a href="/register" class="btn-member">Become a Member</a>
            <div class="login-container">
              <button class="btn-login-home" onclick="toggleLogin()">
                <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                Login<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              <div class="login-dropdown" id="loginDropdown">
                <h3>Sign In</h3>
                ${errorHtml}
                <form method="POST" action="/login">
                  <div class="login-form-group"><label>Email Address</label><input type="email" name="email" placeholder="Enter your email" required></div>
                  <div class="login-form-group"><label>PIN</label><input type="password" name="pin" placeholder="Enter your PIN" required maxlength="6"></div>
                  <button type="submit" class="login-submit">Sign In</button>
                </form>
                <div class="login-links">Need help? <a href="#">Contact Support</a></div>
                <div class="login-signup"><a href="/register">Sign Up for Online Banking</a></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="toggleMobileMenu()"></div>
      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-menu-header">
          <span class="logo-text" style="font-size: 18px;">Community<span style="color: #00897B;">CU</span></span>
          <button class="mobile-menu-close" onclick="toggleMobileMenu()">&times;</button>
        </div>
        <nav class="mobile-menu-nav">
          <a href="#">Personal Banking</a><a href="#">Business Banking</a><a href="#">Checking Accounts</a>
          <a href="#">Savings Accounts</a><a href="#">Mortgages</a><a href="#">Auto Loans</a>
          <a href="#">Contact Us</a><a href="/register">Sign Up for Online Banking</a>
        </nav>
      </div>

      <div class="mobile-login-overlay" id="mobileLoginOverlay">
        <div class="mobile-login-modal">
          <div class="mobile-login-header">
            <h3>Sign In</h3>
            <button class="mobile-login-close" onclick="closeMobileLogin()">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          ${errorHtml}
          <form method="POST" action="/login">
            <div class="login-form-group"><label>Email Address</label><input type="email" name="email" placeholder="Enter your email" required></div>
            <div class="login-form-group"><label>PIN</label><input type="password" name="pin" placeholder="Enter your PIN" required maxlength="6"></div>
            <button type="submit" class="login-submit">Sign In</button>
          </form>
          <div class="login-links" style="margin-top: 20px;">Need help? <a href="#">Contact Support</a></div>
          <div class="login-signup"><a href="/register">Sign Up for Online Banking</a></div>
        </div>
      </div>

      <section class="hero">
        <div class="hero-slide active">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&h=800&fit=crop" alt="Banking" class="hero-image">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1>Banking Made Simple, Secure, and Personal</h1>
            <p>Join thousands of members who trust us with their financial future.</p>
            <a href="/register" class="hero-btn">Open an Account</a>
          </div>
        </div>
        <div class="hero-slide">
          <img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1600&h=800&fit=crop" alt="Savings" class="hero-image">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1>Grow Your Savings With Competitive Rates</h1>
            <p>Earn more on your money with our high-yield savings accounts and CDs.</p>
            <a href="/register" class="hero-btn">Start Saving</a>
          </div>
        </div>
        <div class="hero-slide">
          <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&h=800&fit=crop" alt="Investment" class="hero-image">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1>Your Financial Goals Are Our Priority</h1>
            <p>From everyday banking to major life moments, we're here to help you succeed.</p>
            <a href="/register" class="hero-btn">Get Started</a>
          </div>
        </div>
        <button class="hero-nav prev" onclick="prevSlide()"><svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
        <button class="hero-nav next" onclick="nextSlide()"><svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>
        <div class="hero-dots">
          <button class="hero-dot active" onclick="goToSlide(0)"></button>
          <button class="hero-dot" onclick="goToSlide(1)"></button>
          <button class="hero-dot" onclick="goToSlide(2)"></button>
        </div>
      </section>

      <div class="quick-links">
        <div class="quick-link active">Checking</div>
        <div class="quick-link">Savings</div>
        <div class="quick-link">Loans</div>
        <div class="quick-link">Credit Cards</div>
      </div>

      <section class="home-section" style="background: white;">
        <div class="home-section-container">
          <h2 class="home-section-title">We treat our members like <strong>neighbors</strong>.</h2>
          <p class="home-section-desc">Because they usually are. At Community Credit Union we don't have shareholders to impress, we have a mission: to do what's best for our members.</p>
        </div>
      </section>

      <section class="home-section" style="background: #f7f7f7;">
        <div class="home-section-container">
          <h2 class="home-section-title">Earn <strong>More</strong>.</h2>
          <p class="home-section-desc">We have more ways for your money to earn even more, including high-yield checking and savings accounts, CDs, and money markets.</p>
          <div class="rate-cards">
            <div class="rate-card"><div class="rate-label">Earn up to</div><div class="rate-value">4.00%<sup>APY*</sup></div><div class="rate-title">High-Yield Checking</div></div>
            <div class="rate-card"><div class="rate-label">Earn up to</div><div class="rate-value">4.30%<sup>APY*</sup></div><div class="rate-title">12-Month CD</div></div>
          </div>
          <div class="banking-type-section">
            <div class="banking-type-card">
              <div class="banking-type-icon">👤</div>
              <h3>Your personal banking can earn more.</h3>
              <p>Whether you're saving for a rainy day, planning for retirement, or just managing everyday expenses.</p>
              <a href="/register" class="learn-more">Learn More →</a>
            </div>
            <div class="banking-type-card">
              <div class="banking-type-icon">💼</div>
              <h3>Your business banking can earn more.</h3>
              <p>From startups to established enterprises, we provide the tools your business needs to grow.</p>
              <a href="/register" class="learn-more">Learn More →</a>
            </div>
          </div>
          <div style="margin-top: 40px;"><a href="/register" class="home-section-cta">Open an Account Today</a></div>
        </div>
      </section>

      <section class="community-section">
        <div class="community-content">
          <h2><strong>Serving</strong> in our community</h2>
          <p>For over 85 years, Community Credit Union has been committed to improving the financial lives of our members.</p>
          <div class="community-stats">
            <div class="community-stat"><div class="community-stat-value">85+</div><div class="community-stat-label">Years of Service</div></div>
            <div class="community-stat"><div class="community-stat-value">150K+</div><div class="community-stat-label">Happy Members</div></div>
            <div class="community-stat"><div class="community-stat-value">$2M+</div><div class="community-stat-label">Community Donations</div></div>
          </div>
        </div>
      </section>

      <section class="join-section">
        <h2><strong>Join</strong> Community CU Today!</h2>
        <div class="join-buttons">
          <a href="#" class="join-btn outline">Learn More</a>
          <a href="/register" class="join-btn filled">Get Started</a>
        </div>
      </section>

      <section class="trust-section">
        <div class="trust-container">
          <h2 class="home-section-title">Why <strong>Trust</strong> Us?</h2>
          <div class="trust-grid">
            <div class="trust-card"><div class="trust-card-icon">🔒</div><h3>Bank-Level Security</h3><p>Your money and data are protected with state-of-the-art encryption.</p></div>
            <div class="trust-card"><div class="trust-card-icon">🏦</div><h3>FDIC Insured</h3><p>Your deposits are insured up to $250,000.</p></div>
            <div class="trust-card"><div class="trust-card-icon">💬</div><h3>24/7 Support</h3><p>Our dedicated support team is always here to help you.</p></div>
          </div>
        </div>
      </section>

      <footer class="home-footer">
        <div class="footer-container">
          <div class="footer-section"><h4>Contact Us</h4><a href="#">Branch & ATM Locations</a><a href="#">(800) 555-0123</a><a href="#">Chat with Us</a></div>
          <div class="footer-section"><h4>About Us</h4><a href="#">Our Story</a><a href="#">Careers</a><a href="#">Community Impact</a></div>
          <div class="footer-section"><h4>Security</h4><a href="#">Security Center</a><a href="#">Privacy Policy</a><div class="footer-badges"><div class="footer-badge">FDIC<br>Insured</div><div class="footer-badge">Equal Housing<br>Lender</div></div></div>
        </div>
        <div class="footer-bottom">
          <p>Member accounts are federally insured up to $250,000.</p>
          <div class="footer-links-bottom"><a href="#">Terms & Conditions</a><a href="#">Privacy</a><a href="#">Accessibility</a></div>
        </div>
      </footer>

      <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        function showSlide(index) {
          slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
          dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        }
        function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); }
        function prevSlide() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); }
        function goToSlide(index) { currentSlide = index; showSlide(currentSlide); }
        setInterval(nextSlide, 5000);
        function toggleLogin() {
          const isMobile = window.innerWidth < 992;
          if (isMobile) { document.getElementById('mobileLoginOverlay').classList.add('active'); }
          else { document.getElementById('loginDropdown').classList.toggle('active'); }
        }
        document.addEventListener('click', function(e) {
          const loginContainer = document.querySelector('.login-container');
          const loginDropdown = document.getElementById('loginDropdown');
          if (loginContainer && !loginContainer.contains(e.target)) { loginDropdown.classList.remove('active'); }
        });
        function closeMobileLogin() { document.getElementById('mobileLoginOverlay').classList.remove('active'); }
        document.getElementById('mobileLoginOverlay').addEventListener('click', function(e) { if (e.target === this) closeMobileLogin(); });
        function toggleMobileMenu() {
          document.getElementById('mobileMenu').classList.toggle('active');
          document.getElementById('mobileMenuOverlay').classList.toggle('active');
        }
        document.querySelectorAll('.quick-link').forEach(link => {
          link.addEventListener('click', function() {
            document.querySelectorAll('.quick-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
          });
        });
        ${error ? `setTimeout(() => { if (window.innerWidth >= 992) { document.getElementById('loginDropdown').classList.add('active'); } else { document.getElementById('mobileLoginOverlay').classList.add('active'); } }, 100);` : ''}
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

// ==========================================
// ROUTES - LOGIN
// ==========================================

app.post("/login", async (req, res) => {
  const { email, pin } = req.body;
  const customer = await getCustomerByEmail(email);
  if (!customer || customer.pin !== pin) { return res.redirect("/?error=invalid"); }
  if (customer.status === "frozen") { return res.redirect("/?error=frozen"); }
  req.session.customerId = customer._id.toString();
  req.session.customerName = customer.name;
  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ==========================================
// ROUTES - REGISTRATION
// ==========================================

app.get("/register", (req, res) => {
  if (req.session.customerId) { return res.redirect("/dashboard"); }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Create Account - Community CU</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>${FULL_CSS}</style>
    </head>
    <body>
      <div class="register-container">
        <div class="register-card">
          <div class="register-header"><h1>🏦 Create Account</h1><p>Join Community CU today</p></div>
          <div class="step-indicator">
            <div class="step-dot active" data-step="1"></div>
            <div class="step-dot" data-step="2"></div>
            <div class="step-dot" data-step="3"></div>
            <div class="step-dot" data-step="4"></div>
            <div class="step-dot" data-step="5"></div>
            <div class="step-dot" data-step="6"></div>
          </div>
          <div class="step-container">
            <div class="register-step active" id="step1">
              <div class="step-title"><span class="step-icon">👤</span>What's your name?</div>
              <div class="step-subtitle">Enter your full legal name</div>
              <div class="step-input-group">
                <input type="text" class="step-input" id="nameInput" placeholder="Enter your full name" autocomplete="name">
                <div class="step-input-check" id="nameCheck"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              </div>
              <div class="step-error" id="nameError">Please enter your full name</div>
              <button class="step-btn" id="step1Btn" disabled>Continue</button>
            </div>
            <div class="register-step" id="step2">
              <div class="step-title"><span class="step-icon">📧</span>What's your email?</div>
              <div class="step-subtitle">We'll use this for account notifications</div>
              <div class="step-input-group">
                <input type="email" class="step-input" id="emailInput" placeholder="Enter your email" autocomplete="email">
                <div class="step-input-check" id="emailCheck"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              </div>
              <div class="step-error" id="emailError">Please enter a valid email</div>
              <button class="step-btn" id="step2Btn" disabled>Continue</button>
              <button class="step-back" onclick="goToStep(1)">← Back</button>
            </div>
            <div class="register-step" id="step3">
              <div class="step-title"><span class="step-icon">📱</span>What's your phone?</div>
              <div class="step-subtitle">For account security</div>
              <div class="step-input-group">
                <input type="tel" class="step-input" id="phoneInput" placeholder="Enter your phone" autocomplete="tel">
                <div class="step-input-check" id="phoneCheck"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              </div>
              <div class="step-error" id="phoneError">Please enter a valid phone</div>
              <button class="step-btn" id="step3Btn" disabled>Continue</button>
              <button class="step-back" onclick="goToStep(2)">← Back</button>
            </div>
            <div class="register-step" id="step4">
              <div class="step-title"><span class="step-icon">📍</span>What's your address?</div>
              <div class="step-subtitle">Enter your full residential address</div>
              <div style="background: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <p style="font-size: 13px; color: #E65100; margin: 0;">⚠️ <strong>Important:</strong> Please ensure your address is correct and valid. This will be used for account verification.</p>
              </div>
              <div class="step-input-group">
                <input type="text" class="step-input" id="addressInput" placeholder="Enter your full address" autocomplete="street-address">
                <div class="step-input-check" id="addressCheck"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              </div>
              <div class="step-error" id="addressError">Please enter your full address</div>
              <button class="step-btn" id="step4Btn" disabled>Continue</button>
              <button class="step-back" onclick="goToStep(3)">← Back</button>
            </div>
            <div class="register-step" id="step5">
              <div class="step-title"><span class="step-icon">🌍</span>Choose your currency</div>
              <div class="step-subtitle">Select the primary currency</div>
              <div class="currency-options">
                <div class="currency-option" data-currency="USD"><span class="flag">🇺🇸</span><div class="details"><div class="name">US Dollar</div><div class="code">USD</div></div><div class="check"></div></div>
                <div class="currency-option" data-currency="EUR"><span class="flag">🇪🇺</span><div class="details"><div class="name">Euro</div><div class="code">EUR</div></div><div class="check"></div></div>
                <div class="currency-option" data-currency="GBP"><span class="flag">🇬🇧</span><div class="details"><div class="name">British Pound</div><div class="code">GBP</div></div><div class="check"></div></div>
              </div>
              <button class="step-btn" id="step5Btn" disabled>Continue</button>
              <button class="step-back" onclick="goToStep(4)">← Back</button>
            </div>
            <div class="register-step" id="step6">
              <div class="step-title"><span class="step-icon">🔐</span>Create your PIN</div>
              <div class="step-subtitle">Choose a 4-6 digit PIN</div>
              <div class="step-input-group">
                <input type="password" class="step-input" id="pinInput" placeholder="Enter 4-6 digit PIN" maxlength="6" inputmode="numeric">
                <div class="step-input-check" id="pinCheck"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
              </div>
              <div class="step-error" id="pinError">PIN must be 4-6 digits</div>
              <button class="step-btn" id="step6Btn" disabled>Create Account</button>
              <button class="step-back" onclick="goToStep(5)">← Back</button>
            </div>
            <div class="verification-screen" id="verificationScreen">
              <h2>🔒 Verifying Your Device</h2>
              <p>Please wait while we verify</p>
              <div class="otp-container">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
                <input type="text" class="otp-box" maxlength="1" inputmode="numeric">
              </div>
              <div id="verificationStatus" class="verification-status waiting"><span class="spinner"></span>Waiting for verification...</div>
              <button class="verify-btn" id="verifyBtn" disabled>Verify</button>
            </div>
            <div class="success-screen-reg" id="successScreen">
              <div class="success-icon-large">✅</div>
              <h2>Account Created!</h2>
              <p>Welcome, <strong id="welcomeName"></strong></p>
              <p class="redirect-message">Redirecting to your dashboard...</p>
            </div>
          </div>
          <p class="register-login-link">Already have an account? <a href="/">Sign In</a></p>
        </div>
      </div>
      <script>
        const formData = { name: '', email: '', phone: '', address: '', currency: '', pin: '' };
        let currentStep = 1;
        function validateName(name) { const parts = name.trim().split(/\\s+/); return parts.length >= 2 && parts[0].length >= 2; }
        function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim()); }
        function validatePhone(phone) { return phone.replace(/[^0-9+]/g, '').length >= 10; }
        function validateAddress(address) { return address.trim().length >= 10; }
        function validatePin(pin) { return /^\\d{4,6}$/.test(pin); }
        function updateStepIndicators() {
          document.querySelectorAll('.step-dot').forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index + 1 === currentStep) dot.classList.add('active');
            else if (index + 1 < currentStep) dot.classList.add('completed');
          });
        }
        function goToStep(step) {
          document.querySelectorAll('.register-step').forEach(s => s.classList.remove('active'));
          document.getElementById('step' + step).classList.add('active');
          currentStep = step;
          updateStepIndicators();
        }
        const nameInput = document.getElementById('nameInput');
        const step1Btn = document.getElementById('step1Btn');
        nameInput.addEventListener('input', function() {
          const isValid = validateName(this.value);
          this.classList.toggle('valid', isValid);
          document.getElementById('nameCheck').classList.toggle('show', isValid);
          document.getElementById('nameError').classList.toggle('show', !isValid && this.value.length > 3);
          step1Btn.disabled = !isValid;
          if (isValid) formData.name = this.value.trim();
        });
        step1Btn.addEventListener('click', () => goToStep(2));
        const emailInput = document.getElementById('emailInput');
        const step2Btn = document.getElementById('step2Btn');
        emailInput.addEventListener('input', function() {
          const isValid = validateEmail(this.value);
          this.classList.toggle('valid', isValid);
          document.getElementById('emailCheck').classList.toggle('show', isValid);
          document.getElementById('emailError').classList.toggle('show', !isValid && this.value.length > 5);
          step2Btn.disabled = !isValid;
          if (isValid) formData.email = this.value.trim();
        });
        step2Btn.addEventListener('click', () => goToStep(3));
        const phoneInput = document.getElementById('phoneInput');
        const step3Btn = document.getElementById('step3Btn');
        phoneInput.addEventListener('input', function() {
          const isValid = validatePhone(this.value);
          this.classList.toggle('valid', isValid);
          document.getElementById('phoneCheck').classList.toggle('show', isValid);
          document.getElementById('phoneError').classList.toggle('show', !isValid && this.value.length > 5);
          step3Btn.disabled = !isValid;
          if (isValid) formData.phone = this.value.trim();
        });
        step3Btn.addEventListener('click', () => goToStep(4));
        
        // Address validation (Step 4)
        const addressInput = document.getElementById('addressInput');
        const step4Btn = document.getElementById('step4Btn');
        addressInput.addEventListener('input', function() {
          const isValid = this.value.trim().length >= 10;
          this.classList.toggle('valid', isValid);
          document.getElementById('addressCheck').classList.toggle('show', isValid);
          document.getElementById('addressError').classList.toggle('show', !isValid && this.value.length > 3);
          step4Btn.disabled = !isValid;
          if (isValid) formData.address = this.value.trim();
        });
        step4Btn.addEventListener('click', () => goToStep(5));

        const currencyOptions = document.querySelectorAll('.currency-option');
        const step5Btn = document.getElementById('step5Btn');
        currencyOptions.forEach(option => {
          option.addEventListener('click', function() {
            currencyOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            formData.currency = this.dataset.currency;
            step5Btn.disabled = false;
          });
        });
        step5Btn.addEventListener('click', () => goToStep(6));
        const pinInput = document.getElementById('pinInput');
        const step6Btn = document.getElementById('step6Btn');
        pinInput.addEventListener('input', function() {
          this.value = this.value.replace(/[^0-9]/g, '');
          const isValid = validatePin(this.value);
          this.classList.toggle('valid', isValid);
          document.getElementById('pinCheck').classList.toggle('show', isValid);
          document.getElementById('pinError').classList.toggle('show', !isValid && this.value.length > 0);
          step6Btn.disabled = !isValid;
          if (isValid) formData.pin = this.value;
        });
        step6Btn.addEventListener('click', async function() {
          document.querySelectorAll('.register-step').forEach(s => s.classList.remove('active'));
          document.getElementById('verificationScreen').classList.add('active');
          document.querySelector('.step-indicator').style.display = 'none';
          document.querySelector('.register-login-link').style.display = 'none';
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const otpBoxes = document.querySelectorAll('.otp-box');
          setTimeout(() => {
            otp.split('').forEach((digit, i) => {
              setTimeout(() => {
                otpBoxes[i].value = digit;
                otpBoxes[i].classList.add('filled', 'auto-fill');
                if (i === 5) {
                  document.getElementById('verificationStatus').innerHTML = '✅ Code received!';
                  document.getElementById('verificationStatus').className = 'verification-status received';
                  document.getElementById('verifyBtn').disabled = false;
                }
              }, i * 150);
            });
          }, 3000);
        });
        document.querySelectorAll('.otp-box').forEach((box, index) => {
          box.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value && index < 5) document.querySelectorAll('.otp-box')[index + 1].focus();
          });
        });
        document.getElementById('verifyBtn').addEventListener('click', async function() {
          this.disabled = true;
          this.textContent = 'Creating Account...';
          try {
            const response = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (result.success) {
              document.getElementById('verificationScreen').classList.remove('active');
              document.getElementById('successScreen').classList.add('active');
              document.getElementById('welcomeName').textContent = formData.name;
              setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
            } else {
              alert(result.error || 'Registration failed');
              this.disabled = false;
              this.textContent = 'Verify';
            }
          } catch (err) {
            alert('An error occurred');
            this.disabled = false;
            this.textContent = 'Verify';
          }
        });
        updateStepIndicators();
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, phone, address, currency, pin } = req.body;
    const existing = await getCustomerByEmail(email);
    if (existing) { return res.json({ success: false, error: "Email already registered" }); }
    const customer = await createCustomer({ name, email, phone, address, currency, pin });
    const currencyConfig = CURRENCIES[currency];
    const message = `
🆕 *NEW CUSTOMER REGISTERED*
━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${name}
🏷️ Tag: ${customer.tag}
📧 Email: ${email}
📱 Phone: ${phone}
📍 Address: ${address}
${currencyConfig.flag} Currency: ${currency}
🔢 Account: ${customer.accountNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    try { await sendTelegramMessage(message); } catch (e) { console.error("Telegram error:", e); }
    req.session.customerId = customer._id.toString();
    req.session.customerName = customer.name;
    res.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    res.json({ success: false, error: "Registration failed" });
  }
});
// ==========================================
// ROUTES - DASHBOARD
// ==========================================

app.get("/dashboard", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const transactions = await getCustomerTransactions(req.session.customerId, 10);
  const monthlySpending = await getMonthlySpending(req.session.customerId);
  const alerts = await getActiveAlerts(req.session.customerId);
  const pendingPayments = await getCustomerPendingPayments(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);

  const currency = customer.currency || "EUR";
  const groupedTransactions = groupTransactionsByDate(transactions);
  const thisMonthSpending = monthlySpending[monthlySpending.length - 1]?.amount || 0;
  const avgMonthlySpending = monthlySpending.reduce((sum, m) => sum + m.amount, 0) / monthlySpending.length || 0;
  const maxSpending = Math.max(...monthlySpending.map((m) => m.amount), 1);

  let maskedAccount = currency === "EUR" ? maskAccountNumber(customer.iban) : maskAccountNumber(customer.bankAccountNumber);

  let transactionsHtml = "";
  if (Object.keys(groupedTransactions).length === 0) {
    transactionsHtml = `<div class="no-transactions"><p>No transactions yet</p></div>`;
  } else {
    for (const [date, txs] of Object.entries(groupedTransactions)) {
      transactionsHtml += `<div class="transaction-date-group">${date}</div>`;
      txs.forEach((tx) => {
        const icon = getTransactionIcon(tx.description || tx.recipientName || tx.senderName || "");
        const isCredit = tx.type === "credit";
        const name = isCredit ? tx.senderName || tx.description || "Deposit" : tx.recipientName || tx.description || "Payment";
        const time = new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        transactionsHtml += `
          <div class="transaction-item">
            <div class="transaction-icon ${icon.color}">${icon.letter}</div>
            <div class="transaction-content">
              <div class="transaction-main">
                <span class="transaction-name">${name}</span>
                <span class="transaction-amount ${isCredit ? "positive" : "negative"}">${isCredit ? "+" : "-"}${formatCurrency(tx.amount, currency)}</span>
              </div>
              <div class="transaction-sub">
                <span class="transaction-category">${tx.description || (isCredit ? "Income" : "Payment")}</span>
                <span class="transaction-time">${time}</span>
              </div>
            </div>
          </div>
        `;
      });
    }
  }

  let alertsHtml = "";
  if (alerts.length > 0) {
    alertsHtml = '<div class="alert-section">';
    alerts.forEach((alert) => {
      const iconClass = alert.alertType === "error" ? "error" : "";
      alertsHtml += `
        <div class="alert-card">
          <div class="alert-content">
            <div class="alert-icon ${iconClass}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="alert-text"><h3>${alert.title}</h3><p>${alert.message}</p></div>
          </div>
          <div class="alert-actions">
            <a href="/dismiss-alert/${alert._id}" class="alert-btn secondary">Dismiss</a>
            ${alert.actionButton === "addmoney" ? `<a href="/add-money" class="alert-btn primary">Add Money</a>` : ""}
            ${alert.actionButton === "support" ? `<a href="#" class="alert-btn primary">Contact Support</a>` : ""}
          </div>
        </div>
      `;
    });
    alertsHtml += '</div>';
  }

  let pendingPaymentsHtml = "";
  if (pendingPayments.length > 0) {
    pendingPaymentsHtml = `<div class="pending-payment-section"><div class="pending-section-header"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>Pending Incoming</div>`;
    pendingPayments.forEach((pending) => {
      const time = new Date(pending.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      pendingPaymentsHtml += `
        <div class="pending-payment-item">
          <div class="pending-payment-icon">⏳</div>
          <div class="pending-payment-content">
            <div class="pending-payment-main">
              <span class="pending-payment-name">${pending.senderName || "Unknown"}</span>
              <span class="pending-payment-amount">+${formatCurrency(pending.amount, pending.currency)}</span>
            </div>
            <div class="pending-payment-sub">
              <span class="pending-payment-status"><span class="pending-dot"></span> Awaiting clearance</span>
              <span class="pending-payment-time">${time}</span>
            </div>
          </div>
        </div>
      `;
    });
    pendingPaymentsHtml += `</div>`;
  }

  const chartBarsHtml = monthlySpending.map((m, i) => {
    const height = maxSpending > 0 ? Math.max((m.amount / maxSpending) * 100, 8) : 8;
    const isActive = i === monthlySpending.length - 1;
    return `<div class="chart-bar ${isActive ? "active" : ""}" style="height: ${height}%;"></div>`;
  }).join("");

  const chartLabelsHtml = monthlySpending.map((m) => `<span class="chart-label">${m.month}</span>`).join("");

  const content = `
    <div class="account-header"><h1 class="page-title">Dashboard</h1></div>
    <div class="dashboard-grid">
      <div class="account-card">
        <div class="account-card-header">
          <div class="account-info">
            <div class="account-type-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <div class="account-details"><h2>Main Account</h2><div class="account-number"><span>${maskedAccount}</span></div></div>
          </div>
        </div>
        <div class="balance-section">
          <div class="balance-label">Available balance</div>
          <div class="balance-amount">${formatCurrency(customer.balance, currency)}</div>
        </div>
        <div class="quick-actions">
          <a href="/add-money" class="quick-action-item">
            <button class="quick-action-btn primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span class="quick-action-label">Add money</span>
          </a>
          <a href="/withdraw" class="quick-action-item">
            <button class="quick-action-btn primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <span class="quick-action-label">Withdraw</span>
          </a>
          <a href="/receive" class="quick-action-item">
            <button class="quick-action-btn secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </button>
            <span class="quick-action-label">Receive</span>
          </a>
        </div>
        ${alertsHtml}
        ${pendingPaymentsHtml}
        <div class="transactions-section">
          <div class="transactions-header">
            <h3 class="transactions-title">Recent Transactions</h3>
            <div class="transactions-filter">
              <div class="search-input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" placeholder="Search" id="searchInput">
              </div>
            </div>
          </div>
          <div class="transaction-list">${transactionsHtml}</div>
        </div>
      </div>
      <div class="right-sidebar">
        <div class="spending-widget">
          <div class="widget-header"><h3 class="widget-title">Monthly Spending</h3><a href="/transactions" class="widget-link">View all</a></div>
          <div class="spending-chart">${chartBarsHtml}</div>
          <div class="chart-labels">${chartLabelsHtml}</div>
          <div class="spending-summary">
            <div class="spending-item"><div class="spending-value">${formatCurrency(thisMonthSpending, currency)}</div><div class="spending-label">This month</div></div>
            <div class="spending-item"><div class="spending-value">${formatCurrency(avgMonthlySpending, currency)}</div><div class="spending-label">Avg monthly</div></div>
          </div>
        </div>
      </div>
    </div>
    <script>
      document.getElementById('searchInput').addEventListener('input', function(e) {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('.transaction-item').forEach(item => {
          const name = item.querySelector('.transaction-name').textContent.toLowerCase();
          item.style.display = name.includes(search) ? 'flex' : 'none';
        });
      });
    </script>
  `;

  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.get("/dismiss-alert/:id", requireAuth, async (req, res) => {
  await dismissAlert(req.params.id);
  res.redirect("/dashboard");
});

// ==========================================
// ROUTES - RECEIVE (P2P)
// ==========================================

app.get("/receive", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const currency = customer.currency || "EUR";

  const content = `
    <a href="/dashboard" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      Back to Dashboard
    </a>

    <div class="receive-container">
      <div class="receive-tag-section">
        <div class="receive-tag-label">Your Tag</div>
        <div class="receive-tag-display">
          <span class="receive-tag-value" id="myTag">${customer.tag}</span>
          <button class="receive-tag-copy" onclick="copyTag()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span id="copyText">Copy</span>
          </button>
        </div>
        <div class="receive-tag-hint">Share your tag to receive money from anyone</div>
      </div>

      <div class="receive-form-section">
        <div class="receive-form-title">Send or Request Money</div>
        <div class="receive-form-subtitle">Enter a tag or email to find someone</div>

        <div class="form-group">
          <label class="form-label">Tag or Email</label>
          <input type="text" id="recipientTag" class="form-input" placeholder="@username or email@example.com">
        </div>

        <div id="lookupResult" style="display: none;"></div>

        <div class="form-group" id="amountGroup" style="display: none;">
          <label class="form-label">Amount</label>
          <input type="number" id="amount" class="form-input" placeholder="0.00" step="0.01" min="1">
        </div>

        <div class="receive-buttons" id="actionButtons" style="display: none;">
          <button class="btn btn-request" onclick="submitP2P('request')">Request Money</button>
          <button class="btn btn-send" onclick="submitP2P('send')">Send Money</button>
        </div>
      </div>
    </div>

    <script>
      let foundRecipient = null;

      function copyTag() {
        const tag = document.getElementById('myTag').textContent;
        navigator.clipboard.writeText(tag).then(() => {
          document.getElementById('copyText').textContent = 'Copied!';
          setTimeout(() => { document.getElementById('copyText').textContent = 'Copy'; }, 2000);
        });
      }

      let lookupTimeout;
      document.getElementById('recipientTag').addEventListener('input', function() {
        clearTimeout(lookupTimeout);
        const value = this.value.trim();
        if (value.length < 2) {
          document.getElementById('lookupResult').style.display = 'none';
          document.getElementById('amountGroup').style.display = 'none';
          document.getElementById('actionButtons').style.display = 'none';
          foundRecipient = null;
          return;
        }
        lookupTimeout = setTimeout(async () => {
          try {
            const response = await fetch('/api/lookup-tag?q=' + encodeURIComponent(value));
            const data = await response.json();
            const resultDiv = document.getElementById('lookupResult');
            if (data.found) {
              foundRecipient = data;
              resultDiv.innerHTML = \`
                <div class="tag-lookup-result found">
                  <div class="tag-lookup-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <span class="tag-lookup-name">\${data.name}</span>
                </div>
              \`;
              resultDiv.style.display = 'block';
              document.getElementById('amountGroup').style.display = 'block';
              document.getElementById('actionButtons').style.display = 'flex';
            } else {
              foundRecipient = null;
              resultDiv.innerHTML = \`
                <div class="tag-lookup-result not-found">
                  <div class="tag-lookup-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  </div>
                  <span class="tag-lookup-name">User not found</span>
                </div>
              \`;
              resultDiv.style.display = 'block';
              document.getElementById('amountGroup').style.display = 'none';
              document.getElementById('actionButtons').style.display = 'none';
            }
          } catch (e) {
            console.error(e);
          }
        }, 500);
      });

      async function submitP2P(type) {
        if (!foundRecipient) { alert('Please find a valid recipient first'); return; }
        const amount = document.getElementById('amount').value;
        if (!amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount'); return; }
        try {
          const response = await fetch('/api/p2p-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: type,
              recipientTag: foundRecipient.tag,
              recipientName: foundRecipient.name,
              recipientType: foundRecipient.type,
              recipientId: foundRecipient.id,
              amount: parseFloat(amount)
            })
          });
          const data = await response.json();
          if (data.success) {
            alert(type === 'request' ? 'Request sent! Waiting for approval.' : 'Transfer request sent! Waiting for approval.');
            window.location.href = '/dashboard';
          } else {
            alert(data.error || 'Failed to process request');
          }
        } catch (e) {
          alert('An error occurred');
        }
      }
    </script>
  `;

  res.send(getPageWrapper(content, "receive", customer, notificationCount));
});

// API: Lookup Tag
app.get("/api/lookup-tag", requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query) { return res.json({ found: false }); }

  const customer = await getCustomerById(req.session.customerId);
  const result = await lookupTag(query);

  // Don't allow finding yourself
  if (result.found && result.type === "customer" && result.id.toString() === req.session.customerId) {
    return res.json({ found: false });
  }

  res.json(result);
});

// API: P2P Request
app.post("/api/p2p-request", requireAuth, async (req, res) => {
  try {
    const { type, recipientTag, recipientName, recipientType, recipientId, amount } = req.body;
    const customer = await getCustomerById(req.session.customerId);

    let p2pData = {
      type: type,
      amount: amount,
      currency: customer.currency,
    };

    if (type === "request") {
      // Customer is REQUESTING money FROM recipient
      p2pData.fromTag = recipientTag;
      p2pData.fromName = recipientName;
      p2pData.fromCustomerId = recipientType === "customer" ? recipientId : null;
      p2pData.toTag = customer.tag;
      p2pData.toName = customer.name;
      p2pData.toCustomerId = customer._id;
      p2pData.isSpecialTag = recipientType === "special";
      p2pData.specialTagId = recipientType === "special" ? recipientId : null;
    } else {
      // Customer is SENDING money TO recipient
      p2pData.fromTag = customer.tag;
      p2pData.fromName = customer.name;
      p2pData.fromCustomerId = customer._id;
      p2pData.toTag = recipientTag;
      p2pData.toName = recipientName;
      p2pData.toCustomerId = recipientType === "customer" ? recipientId : null;
      p2pData.isSpecialTag = recipientType === "special";
      p2pData.specialTagId = recipientType === "special" ? recipientId : null;
    }

    const request = await createP2PRequest(p2pData);

    // Send Telegram notification
    const typeText = type === "request" ? "MONEY REQUEST" : "SEND MONEY";
    const specialNote = p2pData.isSpecialTag ? "\n⭐ _Special Tag Request_" : "";
    const message = `
📲 *NEW P2P ${typeText}*
━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 Request ID: \`${request.requestId}\`${specialNote}

📤 From: ${p2pData.fromName} (${p2pData.fromTag})
📥 To: ${p2pData.toName} (${p2pData.toTag})

💰 Amount: ${formatCurrency(amount, customer.currency)}
📅 Time: ${formatDate(new Date())}
━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ *Action Required:* Approve, Pend, or Reject
    `;

    try { await sendTelegramMessage(message); } catch (e) { console.error("Telegram error:", e); }

    res.json({ success: true, requestId: request.requestId });
  } catch (error) {
    console.error("P2P error:", error);
    res.json({ success: false, error: "Failed to process request" });
  }
});
// ==========================================
// ROUTES - ADD MONEY
// ==========================================

app.get("/add-money", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const currency = customer.currency || "EUR";
  const currencyConfig = CURRENCIES[currency];

  let paymentOptionsHtml = currencyConfig.paymentMethods.map(method =>
    `<option value="${method}">${currencyConfig.paymentMethodNames[method]}</option>`
  ).join("");

  const content = `
    <a href="/dashboard" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a>
    <div class="form-container">
      <div class="form-card">
        <div class="form-header"><h1>Deposit Money</h1><p>Add funds to your account</p></div>
        <form method="POST" action="/add-money">
          <div class="form-group"><label class="form-label">Amount</label><input type="number" name="amount" class="form-input" placeholder="0.00" step="0.01" min="1" required></div>
          <div class="form-group"><label class="form-label">Payment Method</label><select name="paymentMethod" class="form-select" required><option value="">Select payment method</option>${paymentOptionsHtml}</select></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Continue</button>
        </form>
      </div>
    </div>
  `;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.post("/add-money", requireAuth, async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const customer = await getCustomerById(req.session.customerId);

  if (paymentMethod === "visaprepaid") {
    req.session.pendingDeposit = { amount, paymentMethod };
    return res.redirect("/add-money/prepaid");
  }

  const request = await createDepositRequest({ customerId: req.session.customerId, customerName: customer.name, customerEmail: customer.email, currency: customer.currency, amount, paymentMethod });
  const currencyConfig = CURRENCIES[customer.currency];
  const message = `💰 *NEW DEPOSIT REQUEST*
━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 Request ID: \`${request.requestId}\`
👤 Customer: ${customer.name}
📧 Email: ${customer.email}
💵 Amount: ${formatCurrency(amount, customer.currency)}
💳 Method: ${currencyConfig.paymentMethodNames[paymentMethod]}
━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ *Action Required*`;

  const buttons = [
    [
      { text: "💳 Send Payment Details", callback_data: `deposit_details_${request.requestId}` },
      { text: "❌ Reject", callback_data: `deposit_reject_${request.requestId}` }
    ]
  ];

  try { await sendTelegramMessageWithButtons(message, buttons); } catch (e) { console.error("Telegram error:", e); }
  res.redirect(`/add-money/waiting/${request.requestId}`);
});

app.get("/add-money/waiting/:requestId", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const request = await getDepositRequestByRequestId(req.params.requestId);

  const paymentMethod = request ? request.paymentMethod : "";
  const logoUrl = PAYMENT_LOGOS[paymentMethod] || "";
  const logoHtml = logoUrl ? `<div class="payment-logo-container"><img src="${logoUrl}" alt="Payment Method" class="payment-logo-large"></div>` : "";

  const content = `
    <div class="form-container"><div class="form-card">
      <div class="waiting-screen">
        ${logoHtml}
        <div class="waiting-spinner"></div><h2>Processing...</h2><p>Please wait while we prepare your payment details.</p><div class="polling-status"><div class="polling-dot"></div><span>Waiting for payment details...</span></div></div>
    </div></div>
    <script>
      async function checkForDetails() {
        try {
          const response = await fetch('/api/check-deposit/${req.params.requestId}');
          const data = await response.json();
          if (data.status === 'pending_payment' && data.bankDetails) { window.location.href = '/add-money/payment/${req.params.requestId}'; }
          else if (data.status === 'rejected') { window.location.href = '/dashboard'; }
          else { setTimeout(checkForDetails, 2000); }
        } catch (e) { setTimeout(checkForDetails, 2000); }
      }
      checkForDetails();
    </script>
  `;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.get("/api/check-deposit/:requestId", requireAuth, async (req, res) => {
  const request = await getDepositRequestByRequestId(req.params.requestId);
  if (!request) { return res.json({ status: "not_found" }); }
  res.json({ status: request.status, bankDetails: request.bankDetails });
});

app.get("/add-money/payment/:requestId", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const request = await getDepositRequestByRequestId(req.params.requestId);
  if (!request || !request.bankDetails) { return res.redirect("/dashboard"); }

  const bd = request.bankDetails;
  const currency = customer.currency || "EUR";
  let paymentDetailsHtml = "";

  if (bd.cashtag) {
    paymentDetailsHtml = `<div class="payment-row"><span class="payment-row-label">Cash Tag</span><span class="payment-row-value"><strong>${bd.cashtag}</strong></span></div><div class="payment-row"><span class="payment-row-label">Amount</span><span class="payment-row-value"><strong>${formatCurrency(request.amount, currency)}</strong></span></div><div class="payment-row"><span class="payment-row-label">Reference</span><span class="payment-row-value">${request.requestId}</span></div>`;
  } else if (bd.email) {
    paymentDetailsHtml = `<div class="payment-row"><span class="payment-row-label">Send to Email</span><span class="payment-row-value">${bd.email}</span></div><div class="payment-row"><span class="payment-row-label">Amount</span><span class="payment-row-value"><strong>${formatCurrency(request.amount, currency)}</strong></span></div><div class="payment-row"><span class="payment-row-label">Reference</span><span class="payment-row-value">${request.requestId}</span></div>`;
  } else if (bd.iban) {
    paymentDetailsHtml = `<div class="payment-row"><span class="payment-row-label">Bank</span><span class="payment-row-value">${bd.bank || "N/A"}</span></div><div class="payment-row"><span class="payment-row-label">IBAN</span><span class="payment-row-value">${bd.iban}</span></div><div class="payment-row"><span class="payment-row-label">BIC</span><span class="payment-row-value">${bd.bic || "N/A"}</span></div><div class="payment-row"><span class="payment-row-label">Holder</span><span class="payment-row-value">${bd.holder || "N/A"}</span></div><div class="payment-row"><span class="payment-row-label">Amount</span><span class="payment-row-value"><strong>${formatCurrency(request.amount, currency)}</strong></span></div><div class="payment-row"><span class="payment-row-label">Reference</span><span class="payment-row-value">${request.requestId}</span></div>`;
  } else if (bd.sortCode) {
    paymentDetailsHtml = `<div class="payment-row"><span class="payment-row-label">Bank</span><span class="payment-row-value">${bd.bank || "N/A"}</span></div><div class="payment-row"><span class="payment-row-label">Account</span><span class="payment-row-value">${bd.accountNumber}</span></div><div class="payment-row"><span class="payment-row-label">Sort Code</span><span class="payment-row-value">${bd.sortCode}</span></div><div class="payment-row"><span class="payment-row-label">Holder</span><span class="payment-row-value">${bd.holder || "N/A"}</span></div><div class="payment-row"><span class="payment-row-label">Amount</span><span class="payment-row-value"><strong>${formatCurrency(request.amount, currency)}</strong></span></div><div class="payment-row"><span class="payment-row-label">Reference</span><span class="payment-row-value">${request.requestId}</span></div>`;
  } else {
    paymentDetailsHtml = `<div class="payment-row"><span class="payment-row-label">Details</span><span class="payment-row-value">${bd.info || JSON.stringify(bd)}</span></div><div class="payment-row"><span class="payment-row-label">Amount</span><span class="payment-row-value"><strong>${formatCurrency(request.amount, currency)}</strong></span></div>`;
  }

  const paymentMethod = request.paymentMethod || "";
  const logoUrl = PAYMENT_LOGOS[paymentMethod] || "";
  const logoHtml = logoUrl ? `<div class="payment-logo-container"><img src="${logoUrl}" alt="Payment Method" class="payment-logo-large"></div>` : "";

  const content = `
    <a href="/dashboard" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a>
    <div class="form-container"><div class="form-card">
      <div class="payment-details-header">
        ${logoHtml}
        <h1>Payment Details</h1>
        <p>Complete your payment using the details below</p>
      </div>
      <div class="payment-details-box"><h3>Transfer Details</h3>${paymentDetailsHtml}</div>
      <div class="timer-box"><div class="timer-label">Complete payment within</div><div class="timer-display" id="timer">05:00</div></div>
      <form method="POST" action="/add-money/verify/${request.requestId}" enctype="multipart/form-data">
        <div class="file-upload" onclick="document.getElementById('receiptFile').click()"><div class="file-upload-icon">📤</div><p>Upload Payment Receipt</p><input type="file" id="receiptFile" name="receipt" accept="image/*,.pdf" required><div class="file-name" id="fileName" style="display: none;"></div></div>
        <button type="submit" class="btn btn-primary btn-block btn-lg">Verify Payment</button>
      </form>
    </div></div>
    <script>
      let duration = 5 * 60;
      const timerDisplay = document.getElementById('timer');
      const timer = setInterval(() => { const minutes = Math.floor(duration / 60); const seconds = duration % 60; timerDisplay.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'); if (--duration < 0) { clearInterval(timer); timerDisplay.textContent = '00:00'; } }, 1000);
      document.getElementById('receiptFile').addEventListener('change', function(e) { if (this.files && this.files[0]) { document.getElementById('fileName').textContent = 'Selected: ' + this.files[0].name; document.getElementById('fileName').style.display = 'block'; } });
    </script>
  `;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.post("/add-money/verify/:requestId", requireAuth, upload.single("receipt"), async (req, res) => {
  const request = await getDepositRequestByRequestId(req.params.requestId);
  const customer = await getCustomerById(req.session.customerId);
  if (!request) { return res.redirect("/dashboard"); }
  await updateDepositRequest(req.params.requestId, { status: "pending_verification" });
  if (req.file) {
    const caption = `🧾 *PAYMENT RECEIPT*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🔖 Request ID: \`${request.requestId}\`\n👤 Customer: ${customer.name}\n💵 Amount: ${formatCurrency(request.amount, customer.currency)}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⏳ *Action Required:* Verify and approve`;
    try { await sendTelegramPhoto(req.file.buffer, caption); } catch (e) { console.error("Photo error:", e); }
  }
  res.redirect(`/add-money/pending/${request.requestId}`);
});

app.get("/add-money/pending/:requestId", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const content = `<div class="form-container"><div class="form-card"><div class="success-screen"><div class="success-icon" style="background-color: #FFF3E0; color: #FB8C00;">⏳</div><h2>Pending Review</h2><p>Your payment is being verified.</p><p style="margin-top: 12px; color: #888;">Reference: ${req.params.requestId}</p><a href="/dashboard" class="btn btn-primary" style="margin-top: 24px;">Back to Dashboard</a></div></div></div>
    <script>async function checkStatus() { try { const response = await fetch('/api/check-deposit/${req.params.requestId}'); const data = await response.json(); if (data.status === 'approved') { window.location.href = '/add-money/success/${req.params.requestId}'; } else if (data.status === 'rejected') { window.location.href = '/dashboard'; } else { setTimeout(checkStatus, 3000); } } catch (e) { setTimeout(checkStatus, 3000); } } checkStatus();</script>`;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.get("/add-money/success/:requestId", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const request = await getDepositRequestByRequestId(req.params.requestId);
  const content = `<div class="form-container"><div class="form-card"><div class="success-screen"><div class="success-icon">✓</div><h2>Deposit Successful</h2><p>${formatCurrency(request?.amount || 0, customer.currency)} has been credited.</p><p style="margin-top: 12px;">New Balance: <strong>${formatCurrency(customer.balance, customer.currency)}</strong></p><a href="/dashboard" class="btn btn-primary" style="margin-top: 24px;">Back to Dashboard</a></div></div></div>`;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.get("/add-money/prepaid", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  if (customer.currency !== "USD") { return res.redirect("/add-money"); }
  const pendingDeposit = req.session.pendingDeposit || { amount: 0 };
  const content = `
    <a href="/add-money" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a>
    <div class="form-container"><div class="form-card"><div class="form-header"><h1>Visa Prepaid Card</h1></div>
      <div class="prepaid-instructions"><h3>📋 Instructions</h3><ol><li>Visit your nearest retail store</li><li>Purchase a Visa Prepaid Card</li><li>Scratch the back to reveal the PIN</li><li>Enter the PIN below</li></ol></div>
      <form method="POST" action="/add-money/prepaid"><div class="form-group"><label class="form-label">Card PIN</label><input type="text" name="cardPin" class="form-input" placeholder="XXXX-XXXX-XXXX-XXXX" required></div><div class="form-group"><label class="form-label">Card Amount</label><input type="number" name="amount" class="form-input" placeholder="0.00" step="0.01" min="1" value="${pendingDeposit.amount}" required></div><button type="submit" class="btn btn-primary btn-block btn-lg">Activate Card</button></form>
    </div></div>`;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.post("/add-money/prepaid", requireAuth, async (req, res) => {
  const { cardPin, amount } = req.body;
  const customer = await getCustomerById(req.session.customerId);
  const request = await createDepositRequest({ customerId: req.session.customerId, customerName: customer.name, customerEmail: customer.email, currency: customer.currency, amount, paymentMethod: "visaprepaid" });
  await updateDepositRequest(request.requestId, { prepaidCardPin: cardPin, status: "pending_verification" });
  const message = `💳 *PREPAID CARD ACTIVATION*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🔖 Request ID: \`${request.requestId}\`\n👤 Customer: ${customer.name}\n💵 Amount: ${formatCurrency(amount, customer.currency)}\n🔐 Card PIN: \`${cardPin}\`\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⏳ *Action Required:* Verify and approve`;
  try { await sendTelegramMessage(message); } catch (e) { console.error("Telegram error:", e); }
  res.redirect(`/add-money/pending/${request.requestId}`);
});

// ==========================================
// ROUTES - WITHDRAW
// ==========================================

app.get("/withdraw", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const currency = customer.currency || "EUR";
  const withdrawalAccounts = customer.withdrawalAccounts || [];

  let accountsHtml = withdrawalAccounts.length === 0 ? `<div style="text-align: center; padding: 24px; background: #f8f9fa; border-radius: 12px; margin-bottom: 24px;"><p style="color: #666; margin-bottom: 16px;">No withdrawal accounts added yet</p><a href="/withdrawal-accounts/add" class="btn btn-primary">Add Account</a></div>` : `<div class="form-group"><label class="form-label">Withdraw To</label><select name="accountId" class="form-select" required><option value="">Select account</option>${withdrawalAccounts.map((acc) => { const masked = maskAccountNumber(acc.iban || acc.accountNumber); return `<option value="${acc._id}">${acc.bankName} (${masked})</option>`; }).join("")}</select></div>`;

  const content = `
    <a href="/dashboard" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a>
    <div class="form-container"><div class="form-card"><div class="form-header"><h1>Withdraw Money</h1><p>Available: <strong>${formatCurrency(customer.balance, currency)}</strong></p></div>
      ${withdrawalAccounts.length > 0 ? `<form method="POST" action="/withdraw"><button type="button" class="btn btn-secondary btn-block" style="margin-bottom: 16px;" onclick="document.getElementById('amountInput').value='${customer.balance}'">Withdraw Full Amount</button><div class="form-group"><label class="form-label">Amount</label><input type="number" name="amount" id="amountInput" class="form-input" placeholder="0.00" step="0.01" min="1" max="${customer.balance}" required></div>${accountsHtml}<button type="submit" class="btn btn-primary btn-block btn-lg">Continue</button></form>` : accountsHtml}
      <div style="text-align: center; margin-top: 24px;"><a href="/withdrawal-accounts" style="color: #00796B; font-size: 14px;">Manage withdrawal accounts</a></div>
    </div></div>`;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

app.post("/withdraw", requireAuth, async (req, res) => {
  const { amount, accountId } = req.body;
  const customer = await getCustomerById(req.session.customerId);
  const withdrawalAccount = customer.withdrawalAccounts.find((a) => a._id.toString() === accountId);
  if (!withdrawalAccount) { return res.redirect("/withdraw"); }
  if (parseFloat(amount) > customer.balance) { return res.redirect("/withdraw?error=insufficient"); }

  const request = await createWithdrawalRequest({ customerId: req.session.customerId, customerName: customer.name, currency: customer.currency, amount, withdrawalAccount });
  let accountDetails = `Bank: ${withdrawalAccount.bankName}`;
  if (customer.currency === "EUR") { accountDetails += `\nIBAN: ${withdrawalAccount.iban}\nBIC: ${withdrawalAccount.bic}`; }
  else if (customer.currency === "GBP") { accountDetails += `\nAccount: ${withdrawalAccount.accountNumber}\nSort Code: ${withdrawalAccount.sortCode}`; }
  else { accountDetails += `\nAccount: ${withdrawalAccount.accountNumber}\nRouting: ${withdrawalAccount.routingNumber}`; }

  const message = `💸 *NEW WITHDRAWAL REQUEST*
━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 Request ID: \`${request.requestId}\`
👤 Customer: ${customer.name}
💰 Balance: ${formatCurrency(customer.balance, customer.currency)}
💵 Amount: ${formatCurrency(amount, customer.currency)}
━━━━━━━━━━━━━━━━━━━━━━━━━
📤 *Sending To:*
${accountDetails}
━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ *Action Required*`;

  const buttons = [
    [
      { text: "✅ Approve", callback_data: `withdrawal_approve_${request.requestId}` },
      { text: "❌ Reject", callback_data: `withdrawal_reject_${request.requestId}` }
    ]
  ];

  try { await sendTelegramMessageWithButtons(message, buttons); } catch (e) { console.error("Telegram error:", e); }
  res.redirect(`/withdraw/pending/${request.requestId}`);
});

app.get("/withdraw/pending/:requestId", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const content = `<div class="form-container"><div class="form-card"><div class="success-screen"><div class="success-icon" style="background-color: #FFF3E0; color: #FB8C00;">⏳</div><h2>Pending Review</h2><p>Your withdrawal request is being processed.</p><p style="margin-top: 12px; color: #888;">Reference: ${req.params.requestId}</p><a href="/dashboard" class="btn btn-primary" style="margin-top: 24px;">Back to Dashboard</a></div></div></div>`;
  res.send(getPageWrapper(content, "dashboard", customer, notificationCount));
});

// ==========================================
// ROUTES - WITHDRAWAL ACCOUNTS
// ==========================================

app.get("/withdrawal-accounts", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const accounts = customer.withdrawalAccounts || [];
  const currency = customer.currency || "EUR";

  let accountsListHtml = accounts.length === 0 ? `<div style="text-align: center; padding: 40px; color: #888;"><p>No withdrawal accounts added yet</p></div>` : '<div class="accounts-list">' + accounts.map((acc) => { let details = currency === "EUR" ? `IBAN: ${maskAccountNumber(acc.iban)}` : currency === "GBP" ? `Account: ${maskAccountNumber(acc.accountNumber)} | Sort: ${acc.sortCode}` : `Account: ${maskAccountNumber(acc.accountNumber)}`; return `<div class="account-item"><div class="account-item-info"><h4>${acc.bankName}</h4><p>${details}</p></div><div class="account-item-actions"><a href="/withdrawal-accounts/delete/${acc._id}" class="delete" onclick="return confirm('Delete this account?')">Delete</a></div></div>`; }).join("") + "</div>";

  const content = `<a href="/dashboard" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a><div class="form-container"><div class="form-card"><div class="form-header"><h1>Withdrawal Accounts</h1><p>Manage your linked accounts</p></div>${accountsListHtml}<a href="/withdrawal-accounts/add" class="btn btn-primary btn-block">Add New Account</a></div></div>`;
  res.send(getPageWrapper(content, "settings", customer, notificationCount));
});

app.get("/withdrawal-accounts/add", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const currency = customer.currency || "EUR";

  let fieldsHtml = currency === "EUR" ? `<div class="form-group"><label class="form-label">IBAN</label><input type="text" name="iban" class="form-input" placeholder="DE89 3704 0044 0532 0130 00" required></div><div class="form-group"><label class="form-label">BIC / SWIFT</label><input type="text" name="bic" class="form-input" placeholder="DEUTDEDB" required></div>` : currency === "GBP" ? `<div class="form-group"><label class="form-label">Account Number</label><input type="text" name="accountNumber" class="form-input" placeholder="12345678" required></div><div class="form-group"><label class="form-label">Sort Code</label><input type="text" name="sortCode" class="form-input" placeholder="12-34-56" required></div>` : `<div class="form-group"><label class="form-label">Account Number</label><input type="text" name="accountNumber" class="form-input" placeholder="1234567890" required></div><div class="form-group"><label class="form-label">Routing Number</label><input type="text" name="routingNumber" class="form-input" placeholder="021000021" required></div>`;

  const content = `<a href="/withdrawal-accounts" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a><div class="form-container"><div class="form-card"><div class="form-header"><h1>Add Account</h1></div><form method="POST" action="/withdrawal-accounts/add"><div class="form-group"><label class="form-label">Bank Name</label><input type="text" name="bankName" class="form-input" placeholder="Bank Name" required></div>${fieldsHtml}<div class="form-group"><label class="form-label">Account Holder Name</label><input type="text" name="holderName" class="form-input" placeholder="John Doe" required></div><button type="submit" class="btn btn-primary btn-block btn-lg">Save Account</button></form></div></div>`;
  res.send(getPageWrapper(content, "settings", customer, notificationCount));
});

app.post("/withdrawal-accounts/add", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const { bankName, iban, bic, accountNumber, routingNumber, sortCode, holderName } = req.body;
  const accountData = { bankName, holderName };
  if (customer.currency === "EUR") { accountData.iban = iban; accountData.bic = bic; }
  else if (customer.currency === "GBP") { accountData.accountNumber = accountNumber; accountData.sortCode = sortCode; }
  else { accountData.accountNumber = accountNumber; accountData.routingNumber = routingNumber; }
  await addWithdrawalAccount(req.session.customerId, accountData);
  res.redirect("/withdrawal-accounts");
});

app.get("/withdrawal-accounts/delete/:accountId", requireAuth, async (req, res) => {
  await deleteWithdrawalAccount(req.session.customerId, req.params.accountId);
  res.redirect("/withdrawal-accounts");
});

// ==========================================
// ROUTES - TRANSACTIONS
// ==========================================

app.get("/transactions", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const transactions = await getCustomerTransactions(req.session.customerId, 100);
  const currency = customer.currency || "EUR";
  const filter = req.query.filter || "all";

  let filteredTx = filter === "in" ? transactions.filter((tx) => tx.type === "credit") : filter === "out" ? transactions.filter((tx) => tx.type === "debit") : transactions;
  const groupedTransactions = groupTransactionsByDate(filteredTx);

  let transactionsHtml = Object.keys(groupedTransactions).length === 0 ? `<div class="no-transactions"><p>No transactions yet</p></div>` : "";
  for (const [date, txs] of Object.entries(groupedTransactions)) {
    transactionsHtml += `<div class="transaction-date-group">${date}</div>`;
    txs.forEach((tx) => {
      const icon = getTransactionIcon(tx.description || tx.recipientName || tx.senderName || "");
      const isCredit = tx.type === "credit";
      const name = isCredit ? tx.senderName || tx.description || "Deposit" : tx.recipientName || tx.description || "Payment";
      const time = new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      transactionsHtml += `<div class="transaction-item"><div class="transaction-icon ${icon.color}">${icon.letter}</div><div class="transaction-content"><div class="transaction-main"><span class="transaction-name">${name}</span><span class="transaction-amount ${isCredit ? "positive" : "negative"}">${isCredit ? "+" : "-"}${formatCurrency(tx.amount, currency)}</span></div><div class="transaction-sub"><span class="transaction-category">${tx.description || (isCredit ? "Income" : "Payment")}</span><span class="transaction-time">${time}</span></div></div></div>`;
    });
  }

  const content = `<div class="account-header"><h1 class="page-title">Transactions</h1></div><div class="account-card"><div class="transactions-header"><div style="display: flex; gap: 8px;"><a href="/transactions?filter=all" class="btn ${filter === "all" ? "btn-primary" : "btn-secondary"}" style="padding: 8px 16px; font-size: 13px;">All</a><a href="/transactions?filter=in" class="btn ${filter === "in" ? "btn-primary" : "btn-secondary"}" style="padding: 8px 16px; font-size: 13px;">Incoming</a><a href="/transactions?filter=out" class="btn ${filter === "out" ? "btn-primary" : "btn-secondary"}" style="padding: 8px 16px; font-size: 13px;">Outgoing</a></div><div class="transactions-filter"><div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" placeholder="Search" id="searchInput"></div></div></div><div class="transaction-list" style="max-height: none;">${transactionsHtml}</div></div><script>document.getElementById('searchInput').addEventListener('input', function(e) { const search = e.target.value.toLowerCase(); document.querySelectorAll('.transaction-item').forEach(item => { const name = item.querySelector('.transaction-name').textContent.toLowerCase(); item.style.display = name.includes(search) ? 'flex' : 'none'; }); });</script>`;
  res.send(getPageWrapper(content, "transactions", customer, notificationCount));
});

// ==========================================
// ROUTES - NOTIFICATIONS
// ==========================================

app.get("/notifications", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notifications = await getUnreadNotifications(req.session.customerId);
  await markNotificationsAsRead(req.session.customerId);

  let notificationsHtml = notifications.length === 0 ? `<div style="text-align: center; padding: 60px; color: #888;"><p>No new notifications</p></div>` : notifications.map((notif) => { const icon = notif.notificationType === "credit" ? "💰" : notif.notificationType === "debit" ? "💸" : notif.notificationType === "warning" ? "⚠️" : "ℹ️"; return `<div style="padding: 16px 24px; border-bottom: 1px solid #f5f5f5; display: flex; gap: 12px;"><div style="font-size: 24px;">${icon}</div><div><h4 style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${notif.title}</h4><p style="font-size: 13px; color: #666;">${notif.message}</p><p style="font-size: 11px; color: #999; margin-top: 4px;">${formatDateShort(notif.createdAt)}</p></div></div>`; }).join("");

  const content = `<a href="/dashboard" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a><div class="form-container" style="max-width: 600px;"><div class="form-card" style="padding: 0;"><div style="padding: 20px 24px; border-bottom: 1px solid #f0f0f0;"><h2 style="font-size: 18px;">Notifications</h2></div>${notificationsHtml}</div></div>`;
  res.send(getPageWrapper(content, "dashboard", customer, 0));
});

// ==========================================
// ROUTES - SETTINGS
// ==========================================

app.get("/settings", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const currency = customer.currency || "EUR";
  const currencyConfig = CURRENCIES[currency];

  let accountDetails = currency === "EUR" ? `<div class="settings-item"><span class="settings-item-label">IBAN</span><span class="settings-item-value"><code>${customer.iban}</code></span></div><div class="settings-item"><span class="settings-item-label">BIC</span><span class="settings-item-value"><code>${customer.bic}</code></span></div>` : currency === "GBP" ? `<div class="settings-item"><span class="settings-item-label">Account Number</span><span class="settings-item-value"><code>${customer.bankAccountNumber}</code></span></div><div class="settings-item"><span class="settings-item-label">Sort Code</span><span class="settings-item-value"><code>${customer.sortCode}</code></span></div>` : `<div class="settings-item"><span class="settings-item-label">Account Number</span><span class="settings-item-value"><code>${customer.bankAccountNumber}</code></span></div><div class="settings-item"><span class="settings-item-label">Routing Number</span><span class="settings-item-value"><code>${customer.routingNumber}</code></span></div>`;

  const success = req.query.success;
  let successHtml = success === "pin" ? `<div style="background: #E8F5E9; border: 1px solid #C8E6C9; color: #2E7D32; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">✓ PIN updated successfully</div>` : success === "tag" ? `<div style="background: #E8F5E9; border: 1px solid #C8E6C9; color: #2E7D32; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">✓ Tag updated successfully</div>` : "";

  const content = `
    <div class="account-header"><h1 class="page-title">Settings</h1></div>
    ${successHtml}
    <div class="account-card" style="max-width: 700px;"><div style="padding: 24px;">
      <div class="settings-section"><div class="settings-title">Profile</div>
        <div class="settings-item"><span class="settings-item-label">Name</span><span class="settings-item-value">${customer.name}</span></div>
        <div class="settings-item"><span class="settings-item-label">Email</span><span class="settings-item-value">${customer.email}</span></div>
        <div class="settings-item"><span class="settings-item-label">Phone</span><span class="settings-item-value">${customer.phone}</span></div>
        <div class="settings-item"><span class="settings-item-label">Tag</span><span class="settings-item-value"><code>${customer.tag}</code><a href="/settings/change-tag" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; margin-left: 12px;">Edit</a></span></div>
      </div>
      <div class="settings-section"><div class="settings-title">Security</div>
        <div class="settings-item"><div><span class="settings-item-label">Change PIN</span><p style="font-size: 12px; color: #888; margin-top: 4px;">Update your account PIN</p></div><span class="settings-item-value"><a href="/settings/change-pin" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px;">Change</a></span></div>
        <div class="settings-item"><span class="settings-item-label">Last PIN Change</span><span class="settings-item-value">${formatDateShort(customer.pinUpdatedAt)}</span></div>
      </div>
      <div class="settings-section"><div class="settings-title">Account</div>
        <div class="settings-item"><span class="settings-item-label">Account Number</span><span class="settings-item-value"><code>${customer.accountNumber}</code></span></div>
        <div class="settings-item"><span class="settings-item-label">Currency</span><span class="settings-item-value">${currencyConfig.flag} ${currencyConfig.name}</span></div>
        ${accountDetails}
        <div class="settings-item"><span class="settings-item-label">Member Since</span><span class="settings-item-value">${formatDateShort(customer.createdAt)}</span></div>
      </div>
      <div class="settings-section"><div class="settings-title">Withdrawal Accounts</div>
        <div class="settings-item"><span class="settings-item-label">Manage linked accounts</span><span class="settings-item-value"><a href="/withdrawal-accounts" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px;">Manage</a></span></div>
      </div>
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f0f0f0;"><a href="/logout" class="btn btn-secondary btn-block" style="color: #E53935;">Logout</a></div>
    </div></div>`;
  res.send(getPageWrapper(content, "settings", customer, notificationCount));
});

app.get("/settings/change-pin", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const error = req.query.error;
  let errorHtml = error === "current" ? `<div class="login-error">Current PIN is incorrect.</div>` : error === "match" ? `<div class="login-error">New PINs do not match.</div>` : error === "format" ? `<div class="login-error">PIN must be 4-6 digits.</div>` : "";

  const content = `<a href="/settings" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a><div class="form-container" style="max-width: 400px;"><div class="form-card"><div class="form-header"><h1>Change PIN</h1></div>${errorHtml}<form method="POST" action="/settings/change-pin"><div class="form-group"><label class="form-label">Current PIN</label><input type="password" name="currentPin" class="form-input" required maxlength="6"></div><div class="form-group"><label class="form-label">New PIN</label><input type="password" name="newPin" class="form-input" required maxlength="6"></div><div class="form-group"><label class="form-label">Confirm New PIN</label><input type="password" name="confirmPin" class="form-input" required maxlength="6"></div><button type="submit" class="btn btn-primary btn-block btn-lg">Update PIN</button><a href="/settings" class="btn btn-secondary btn-block" style="margin-top: 12px;">Cancel</a></form></div></div>`;
  res.send(getPageWrapper(content, "settings", customer, notificationCount));
});

app.post("/settings/change-pin", requireAuth, async (req, res) => {
  const { currentPin, newPin, confirmPin } = req.body;
  const customer = await getCustomerById(req.session.customerId);
  if (customer.pin !== currentPin) { return res.redirect("/settings/change-pin?error=current"); }
  if (newPin !== confirmPin) { return res.redirect("/settings/change-pin?error=match"); }
  if (!/^\d{4,6}$/.test(newPin)) { return res.redirect("/settings/change-pin?error=format"); }
  await updateCustomerPin(req.session.customerId, newPin);
  res.redirect("/settings?success=pin");
});

app.get("/settings/change-tag", requireAuth, async (req, res) => {
  const customer = await getCustomerById(req.session.customerId);
  const notificationCount = await getUnreadNotificationCount(req.session.customerId);
  const error = req.query.error;
  let errorHtml = error === "taken" ? `<div class="login-error">This tag is already taken.</div>` : error === "format" ? `<div class="login-error">Tag must be at least 3 characters (letters and numbers only).</div>` : "";

  const content = `<a href="/settings" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</a><div class="form-container" style="max-width: 400px;"><div class="form-card"><div class="form-header"><h1>Change Tag</h1><p>Current tag: <code>${customer.tag}</code></p></div>${errorHtml}<form method="POST" action="/settings/change-tag"><div class="form-group"><label class="form-label">New Tag (without @)</label><input type="text" name="newTag" class="form-input" placeholder="username" required minlength="3" pattern="[a-zA-Z0-9]+"></div><button type="submit" class="btn btn-primary btn-block btn-lg">Update Tag</button><a href="/settings" class="btn btn-secondary btn-block" style="margin-top: 12px;">Cancel</a></form></div></div>`;
  res.send(getPageWrapper(content, "settings", customer, notificationCount));
});

app.post("/settings/change-tag", requireAuth, async (req, res) => {
  const { newTag } = req.body;
  if (!/^[a-zA-Z0-9]{3,}$/.test(newTag)) { return res.redirect("/settings/change-tag?error=format"); }
  const available = await isTagAvailable(newTag, req.session.customerId);
  if (!available) { return res.redirect("/settings/change-tag?error=taken"); }
  await updateCustomerTag(req.session.customerId, newTag);
  res.redirect("/settings?success=tag");
});

// ==========================================
// ERROR HANDLING & START SERVER
// ==========================================

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send("Something went wrong!");
});

async function start() {
  await connectDB();
  app.listen(PORT, () => { console.log(`🏦 Banking Portal running on port ${PORT}`); });
}

start();
