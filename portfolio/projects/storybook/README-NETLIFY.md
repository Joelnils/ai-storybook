# AI Storybook Creator - Netlify Deployment Guide

## 🌟 Overview

Complete AI-powered children's storybook creator with Netlify Functions. Users can create personalized Swedish stories with AI-generated illustrations for €4.99.

## ✨ Features

- **Personalized Stories**: AI creates unique stories with the child as the main character
- **AI Illustrations**: DALL-E generates beautiful illustrations for each story page
- **Stripe Payment**: Secure €4.99 payment processing
- **PDF Generation**: Browser-based PDF creation with jsPDF
- **Email Delivery**: Stories sent as PDF attachments (via EmailJS)
- **Swedish Interface**: Fully localized in Swedish
- **Mobile Responsive**: Works on all devices
- **Demo Stories**: Free sample stories for users to try

## 🏗️ Architecture

### Frontend
- **HTML/CSS/JavaScript** - No frameworks, pure vanilla JS
- **Netlify Functions** - Serverless backend for API calls
- **jsPDF** - Client-side PDF generation
- **EmailJS** - Email delivery service

### Netlify Functions
1. `create-checkout.js` - Stripe payment session creation
2. `generate-story.js` - OpenAI GPT-4 story generation
3. `generate-complete-story.js` - Combined story + image generation
4. `generate-images.js` - OpenAI DALL-E image generation

## 🚀 Deployment Instructions

### 1. Prerequisites
- Netlify account
- OpenAI API key
- Stripe account (test/live keys)
- EmailJS account (optional for email delivery)

### 2. Deploy to Netlify

#### Option A: Direct Deploy
1. Fork/clone this repository
2. Connect to Netlify via Git
3. Set build settings:
   ```
   Build command: (leave empty)
   Publish directory: .
   Functions directory: netlify/functions
   ```

#### Option B: Deploy Button
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-repo-url)

### 3. Environment Variables

Set these in Netlify Dashboard > Site settings > Environment variables:

```bash
# Required
OPENAI_API_KEY=sk-proj-your-openai-key-here
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here

# Optional (for webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Automatically set by Netlify
URL=https://your-site.netlify.app
NODE_VERSION=18
```

### 4. Configure Services

#### OpenAI Setup
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Ensure you have credits/billing set up
3. Test with GPT-4 and DALL-E-3 access

#### Stripe Setup
1. Get keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Use test keys for development
3. Set up webhook endpoint: `https://your-site.netlify.app/.netlify/functions/webhook`
4. Configure webhook to send `checkout.session.completed` events

#### EmailJS Setup (Optional)
1. Create account at [EmailJS](https://www.emailjs.com/)
2. Set up email service (Gmail recommended)
3. Update frontend code with your EmailJS credentials

## 🧪 Testing

### Local Development
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Install dependencies
npm install

# Run locally
netlify dev
```

### Test Payment Flow
1. Use Stripe test cards: `4242 4242 4242 4242`
2. Test complete user journey from form to PDF delivery
3. Verify all Netlify Functions work correctly

## 📁 File Structure

```
├── index.html              # Main application page
├── success.html             # Payment success page  
├── style.css               # Styles and responsive design
├── netlify-api.js          # API client for Netlify Functions
├── netlify-script.js       # Main frontend JavaScript
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies
├── .env.example            # Environment variables template
├── netlify/
│   └── functions/
│       ├── create-checkout.js      # Stripe payment sessions
│       ├── generate-story.js       # GPT-4 story generation
│       ├── generate-complete-story.js # Combined generation
│       └── generate-images.js      # DALL-E image generation
└── README-NETLIFY.md       # This file
```

## 🔧 Configuration

### Story Generation Settings
- **Language**: Swedish
- **Story Length**: 6 paragraphs + 6 images
- **Age Groups**: 3-5, 6-8, 9-12 years
- **Themes**: Adventure, Princess, Animals, Space, Underwater, Friendship

### Payment Settings
- **Price**: €4.99
- **Currency**: EUR
- **Payment Methods**: Card payments via Stripe

### Performance
- **Function Timeout**: 10 seconds (Netlify default)
- **Image Generation**: ~2-3 minutes for complete story
- **PDF Size**: ~2-5MB depending on images

## 🐛 Troubleshooting

### Common Issues

#### Function Timeouts
- DALL-E image generation can be slow
- Consider implementing queue system for production
- Show proper loading indicators to users

#### CORS Errors
- Netlify Functions handle CORS automatically
- Ensure all functions return proper headers

#### Payment Issues
- Verify Stripe keys are correctly set
- Check webhook endpoint is receiving events
- Test with Stripe's test cards

### Debug Mode
Add `?debug=true` to URL for additional console logging.

## 📈 Optimization

### Performance Tips
1. **Image Optimization**: DALL-E images are large - consider compression
2. **Caching**: Implement caching for demo stories
3. **Queue System**: For high traffic, implement background job processing
4. **Error Handling**: Robust error handling for API failures

### Cost Management
- Monitor OpenAI API usage (GPT-4 + DALL-E costs)
- Set up billing alerts
- Consider rate limiting for abuse prevention

## 🔒 Security

### Best Practices
- ✅ API keys stored as environment variables
- ✅ CORS properly configured
- ✅ Input validation on all forms
- ✅ Stripe handles PCI compliance
- ✅ No sensitive data in client-side code

### Production Checklist
- [ ] Use Stripe live keys
- [ ] Set up proper webhook endpoints
- [ ] Configure custom domain
- [ ] Set up monitoring and alerts
- [ ] Test payment flow end-to-end
- [ ] Verify email delivery works

## 🎯 Success Metrics

Track these KPIs:
- Conversion rate (form submission to payment)
- Story generation success rate
- Average generation time
- User satisfaction (email feedback)
- Payment completion rate

## 🆘 Support

For deployment issues:
1. Check Netlify Function logs
2. Verify all environment variables are set
3. Test API keys independently
4. Check Stripe webhook delivery

---

**Ready for deployment! 🚀**

This setup provides a complete, production-ready AI storybook creator that scales automatically with Netlify Functions.