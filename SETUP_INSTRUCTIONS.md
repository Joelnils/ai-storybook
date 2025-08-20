# AI Sagoskapare - Setup Instructions

## Overview
A simple AI storybook creator that generates personalized Swedish children's stories with illustrations for €4.99. The system uses:
- **OpenAI GPT-4** for story generation
- **DALL-E 3** for illustrations  
- **Stripe Checkout** for payments
- **Nodemailer** for email delivery
- **No authentication required** - payment-to-email workflow

## Architecture
```
Frontend (simple.html) → Stripe Checkout → Backend Webhook → AI Generation → Email PDF
```

## Prerequisites
- Node.js 18+
- Stripe Account
- OpenAI API Account  
- Gmail Account (for sending emails)

## Setup Steps

### 1. Backend Setup
```bash
cd simple-backend
npm install
```

### 2. Environment Variables
Create `.env` file in `simple-backend/`:
```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Email (Gmail)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password

# URLs
FRONTEND_URL=http://localhost:8080
PORT=3001
```

### 3. Stripe Configuration

#### A. Create Products in Stripe Dashboard:
- Product: "Personlig AI-Saga"
- Price: €4.99 (499 cents)
- Currency: EUR

#### B. Setup Webhook:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `http://localhost:3001/api/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret to `.env`

#### C. Test Mode:
- Use test keys (pk_test_ and sk_test_)
- Test with card number: 4242 4242 4242 4242

### 4. Email Configuration

#### Gmail App Password:
1. Enable 2FA on Gmail
2. Go to Google Account Settings → Security
3. Generate App Password for "Mail"
4. Use this password in EMAIL_PASS

### 5. Start Services

#### Backend:
```bash
cd simple-backend
npm run dev
```

#### Frontend:
Serve `simple.html` on port 8080:
```bash
# Using Python
python -m http.server 8080

# Using Node.js http-server
npx http-server -p 8080

# Using Live Server (VS Code extension)
```

## File Structure
```
portfolio/projects/storybook/
├── simple.html           # Main form page
├── success.html          # Payment success page  
├── simple-script.js      # Frontend logic
├── simple-api.js         # API client
└── style.css            # Styles

simple-backend/
├── server.js             # Main server
├── package.json          # Dependencies
├── .env                  # Environment variables
└── uploads/images/       # Generated images
```

## API Endpoints

### Frontend Endpoints:
- `GET /` → `simple.html`
- `GET /success.html` → Success page

### Backend Endpoints:
- `GET /health` → Health check
- `POST /api/create-checkout-session` → Create Stripe session
- `POST /api/webhook` → Stripe webhook handler
- `POST /api/generate-story` → Generate story (demo)
- `POST /api/generate-demo-images` → Generate demo images

## User Journey

1. **Form Submission** → User fills form with child details
2. **Payment** → Redirected to Stripe Checkout (€4.99)
3. **Success Page** → Shows processing status
4. **Webhook** → Stripe calls backend when payment succeeds
5. **AI Generation** → Backend generates story + images (3-5 min)
6. **Email Delivery** → PDF sent to parent's email
7. **Complete** → Parent receives story as PDF attachment

## Testing

### Test Payment:
- Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

### Test Webhook Locally:
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/webhook

# Test webhook
stripe trigger checkout.session.completed
```

### Monitor Logs:
- Backend: Console output shows AI generation progress
- Stripe: Dashboard shows payment events
- Email: Check Gmail sent folder

## Production Deployment

### Environment Variables:
```env
# Use production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Production URLs
FRONTEND_URL=https://your-domain.com
```

### Hosting Options:
- **Backend**: Railway, Heroku, DigitalOcean
- **Frontend**: Netlify, Vercel, Cloudflare Pages
- **Webhook**: Must be HTTPS in production

### Database (Optional):
For production, consider adding:
- Story storage (MongoDB/PostgreSQL)
- User analytics
- Payment tracking

## Security Notes
- Never commit `.env` file
- Use environment variables in production
- Validate webhook signatures
- Rate limit API endpoints
- Secure file uploads directory

## Troubleshooting

### Common Issues:

**"Webhook signature verification failed"**
- Check STRIPE_WEBHOOK_SECRET matches dashboard
- Ensure raw body parsing for webhook endpoint

**"Email sending failed"** 
- Verify Gmail app password
- Check EMAIL_USER and EMAIL_PASS
- Ensure "Less secure app access" enabled

**"OpenAI API error"**
- Check OPENAI_API_KEY is valid
- Verify account has credits
- Check rate limits

**"Images not generating"**
- DALL-E 3 requires GPT-4 enabled account
- Check OpenAI billing status
- Review image generation prompts

### Debug Mode:
Add to `.env`:
```env
DEBUG=true
NODE_ENV=development
```

## Support
- Stripe: https://stripe.com/docs
- OpenAI: https://platform.openai.com/docs  
- Nodemailer: https://nodemailer.com/

## License
Private use only. Do not distribute.