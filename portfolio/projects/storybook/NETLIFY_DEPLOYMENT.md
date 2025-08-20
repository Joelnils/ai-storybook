# 🚀 Netlify Deployment Guide

This guide shows how to deploy the AI Storybook Creator to Netlify with serverless functions.

## 📁 Files Required for Deployment

Your project structure should be:
```
📁 Your Project/
├── index.html
├── style.css
├── config.js
├── frontend-api.js
├── frontend-script.js
├── success.html
├── netlify.toml
└── 📁 netlify/
    └── 📁 functions/
        ├── generate-story.js
        └── generate-images.js
```

## 🌐 Deploy to Netlify

### Option 1: Drag & Drop (Quickest)

1. **Zip your project files**
   - Select all files (including `netlify` folder)
   - Create a zip file

2. **Drop on Netlify**
   - Go to https://netlify.com
   - Drag the zip file to "Want to deploy a new site without connecting to Git?"
   - Your site will be deployed instantly!

### Option 2: Git Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Netlify Functions for AI Storybook"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to https://netlify.com/sites
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: (leave empty or set to ".")

## 🔑 Configure Environment Variables

1. **In Netlify Dashboard**
   - Go to Site settings → Environment variables
   - Add these variables:

   ```
   OPENAI_API_KEY = sk-your-openai-api-key-here
   ```

2. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create new API key
   - Copy the key starting with `sk-...`

## ⚙️ Update Frontend Configuration

Update your `config.js` file:

```javascript
window.ENV = {
    // Remove OpenAI key from frontend (it's now in Netlify environment)
    OPENAI_API_KEY: '', // Leave empty - handled by serverless functions
    
    // Stripe Configuration (Optional)
    STRIPE_PUBLISHABLE_KEY: 'pk_live_your-stripe-key-here',
    
    // EmailJS Configuration (Optional)
    EMAILJS_SERVICE_ID: 'your_emailjs_service_id',
    EMAILJS_TEMPLATE_ID: 'your_emailjs_template_id',
    EMAILJS_USER_ID: 'your_emailjs_public_key',
    
    // Set to false for production
    DEVELOPMENT_MODE: false
};
```

## 🧪 Test Your Deployment

1. **Visit your Netlify URL**
   - Example: `https://magical-unicorn-123456.netlify.app`

2. **Test story generation**
   - Fill out the story form
   - Submit and wait for AI generation
   - Check that images are generated
   - Test PDF download

## 🔧 Troubleshooting

### Functions not working?
- Check Netlify Functions logs in your dashboard
- Ensure `OPENAI_API_KEY` environment variable is set
- Verify the `netlify.toml` file is in project root

### API errors?
- Check OpenAI API key is valid and has credits
- Look at function logs for detailed error messages

### CORS errors?
- The serverless functions handle CORS automatically
- Make sure you're using the deployed URL, not localhost

## 💰 Cost Considerations

### Netlify Costs
- **Free tier**: 100GB bandwidth, 300 build minutes/month
- **Functions**: 125k requests/month free
- Perfect for small to medium traffic

### OpenAI Costs  
- **Story generation**: ~$0.05-0.15 per story (GPT-4)
- **Image generation**: ~$0.40-0.60 per story (DALL-E 3, 4-7 images)
- **Total**: ~$0.50-2.00 per story

## 🎉 You're Live!

Your AI Storybook Creator is now running on Netlify with:
- ✅ Serverless OpenAI API calls (no CORS issues)
- ✅ Automatic scaling
- ✅ HTTPS security
- ✅ Global CDN distribution
- ✅ Custom domain support

**Example sites:**
- Production: `https://your-custom-domain.com`
- Netlify: `https://your-site-name.netlify.app`

## 🔄 Updates

To update your site:
1. Make changes to your code
2. Push to GitHub (if using Git integration)
3. Or drag & drop new zip file to Netlify
4. Site rebuilds automatically!

---

**Need help?** Check the Netlify Functions documentation or contact support.