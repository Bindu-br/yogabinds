const Stripe = require('stripe');
const { Resend } = require('resend');
const admin = require('firebase-admin');
const PDFDocument = require('pdfkit');

// ── Firebase Admin (singleton) ──
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ── Raw body reader ──
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── PDF Generator ──
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Invoice ' + invoice.invoiceNumber, Author: 'YogaBinds' } });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const green = '#2d5e3f', darkText = '#1a1a1a', mutedText = '#666666', lineColor = '#e0e0e0';

      doc.fontSize(28).fillColor(green).font('Helvetica-Bold').text('YogaBinds', 50, 50);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('A yoga studio rooted in ancient tradition', 50, 82);
      doc.fontSize(20).fillColor(darkText).font('Helvetica-Bold').text('TAX INVOICE', 350, 50, { width: 195, align: 'right' });
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor(green).lineWidth(2).stroke();

      var y = 130;
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Invoice Number', 50, y);
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text(invoice.invoiceNumber, 50, y + 14);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Invoice Date', 50, y + 38);
      doc.fontSize(10).fillColor(darkText).font('Helvetica').text(invoice.invoiceDate, 50, y + 52);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Payment Method', 50, y + 76);
      doc.fontSize(10).fillColor(darkText).font('Helvetica').text('Stripe (Card)', 50, y + 90);

      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('From', 350, y, { width: 195, align: 'right' });
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text('YogaBinds', 350, y + 14, { width: 195, align: 'right' });
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Sydney, Australia', 350, y + 30, { width: 195, align: 'right' });
      doc.text('yogabinds26@gmail.com', 350, y + 44, { width: 195, align: 'right' });
      if (invoice.abn) { doc.text('ABN: ' + invoice.abn, 350, y + 58, { width: 195, align: 'right' }); }

      y = 270;
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Bill To', 50, y);
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text(invoice.customerName, 50, y + 14);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text(invoice.customerEmail, 50, y + 30);

      y = 340;
      doc.rect(50, y, 495, 28).fillColor('#f5f5f5').fill();
      doc.fontSize(9).fillColor(mutedText).font('Helvetica-Bold');
      doc.text('Description', 60, y + 8, { width: 240 });
      doc.text('Qty', 310, y + 8, { width: 50, align: 'center' });
      doc.text('Unit Price', 370, y + 8, { width: 80, align: 'right' });
      doc.text('Amount', 460, y + 8, { width: 75, align: 'right' });

      y += 28;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();
      y += 10;
      doc.fontSize(10).fillColor(darkText).font('Helvetica').text(invoice.description, 60, y, { width: 240 });
      if (invoice.classDates) { doc.fontSize(8).fillColor(mutedText).text('Class dates: ' + invoice.classDates, 60, y + 16, { width: 240 }); }
      doc.fontSize(10).fillColor(darkText);
      doc.text('1', 310, y, { width: 50, align: 'center' });
      doc.text('$' + invoice.amount.toFixed(2), 370, y, { width: 80, align: 'right' });
      doc.text('$' + invoice.amount.toFixed(2), 460, y, { width: 75, align: 'right' });

      y += (invoice.classDates ? 38 : 24);
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();

      y += 16;
      doc.fontSize(10).fillColor(mutedText).font('Helvetica').text('Subtotal', 370, y, { width: 80, align: 'right' });
      doc.fillColor(darkText).text('$' + invoice.amount.toFixed(2), 460, y, { width: 75, align: 'right' });
      y += 22;
      doc.fillColor(mutedText).text('GST', 370, y, { width: 80, align: 'right' });
      doc.fillColor(darkText).text('$0.00', 460, y, { width: 75, align: 'right' });
      y += 22;
      doc.moveTo(370, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();
      y += 10;
      doc.fontSize(13).fillColor(green).font('Helvetica-Bold');
      doc.text('Total Paid', 350, y, { width: 100, align: 'right' });
      doc.text('$' + invoice.amount.toFixed(2) + ' AUD', 460, y, { width: 75, align: 'right' });

      y += 50;
      doc.rect(50, y, 495, 36).fillColor('#f9f9f2').fill();
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('No GST has been charged as the business is not registered for GST.', 60, y + 12, { width: 475 });

      var footerY = 720;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(lineColor).lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor(mutedText).font('Helvetica');
      doc.text('Thank you for choosing YogaBinds. Namaste.', 50, footerY + 12);
      doc.text('yogabinds26@gmail.com | Sydney, Australia', 50, footerY + 24);
      doc.text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 36);
      doc.end();
    } catch (err) { reject(err); }
  });
}

