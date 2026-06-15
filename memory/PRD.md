# KMT Bazaar - Product Requirements

## Overview
Multi-vendor ecommerce mobile marketplace (React Native / Expo + FastAPI + MongoDB). Inspired by Amazon, Flipkart, Blinkit. Brand: Royal Blue (#2563EB) + Vibrant Orange (#F97316) derived from logo.

## Phase 1 (DONE) — Customer App MVP
- Animated splash with logo reveal (Reanimated)
- Email/password auth + Mock OTP (any 6-digit) + multi-role JWT
- Bottom tab navigation (Home, Categories, Cart, Profile) with iOS glassmorphism
- Home: location selector, search, banner carousel, category grid, nearby stores, trending products
- Categories: side-rail navigation + product grid
- Product detail: image, price/discount, qty stepper, add-to-cart with toast + haptics
- Cart: items, qty controls, bill summary, sticky checkout CTA, animated badge
- Checkout: address selection + add-new form, COD / Online (mock) payment, place order
- Orders: list + detail with 4-stage tracker (Pending → Accepted → Out for Delivery → Delivered)
- Notifications: bell icon, badge, list with read/unread state
- Profile: avatar, role pill, navigation list, logout
- Role landing for Vendor / Delivery / Admin (Phase 2 placeholder dashboard)
- Seeded DB: 5 categories, 4 stores, 15 products, 3 banners, demo users for each role

## Phase 2 (Pending)
- Full Vendor panel (store management, products CRUD, orders received, earnings)
- Full Delivery panel (online toggle, accept orders, status updates, earnings)
- Full Admin console (users/vendors/delivery/products/banners/commission)
- Real Razorpay payments (when keys provided)
- Real OTP via Twilio / MSG91 (when keys provided)
- Google Maps + FCM push (when configs provided)

## Tech
- Frontend: Expo SDK 54, expo-router, react-native-reanimated, expo-image, expo-linear-gradient, expo-haptics, expo-blur
- Backend: FastAPI, motor (async MongoDB), JWT, passlib/bcrypt
- Database: MongoDB (UUID ids, never ObjectId in responses)
