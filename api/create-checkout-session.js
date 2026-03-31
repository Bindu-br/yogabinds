const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { plan, fullName, email, phone, classDates } = req.body;

    // Validate required fields
    if (!plan || !fullName || !email || !phone || !classDates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Define pricing
    const plans = {
      intro: { name: 'Introductory Offer — 3 Classes', amount: 2999 },
      casual: { name: 'Casual Class', amount: 1499 }
    };

    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: selectedPlan.name,
              description: plan === 'intro'
                ? '3 yoga classes at YogaBinds'
                : '1 yoga class at YogaBinds'
            },
            unit_amount: selectedPlan.amount
          },
          quantity: 1
        }
      ],
      metadata: {
        plan: plan,
        fullName: fullName,
        phone: phone,
        classDates: JSON.stringify(classDates)
      },
      success_url: `${req.headers.origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment.html?plan=${plan}`
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: 'Payment session could not be created' });
  }
};
