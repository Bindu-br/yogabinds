const admin = require('firebase-admin');

// ── Firebase Admin (singleton) ──
if (!admin.apps.length) {
  var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
var db = admin.firestore();

// ── Simple in-memory rate limiter ──
var rateMap = {};
var RATE_WINDOW = 60 * 1000;
var RATE_LIMIT = 10;

function isRateLimited(ip) {
  var now = Date.now();
  if (!rateMap[ip] || now - rateMap[ip].start > RATE_WINDOW) {
    rateMap[ip] = { start: now, count: 1 };
    return false;
  }
  rateMap[ip].count++;
  return rateMap[ip].count > RATE_LIMIT;
}

// ── Admin credential hashes (SHA-256) ──
var ADMIN_USER_HASH = '1e85c4464bf5466e72fdd636eebdd11add8ec93ac2e62ada818e2e5f0da4d777';
var ADMIN_PASS_HASH = '09d6b9e904af1183e2c60c24eeb735dd1c2205638afbef26745254f9ab5fb297';

async function hashString(str) {
  var crypto = require('crypto');
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  try {
    var { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    username = String(username).trim();
    password = String(password);

    if (username.length > 100 || password.length > 100) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify admin credentials
    var userHash = await hashString(username);
    var passHash = await hashString(password);

    if (userHash !== ADMIN_USER_HASH || passHash !== ADMIN_PASS_HASH) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch all data using Admin SDK (bypasses security rules)
    var [bookingsSnap, feedbackSnap, contactsSnap] = await Promise.all([
      db.collection('bookings').orderBy('createdAt', 'desc').get(),
      db.collection('feedback').orderBy('createdAt', 'desc').get(),
      db.collection('contacts').orderBy('createdAt', 'desc').get()
    ]);

    var bookings = bookingsSnap.docs.map(function(doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });
    var feedback = feedbackSnap.docs.map(function(doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });
    var contacts = contactsSnap.docs.map(function(doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });

    return res.status(200).json({ bookings: bookings, feedback: feedback, contacts: contacts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load data' });
  }
};