// ── HTML Escaper (for email templates) ──
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ── Main Handler ──
async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      var customerName = session.metadata.fullName || 'Customer';
      var customerEmail = session.customer_email || (session.customer_details && session.customer_details.email);
      var plan = session.metadata.plan || 'casual';
      var phone = session.metadata.phone || '';
      var classDates = '';

      try {
        var parsed = JSON.parse(session.metadata.classDates || '[]');
        classDates = parsed.map(function(d) {
          return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
        }).join(', ');
      } catch (e) { classDates = ''; }

      var amount = session.amount_total / 100;
      var description = plan === 'casual' ? 'Yoga Session — Casual Class' : 'Yoga Sessions — Introductory Offer (3 Classes)';

      // Auto-increment invoice number
      var counterRef = db.collection('counters').doc('invoices');
      var invoiceNumber = await db.runTransaction(async function(transaction) {
        var counterDoc = await transaction.get(counterRef);
        var nextNumber = 1;
        if (counterDoc.exists) { nextNumber = (counterDoc.data().lastNumber || 0) + 1; }
        transaction.set(counterRef, { lastNumber: nextNumber });
        return 'YBIN-' + String(nextNumber).padStart(3, '0');
      });

      var invoiceDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

      var invoiceData = {
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate,
        customerName: customerName,
        customerEmail: customerEmail,
        phone: phone,
        description: description,
        amount: amount,
        classDates: classDates,
        plan: plan,
        abn: process.env.BUSINESS_ABN || '',
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        createdAt: new Date().toISOString()
      };

      // Generate PDF
      var pdfBuffer = await generateInvoicePDF(invoiceData);

      // Save to Firestore
      await db.collection('invoices').add({
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        customerName: invoiceData.customerName,
        customerEmail: invoiceData.customerEmail,
        phone: invoiceData.phone,
        description: invoiceData.description,
        amount: invoiceData.amount,
        classDates: invoiceData.classDates,
        plan: invoiceData.plan,
        abn: invoiceData.abn,
        stripeSessionId: invoiceData.stripeSessionId,
        stripePaymentIntent: invoiceData.stripePaymentIntent,
        createdAt: invoiceData.createdAt,
        pdfBase64: pdfBuffer.toString('base64'),
        emailSent: false
      });

      // Update matching booking with stripePaymentIntent for refund support
      try {
        var bookingsQuery = await db.collection('bookings')
          .where('email', '==', customerEmail)
          .where('paymentStatus', '==', 'paid')
          .get();

        bookingsQuery.forEach(function(doc) {
          var data = doc.data();
          if (!data.stripePaymentIntent) {
            doc.ref.update({ stripePaymentIntent: session.payment_intent });
          }
        });
      } catch (bookingErr) {
        // Non-fatal — invoice is already saved
      }

      // Send email (non-fatal)
      try {
        var resend = new Resend(process.env.RESEND_API_KEY);

        var emailResult = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'YogaBinds <onboarding@resend.dev>',
          to: customerEmail,
          subject: 'Your YogaBinds Invoice - ' + invoiceNumber,
          html: '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#333;">' +
            '<h2 style="color:#2d5e3f;margin-bottom:4px;">YogaBinds</h2>' +
            '<p style="color:#999;font-size:13px;margin-top:0;">A yoga studio rooted in ancient tradition</p>' +
            '<hr style="border:none;border-top:2px solid #2d5e3f;margin:24px 0;" />' +
            '<p>Hi ' + escapeHTML(customerName) + ',</p>' +
            '<p>Thank you for your booking! Please find your invoice <strong>' + escapeHTML(invoiceNumber) + '</strong> attached.</p>' +
            '<p>Your payment has been received and processed successfully via Stripe.</p>' +
            '<p>You can also download your invoice anytime from the <strong>My Bookings</strong> page.</p>' +
            '<p style="margin-top:32px;">Namaste,<br/><strong style="color:#2d5e3f;">YogaBinds</strong></p>' +
            '<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />' +
            '<p style="font-size:11px;color:#999;">This is an automated email from YogaBinds. Contact us at yogabinds26@gmail.com.</p>' +
            '</div>',
          attachments: [{
            filename: invoiceNumber + '.pdf',
            content: pdfBuffer
          }]
        });

        // Check if Resend returned an error
        if (!emailResult.error) {
          var invoiceQuery = await db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).limit(1).get();
          if (!invoiceQuery.empty) { await invoiceQuery.docs[0].ref.update({ emailSent: true }); }
        }
      } catch (emailErr) {
        // Email failure is non-fatal — invoice is already saved
      }

    } catch (err) {
      // Log server-side only, don't expose details
    }
  }

  return res.status(200).json({ received: true });
}

// Export handler first, then config
module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
