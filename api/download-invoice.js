const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
var db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Server-side authentication via Firebase ID token ──
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  var idToken = authHeader.split('Bearer ')[1];
  var decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (authErr) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  var invoiceId = req.query.invoiceId;
  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoice reference' });
  }

  try {
    var invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    var invoice = invoiceDoc.data();

    // Verify the invoice belongs to the authenticated user
    if (invoice.customerEmail !== decoded.email) {
      return res.status(403).json({ error: 'You do not have permission to access this invoice' });
    }

    if (invoice.pdfBase64) {
      var pdfBuffer = Buffer.from(invoice.pdfBase64, 'base64');
      var safeFilename = String(invoice.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9\-_]/g, '');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="' + safeFilename + '.pdf"');
      return res.status(200).send(pdfBuffer);
    }

    return res.status(404).json({ error: 'Invoice PDF not available' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve invoice' });
  }
};
