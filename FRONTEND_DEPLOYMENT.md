# 🚀 Frontend-Only AI Storybook Deployment Guide

This is a complete frontend-only version that can be deployed to any static hosting service.

## 📁 Files Needed for Deployment

Copy these files to your hosting service:

```
📁 Your Website Root/
├── index.html           # Main application
├── style.css           # Styles (existing)
├── config.js           # API configuration 
├── frontend-api.js     # Frontend API client
├── frontend-script.js  # Frontend logic
└── success.html        # Success page (optional for Stripe)
```

## ⚙️ Configuration

### 1. Edit `config.js` with your API keys:

```javascript
window.ENV = {
    // OpenAI Configuration (Required)
    OPENAI_API_KEY: 'sk-your-actual-openai-key-here',
    
    // Stripe Configuration (Optional - for payments)
    STRIPE_PUBLISHABLE_KEY: 'pk_live_your-stripe-key-here',
    
    // EmailJS Configuration (Optional - for email delivery)
    EMAILJS_SERVICE_ID: 'your_emailjs_service_id',
    EMAILJS_TEMPLATE_ID: 'your_emailjs_template_id', 
    EMAILJS_USER_ID: 'your_emailjs_public_key',
    
    // Set to false for production
    DEVELOPMENT_MODE: false
};
```

## 🔑 API Keys Setup

### OpenAI (Required)
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy the key starting with `sk-...`
4. Add to `config.js` as `OPENAI_API_KEY`

**⚠️ Cost:** ~$0.50-2.00 per story (depending on length and images)

### Stripe (Optional - for payments)
1. Go to https://dashboard.stripe.com/apikeys
2. Get your publishable key starting with `pk_live_...` (production)
3. Add to `config.js` as `STRIPE_PUBLISHABLE_KEY`
4. Set up webhook endpoint (see below)

### EmailJS (Optional - for email delivery)
1. Go to https://www.emailjs.com/
2. Create account and email service
3. Get Service ID, Template ID, and Public Key
4. Add to `config.js`

## 🌐 Deployment Options

### Option 1: Netlify (Recommended)
1. **Drag & Drop**: Zip your files and drop on netlify.com/drop
2. **Git**: Connect your GitHub repo to Netlify
3. **Domain**: Get free `.netlify.app` subdomain or use custom domain

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project folder
3. Follow prompts for deployment

### Option 3: GitHub Pages
1. Push files to GitHub repository
2. Go to Settings → Pages
3. Select source branch
4. Access at `username.github.io/repo-name`

### Option 4: Any Web Host
- Upload files to any web hosting service
- Works with shared hosting, VPS, CDN, etc.

## 🎯 How It Works

### Development Mode (Default)
- No payment required
- Stories generated for free using your OpenAI API key
- Perfect for testing and demos
- Shows development notice to users

### Production Mode
- Set `DEVELOPMENT_MODE: false` in config.js
- Requires Stripe configuration
- €4.99 payment before story generation
- Professional user experience

### Features Working Frontend-Only:
✅ **Story Generation** - Direct OpenAI API calls  
✅ **AI Images** - DALL-E 3 illustrations  
✅ **PDF Creation** - Client-side with jsPDF  
✅ **Email Delivery** - Using EmailJS  
✅ **Payment Processing** - Stripe Checkout  
✅ **Demo Stories** - Built-in examples  

## 🔒 Security Considerations

### API Key Exposure
- ⚠️ OpenAI API key is visible to users (client-side)
- 🛡️ Use API key restrictions in OpenAI dashboard
- 💡 Consider usage monitoring and limits

### Recommended OpenAI Settings:
- Set usage limits (e.g., $10/month)
- Restrict to specific endpoints only
- Monitor usage regularly

## 💰 Cost Estimation

### Per Story Generated:
- **OpenAI GPT-4**: ~$0.05-0.15 (story text)
- **DALL-E 3**: ~$0.40-0.60 (4-7 images)
- **Total**: ~$0.50-2.00 per story

### Revenue Model:
- **Charge**: €4.99 per story
- **Cost**: ~$0.50-2.00 per story
- **Profit**: ~€2.50-4.50 per story

## 📧 EmailJS Template Setup

Create an EmailJS template with these variables:
- `{{to_email}}` - Recipient email
- `{{child_name}}` - Child's name
- `{{story_title}}` - Story title
- `{{message}}` - Email message
- `{{pdf_attachment}}` - PDF file (base64)

## 🎨 Customization

### Branding
- Update colors in `style.css`
- Change logo and text in `index.html`
- Modify footer information

### Pricing
- Change price in form display
- Update Stripe amount (in cents)
- Modify payment descriptions

### Languages
- Currently in Swedish
- Translate text in HTML and JS files
- Update OpenAI prompts for other languages

## 🚀 Go Live Checklist

### Before Deployment:
- [ ] Configure all API keys in `config.js`
- [ ] Set `DEVELOPMENT_MODE: false`
- [ ] Test story generation locally
- [ ] Test payment flow (Stripe test mode)
- [ ] Test email delivery (EmailJS)
- [ ] Update branding/copy as needed

### After Deployment:
- [ ] Test full user journey
- [ ] Set up domain (if using custom)
- [ ] Configure SSL (usually automatic)
- [ ] Set up monitoring (optional)
- [ ] Share with users! 🎉

## 💡 Pro Tips

1. **Start with Development Mode** - Test everything before enabling payments
2. **Monitor Costs** - Set OpenAI usage limits to avoid surprises
3. **User Communication** - Clearly explain the 3-5 minute generation time
4. **Email Deliverability** - Test with different email providers
5. **Mobile Friendly** - Already responsive, but test on devices

## 🆘 Troubleshooting

### "OpenAI API error"
- Check API key is correct and active
- Verify billing is set up in OpenAI account
- Check usage limits aren't exceeded

### "Stripe error" 
- Verify publishable key is correct
- Check if Stripe account is activated
- Test with Stripe test keys first

### "Email not received"
- Check spam/junk folders
- Verify EmailJS configuration
- Test email template separately

### "Images not generating"
- DALL-E 3 requires credits in OpenAI account
- Check if API key has image generation permissions
- Images may take 30-60 seconds each

---

## 🎉 You're Ready!

Your AI Storybook Creator is now ready for deployment! This frontend-only version gives you complete control and can be hosted anywhere for maximum flexibility.

**Need help?** Check the console logs in browser developer tools for detailed error messages.