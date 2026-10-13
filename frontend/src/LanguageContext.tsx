import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "en" | "hi";
const LANGUAGE_STORAGE_KEY = "kmtbazaar_language_v1";

const HI: Record<string, string> = {
  "KMT Bazaar Assistant": "KMT Bazaar सहायक",
  "[ Aapka Live Assistant ]": "[ आपका लाइव सहायक ]",
  "Let's get started": "शुरू करें",
  "Choose your language": "अपनी भाषा चुनें",
  "Select your preferred language for the whole website": "पूरी वेबसाइट के लिए अपनी पसंद की भाषा चुनें",
  "Language": "भाषा",
  "Change language": "भाषा बदलें",
  "Select language": "भाषा चुनें",
  "Hindi": "हिन्दी",
  "English": "अंग्रेज़ी",
  "Continue": "जारी रखें",
  "Home": "होम",
  "Categories": "श्रेणियाँ",
  "Cart": "कार्ट",
  "Profile": "प्रोफ़ाइल",
  "AI": "AI सहायक",
  "Search": "खोजें",
  "Search products, stores...": "उत्पाद और दुकानें खोजें...",
  "Search products": "उत्पाद खोजें",
  "Search stores": "दुकानें खोजें",
  "Explore": "खोजें",
  "View All": "सभी देखें",
  "See All": "सभी देखें",
  "All": "सभी",
  "Popular": "लोकप्रिय",
  "Popular Stores": "लोकप्रिय दुकानें",
  "Nearby Stores": "आस-पास की दुकानें",
  "Featured Products": "चुनिंदा उत्पाद",
  "Top Picks": "खास पसंद",
  "Special Offers": "विशेष ऑफ़र",
  "Offers": "ऑफ़र",
  "New Arrivals": "नए उत्पाद",
  "No products in this category": "इस श्रेणी में कोई उत्पाद नहीं है",
  "No products found": "कोई उत्पाद नहीं मिला",
  "No stores found": "कोई दुकान नहीं मिली",
  "Add": "जोड़ें",
  "Add to Cart": "कार्ट में जोड़ें",
  "Add to cart": "कार्ट में जोड़ें",
  "Buy Now": "अभी खरीदें",
  "View Details": "विवरण देखें",
  "My Cart": "मेरा कार्ट",
  "Your cart is empty": "आपका कार्ट खाली है",
  "Add items to get started": "शुरू करने के लिए सामान जोड़ें",
  "Start Shopping": "खरीदारी शुरू करें",
  "Deliver to": "यहाँ डिलीवर करें",
  "Delivering To": "डिलीवरी का पता",
  "Set your delivery location": "अपना डिलीवरी स्थान चुनें",
  "Delivery Address": "डिलीवरी का पता",
  "Saved Addresses": "सेव किए गए पते",
  "Add Address": "पता जोड़ें",
  "Select Address": "पता चुनें",
  "Current Location": "वर्तमान स्थान",
  "Use Current Location": "वर्तमान स्थान इस्तेमाल करें",
  "Bill Details": "बिल का विवरण",
  "Subtotal": "उप-योग",
  "Delivery Fee": "डिलीवरी शुल्क",
  "Delivery Charges": "डिलीवरी शुल्क",
  "Total": "कुल",
  "Grand Total": "कुल राशि",
  "Proceed to Checkout": "चेकआउट करें",
  "Checkout": "चेकआउट",
  "Place Order": "ऑर्डर करें",
  "Confirm Order": "ऑर्डर की पुष्टि करें",
  "Order Now": "अभी ऑर्डर करें",
  "Payment": "भुगतान",
  "Payment Method": "भुगतान का तरीका",
  "Cash on Delivery": "डिलीवरी पर नकद भुगतान",
  "Online Payment": "ऑनलाइन भुगतान",
  "Pay Now": "अभी भुगतान करें",
  "My Orders": "मेरे ऑर्डर",
  "Order History": "ऑर्डर इतिहास",
  "Order Details": "ऑर्डर का विवरण",
  "Order Placed": "ऑर्डर दिया गया",
  "Accepted": "स्वीकार किया गया",
  "Out for Delivery": "डिलीवरी के लिए निकल गया",
  "Delivered": "डिलीवर हो गया",
  "Track Order": "ऑर्डर ट्रैक करें",
  "Cancel Order": "ऑर्डर रद्द करें",
  "Order Activity": "ऑर्डर गतिविधि",
  "New Order Received": "नया ऑर्डर मिला",
  "Order ID": "ऑर्डर आईडी",
  "View Order": "ऑर्डर देखें",
  "Notifications": "सूचनाएँ",
  "Wishlist": "पसंदीदा",
  "Offers & Coupons": "ऑफ़र और कूपन",
  "Help & Support": "मदद और सहायता",
  "Privacy Policy": "गोपनीयता नीति",
  "About KMT Bazaar": "KMT Bazaar के बारे में",
  "Guest": "अतिथि",
  "Logout": "लॉग आउट",
  "Login": "लॉग इन",
  "Login or Sign up": "लॉग इन करें या साइन अप करें",
  "Sign in": "साइन इन करें",
  "Sign up": "साइन अप करें",
  "Create account": "खाता बनाएँ",
  "Don't have an account?": "क्या आपका खाता नहीं है?",
  "Already have an account?": "क्या आपका पहले से खाता है?",
  "Welcome back": "वापसी पर स्वागत है",
  "Email": "ईमेल",
  "Email Address": "ईमेल पता",
  "Mobile Number": "मोबाइल नंबर",
  "Phone Number": "फ़ोन नंबर",
  "Password": "पासवर्ड",
  "Confirm Password": "पासवर्ड की पुष्टि करें",
  "Forgot Password?": "पासवर्ड भूल गए?",
  "Reset Password": "पासवर्ड रीसेट करें",
  "New Password": "नया पासवर्ड",
  "Enter your email": "अपना ईमेल दर्ज करें",
  "Enter your mobile number": "अपना मोबाइल नंबर दर्ज करें",
  "Enter password": "पासवर्ड दर्ज करें",
  "Enter 6-digit OTP": "6 अंकों का OTP दर्ज करें",
  "Send OTP": "OTP भेजें",
  "Send Login OTP": "लॉगिन OTP भेजें",
  "Verify OTP": "OTP सत्यापित करें",
  "Verify & Login": "सत्यापित करें और लॉग इन करें",
  "Resend OTP": "OTP फिर से भेजें",
  "Back": "वापस",
  "Back to password": "पासवर्ड पर वापस जाएँ",
  "Loading...": "लोड हो रहा है...",
  "Please wait...": "कृपया प्रतीक्षा करें...",
  "Save": "सेव करें",
  "Cancel": "रद्द करें",
  "Close": "बंद करें",
  "Done": "हो गया",
  "Edit": "बदलें",
  "Delete": "हटाएँ",
  "Update": "अपडेट करें",
  "Refresh": "रिफ़्रेश करें",
  "Retry": "फिर कोशिश करें",
  "Submit": "जमा करें",
  "Next": "आगे",
  "Previous": "पिछला",
  "Name": "नाम",
  "Full Name": "पूरा नाम",
  "Address": "पता",
  "City": "शहर",
  "State": "राज्य",
  "Pincode": "पिनकोड",
  "Apply": "लागू करें",
  "Apply Coupon": "कूपन लागू करें",
  "Remove": "हटाएँ",
  "Available": "उपलब्ध",
  "Unavailable": "उपलब्ध नहीं",
  "In Stock": "स्टॉक में",
  "Out of Stock": "स्टॉक में नहीं",
  "Quantity": "मात्रा",
  "Price": "कीमत",
  "Description": "विवरण",
  "Details": "विवरण",
  "Reviews": "समीक्षाएँ",
  "Rating": "रेटिंग",
  "Sort by": "क्रम से दिखाएँ",
  "Filter": "फ़िल्टर",
  "Clear": "हटाएँ",
  "Clear All": "सब हटाएँ",
  "No items found": "कोई सामान नहीं मिला",
  "Something went wrong": "कुछ गलत हो गया",
  "Please try again": "कृपया फिर कोशिश करें",
  "Permission Required": "अनुमति आवश्यक है",
  "Success": "सफल",
  "Error": "त्रुटि",
  "Need Help?": "मदद चाहिए?",
  "Your marketplace at a glance": "आपके बाज़ार की एक झलक",
  "Quick Actions": "त्वरित काम",
  "Dashboard Live": "डैशबोर्ड लाइव",
  "Manage your marketplace": "अपने बाज़ार को मैनेज करें",
  "View details": "विवरण देखें",
  "Admin Console": "एडमिन कंसोल",
  "Vendor Dashboard": "वेंडर डैशबोर्ड",
  "My Stores": "मेरी दुकानें",
  "Create Store": "दुकान बनाएँ",
  "Create New Store": "नई दुकान बनाएँ",
  "Store Banner": "दुकान बैनर",
  "Upload Store Banner": "दुकान का बैनर अपलोड करें",
  "Shop Category": "दुकान की श्रेणी",
  "Products": "उत्पाद",
  "Stores": "दुकानें",
  "Orders": "ऑर्डर",
  "Customers": "ग्राहक",
  "Users": "यूज़र",
  "Vendors": "वेंडर",
  "Service Vendors": "सर्विस वेंडर",
  "Services": "सेवाएँ",
  "Earnings": "कमाई",
  "Commission": "कमीशन",
  "Settings": "सेटिंग्स",
  "Quick Actions": "त्वरित काम",
  "Store Approvals": "दुकान की मंज़ूरी",
  "Tap to review & accept orders": "ऑर्डर देखने और स्वीकार करने के लिए टैप करें",
  "Orders · Last 7 days": "ऑर्डर · पिछले 7 दिन",
  "You don't have a store yet.": "अभी आपकी कोई दुकान नहीं है।",
  "Click the + icon above to create your first store.": "पहली दुकान बनाने के लिए ऊपर + आइकन दबाएँ।",
  "A customer order is waiting for your decision.": "एक ग्राहक का ऑर्डर आपके निर्णय की प्रतीक्षा में है।",
  "New Pickup Available": "नई पिकअप उपलब्ध है",
  "Go online to start accepting orders": "ऑर्डर स्वीकार करने के लिए ऑनलाइन हों",
  "Customer delivery location": "ग्राहक का डिलीवरी स्थान",
  "Open in Google Maps": "Google Maps में खोलें",
  "Mark Delivered": "डिलीवर हो गया चिह्नित करें",
  "Your cart is empty.": "आपका कार्ट खाली है।",
  "No orders yet": "अभी कोई ऑर्डर नहीं है",
  "No notifications yet": "अभी कोई सूचना नहीं है",
  "Notifications will appear here": "सूचनाएँ यहाँ दिखाई देंगी",
  "This feature will be available soon.": "यह सुविधा जल्द उपलब्ध होगी।",
  "Photo permission is required to update avatar.": "प्रोफ़ाइल फ़ोटो बदलने के लिए फ़ोटो की अनुमति आवश्यक है।",
  "Profile picture updated successfully!": "प्रोफ़ाइल फ़ोटो सफलतापूर्वक अपडेट हुई!",
  "Failed to update": "अपडेट नहीं हो सका",
  "Failed to upload image": "तस्वीर अपलोड नहीं हो सकी",
  "Enter a valid email address": "सही ईमेल पता दर्ज करें",
  "Enter a valid 10-digit mobile number": "सही 10 अंकों का मोबाइल नंबर दर्ज करें",
  "Could not check account": "खाते की जाँच नहीं हो सकी",
  "Google sign-in failed": "Google साइन-इन विफल हुआ",
  "Go Back": "वापस जाएँ",
  "Your exact delivery GPS is used for delivery and is not shown to other customers.": "आपका सही डिलीवरी GPS सिर्फ डिलीवरी के लिए इस्तेमाल होता है और दूसरे ग्राहकों को नहीं दिखता।",
  "Delivered by KMT Bazaar in 30–45 mins": "KMT Bazaar द्वारा 30–45 मिनट में डिलीवरी",
  "Last updated: September 2026": "अंतिम अपडेट: सितंबर 2026",
};
type LanguageContextValue = {
  language: AppLanguage;
  hasSelectedLanguage: boolean;
  isLanguageReady: boolean;
  selectLanguage: (language: AppLanguage) => Promise<void>;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function translateUiText(text: string, language: AppLanguage): string {
  if (language !== "hi") return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  const translated = HI[normalized];
  if (!translated) return text;
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  return leading + translated + trailing;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved === "en" || saved === "hi") {
          setLanguage(saved);
          setHasSelectedLanguage(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setIsLanguageReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setHasSelectedLanguage(true);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Keep the current selection for this session even if storage is unavailable.
    }
  }, []);

  const t = useCallback((text: string) => translateUiText(text, language), [language]);
  const value = useMemo(
    () => ({ language, hasSelectedLanguage, isLanguageReady, selectLanguage, t }),
    [language, hasSelectedLanguage, isLanguageReady, selectLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
