#!/bin/bash

# Stripe Webhook Setup Script
# This script helps you set up and start listening for Stripe webhooks locally

echo "🔧 Setting up Stripe webhook listening..."

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed. Please install it first:"
    echo "   npm install -g stripe-cli"
    echo "   or visit: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found. Please create it from .env.example:"
    echo "   cp .env.example .env.local"
    echo "   Then add your Stripe keys to .env.local"
    exit 1
fi

# Check if Stripe keys are configured
if ! grep -q "STRIPE_SECRET_KEY=" .env.local; then
    echo "❌ STRIPE_SECRET_KEY not found in .env.local"
    exit 1
fi

echo "✅ Stripe CLI is installed and configured"
echo ""
echo "🚀 Starting webhook listener..."
echo "   This will forward Stripe events to: http://localhost:3000/api/webhooks/stripe"
echo ""
echo "📝 After starting, Stripe CLI will show you a webhook signing secret."
echo "   Add this to your .env.local as STRIPE_WEBHOOK_SECRET=..."
echo ""
echo "⚠️  Make sure your Next.js app is running in another terminal:"
echo "   npm run dev"
echo ""

# Start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe
