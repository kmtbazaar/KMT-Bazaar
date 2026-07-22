import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

// Backend URL (Isko apne live server.py URL se change kariyega)
const API_BASE_URL = "http://192.168.1.5:5000/api"; 

export default function RoojgarForm() {
  const navigation = useNavigation();
  
  // 1. Data store karne ke liye States banaye
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Dynamic Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App khulte hi Admin Panel (Backend) se Categories mangwana
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roojgar-categories`);
      const data = await response.json();
      
      if (data && data.categories) {
        setCategories(data.categories);
      } else {
        setCategories([
          { id: "1", name: "Delivery", icon: "🛵", color: "#F59E0B" },
          { id: "2", name: "Retail/Shop", icon: "🏪", color: "#10B981" },
        ]);
      }
    } catch (error) {
      console.log("Category Fetch Error:", error);
      setCategories([
        { id: "1", name: "Delivery", icon: "🛵", color: "#F59E0B" },
        { id: "2", name: "Retail/Shop", icon: "🏪", color: "#10B981" },
        { id: "3", name: "Tech/IT", icon: "💻", color: "#3B82F6" },
        { id: "4", name: "Labor/Work", icon: "🏗️", color: "#8B5CF6" },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. Form Submit karke Data Backend par bhejna
  const handleSubmit = async () => {
    if (!name.trim() || !mobile.trim() || !aadhar.trim() || !address.trim() || !selectedCategory) {
      Alert.alert("Error", "Kripya saari details aur category select karein!");
      return; 
    }

    if (mobile.length < 10) {
      Alert.alert("Error", "Kripya sahi 10-digit Mobile Number dalein!");
      return;
    }

    if (aadhar.length < 12) {
      Alert.alert("Error", "Kripya sahi 12-digit Aadhar Number dalein!");
      return;
    }

    setIsSubmitting(true);

    const formData = {
      name,
      mobile,
      aadhar,
      address,
      category: selectedCategory,
      appliedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/submit-roojgar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success!", "Aapki application KMT Bazaar Admin ko bhej di gayi hai.");
        setName(""); setMobile(""); setAadhar(""); setAddress(""); setSelectedCategory("");
        navigation.goBack();
      } else {
        Alert.alert("Error", result.message || "Submit karne mein problem aayi.");
      }
    } catch (error) {
      console.log("Submit Error:", error);
      Alert.alert("Error", "Server se connect nahi ho paya. Kripya thodi der baad try karein.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Roojgar Form</Text>
              <Text style={styles.subText}>KMT Bazaar par apni nayi shuruwat karein</Text>
            </View>
          </View>

          {/* Form Fields Card */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                placeholderTextColor="#64748B" 
                placeholder="Rahul Kumar" 
                value={name}
                onChangeText={setName} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput 
                style={styles.input} 
                placeholderTextColor="#64748B" 
                placeholder="10-digit number" 
                keyboardType="phone-pad" 
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Aadhar Number</Text>
              <TextInput 
                style={styles.input} 
                placeholderTextColor="#64748B" 
                placeholder="12-digit Aadhar No." 
                keyboardType="numeric" 
                maxLength={12}
                value={aadhar}
                onChangeText={setAadhar}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Complete Address</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholderTextColor="#64748B" 
                placeholder="House no, Street, City, Pincode..." 
                multiline={true} 
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Dynamic Category Selection */}
          <Text style={styles.sectionTitle}>Job Category</Text>
          
          {loadingCategories ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.categoryContainer}>
              {categories.map((cat, index) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id || index}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryBox,
                      isSelected && { borderColor: cat.color || "#3B82F6", backgroundColor: `${cat.color || "#3B82F6"}15` } 
                    ]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryText, isSelected && { color: cat.color || "#3B82F6", fontWeight: "bold" }]}>
                      {cat.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.activeIndicator, { backgroundColor: cat.color || "#3B82F6" }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#0F172A"
  },
  scrollContainer: { 
    padding: 20, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 30,
    marginTop: 10
  },
  backButton: { 
    width: 40,
    height: 40,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  backIcon: { 
    color: "#F8FAFC", 
    fontSize: 20,
    fontWeight: "bold",
    marginTop: -2
  },
  headerTitle: { 
    fontSize: 26, 
    color: "#F8FAFC", 
    fontWeight: "800",
    letterSpacing: 0.5
  },
  subText: { 
    color: "#94A3B8", 
    fontSize: 13,
    marginTop: 4
  },
  formCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  inputGroup: { 
    marginBottom: 18 
  },
  label: { 
    color: "#CBD5E1", 
    fontSize: 13, 
    marginBottom: 8, 
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  textArea: { 
    height: 90, 
    textAlignVertical: "top" 
  },
  sectionTitle: { 
    color: "#F8FAFC", 
    fontSize: 18, 
    fontWeight: "700", 
    marginBottom: 15,
    marginLeft: 5
  },
  categoryContainer: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between" 
  },
  categoryBox: {
    width: "48%",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: "#334155",
    position: "relative",
    overflow: "hidden"
  },
  categoryIcon: { 
    fontSize: 32, 
    marginBottom: 8 
  },
  categoryText: { 
    color: "#CBD5E1", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomLeftRadius: 16,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "bold",
    letterSpacing: 1
  }
});