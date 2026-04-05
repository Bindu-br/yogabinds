const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    var { plan, fullName, email, phone, classDates } = req.body;

    // Validate required fields
    if (!plan || !fullName || !email || !phone || !classDates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Trim string inputs
    fullName = String(fullName).trim();
    email = String(email).trim().toLowerCase();
    phone = String(phone).trim();
    plan = String(plan).trim();

    // Validate lengths
    if (fullName.length > 100 || email.length > 200 || phone.length > 30) {
      return res.status(400).json({ error: 'Input too long' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Validate phone (digits, spaces, plus, hyphens, parens only)
    if (!/^[+\d\s()\-]{6,30}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Validate classDates is an array of date strings
    if (!Array.isArray(classDates) || classDates.length === 0 || classDates.length > 3) {
      return res.status(400).json({ error: 'Invalid class dates' });
    }
    for (var i = 0; i < classDates.length; i++) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(classDates[i]) || isNaN(Date.parse(classDates[i]))) {
        return res.status(400).json({ error: 'Invalid class date format' });
      }
    }

    // Define pricing
    const plans = {
      intro: { name: 'Introductory Offer — 3 Classes', amount: 2999 },
      casual: { name: 'Casual Class', amount: 1599 }
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
    return res.status(500).json({ error: 'Payment session could not be created' });
  }
};
