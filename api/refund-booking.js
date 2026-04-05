const Stripe = require('stripe');
const { Resend } = require('resend');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
var db = admin.firestore();

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  var verifiedUid = decoded.uid;
  var { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ error: 'Missing booking reference' });
  }

  try {
    // Fetch the booking
    var bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    var booking = bookingDoc.data();

    // Verify the booking belongs to the authenticated user (server-verified uid)
    if (booking.uid !== verifiedUid) {
      return res.status(403).json({ error: 'You do not have permission to cancel this booking' });
    }

    // Prevent double refund
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking has already been cancelled' });
    }

    // Check 24-hour cancellation policy
    var classDates = booking.classDates || [];
    var now = new Date();
    var canCancel = false;

    for (var i = 0; i < classDates.length; i++) {
      var classStart = new Date(classDates[i] + 'T18:00:00');
      var cancelDeadline = new Date(classStart.getTime() - (24 * 60 * 60 * 1000));
      if (now < cancelDeadline) {
        canCancel = true;
        break;
      }
    }

    if (!canCancel) {
      return res.status(400).json({ error: 'Cancellation not allowed within 24 hours of class' });
    }

    // Find the payment intent
    var paymentIntentId = booking.stripePaymentIntent || null;

    if (!paymentIntentId) {
      var invoiceQuery = await db.collection('invoices')
        .where('customerEmail', '==', booking.email || booking.customerEmail || '')
        .where('plan', '==', booking.plan || 'casual')
        .limit(1)
        .get();

      if (!invoiceQuery.empty) {
        paymentIntentId = invoiceQuery.docs[0].data().stripePaymentIntent;
      }
    }

    if (!paymentIntentId) {
      await db.collection('bookings').doc(bookingId).update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      return res.status(200).json({ success: true, refunded: false, message: 'Booking cancelled. No payment record found for refund.' });
    }

    // Process refund via Stripe
    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    var refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer'
    });

    // Update booking status
    await db.collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      refundId: refund.id,
      refundStatus: refund.status,
      refundAmount: refund.amount / 100,
      cancelledAt: new Date().toISOString()
    });

    // Update the related invoice
    var invoiceQuery2 = await db.collection('invoices')
      .where('stripePaymentIntent', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!invoiceQuery2.empty) {
      await invoiceQuery2.docs[0].ref.update({
        refundId: refund.id,
        refundStatus: refund.status,
        refundedAt: new Date().toISOString()
      });
    }

    // Send refund confirmation email (non-fatal)
    var customerEmail = booking.email || booking.customerEmail || '';
    var customerName = booking.fullName || booking.customerName || 'Customer';
    var refundAmount = (refund.amount / 100).toFixed(2);
    var refundDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

    try {
      var resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'YogaBinds <onboarding@resend.dev>',
        to: customerEmail,
        subject: 'Your YogaBinds Booking Has Been Cancelled - Refund Processed',
        html: '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#333;">' +
          '<h2 style="color:#2d5e3f;margin-bottom:4px;">YogaBinds</h2>' +
          '<p style="color:#999;font-size:13px;margin-top:0;">A yoga studio rooted in ancient tradition</p>' +
          '<hr style="border:none;border-top:2px solid #2d5e3f;margin:24px 0;" />' +
          '<p>Hi ' + escapeHTML(customerName) + ',</p>' +
          '<p>Your booking has been <strong>cancelled</strong> and a refund has been processed.</p>' +
          '<table style="width:100%;margin:24px 0;border-collapse:collapse;">' +
            '<tr style="background:#f5f5f5;"><td style="padding:10px 12px;font-size:13px;color:#666;">Refund Amount</td><td style="padding:10px 12px;font-size:13px;font-weight:bold;text-align:right;">$' + refundAmount + ' AUD</td></tr>' +
            '<tr><td style="padding:10px 12px;font-size:13px;color:#666;border-top:1px solid #eee;">Refund Date</td><td style="padding:10px 12px;font-size:13px;text-align:right;border-top:1px solid #eee;">' + refundDate + '</td></tr>' +
          '</table>' +
          '<p>The refund will appear on your original payment method within <strong>5-10 business days</strong>.</p>' +
          '<p>If you have any questions, please contact us at yogabinds26@gmail.com.</p>' +
          '<p style="margin-top:32px;">Namaste,<br/><strong style="color:#2d5e3f;">YogaBinds</strong></p>' +
          '<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />' +
          '<p style="font-size:11px;color:#999;">This is an automated email from YogaBinds.</p>' +
          '</div>'
      });
    } catch (emailErr) {
      // Email failure is non-fatal — refund is already processed
    }

    return res.status(200).json({
      success: true,
      refunded: true,
      message: 'Booking cancelled and refund of $' + refundAmount + ' AUD processed.'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Unable to process cancellation. Please try again or contact support.' });
  }
};
