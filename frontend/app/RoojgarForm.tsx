import { Modal } from "react-native";
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
  Alert,
  ImageBackground
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

// Premium Orange / Amber Leather Texture Pattern URL
const LEATHER_BG_URL = "https://www.transparenttextures.com/patterns/leather.png";

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
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Dynamic Categories State
  const [categories, setCategories] = useState([
    { id: "1", name: "Plumber", icon: "🔧" },
    { id: "2", name: "Electrician", icon: "⚡" },
    { id: "3", name: "Carpenter", icon: "🪚" },
    { id: "4", name: "Painter", icon: "🎨" },
    { id: "5", name: "Mason", icon: "🧱" },
    { id: "6", name: "Welder", icon: "🔥" },
    { id: "7", name: "AC Technician", icon: "❄️" },
    { id: "8", name: "Driver", icon: "🚗" },
    { id: "9", name: "Delivery Boy", icon: "🛵" },
    { id: "10", name: "Cook", icon: "👨‍🍳" },
    { id: "11", name: "House Maid", icon: "🧹" },
    { id: "12", name: "Security Guard", icon: "🛡️" },
    { id: "13", name: "Gardener", icon: "🌿" },
    { id: "14", name: "Mechanic", icon: "🛠️" },
    { id: "15", name: "Computer Operator", icon: "💻" },
    { id: "16", name: "Data Entry", icon: "⌨️" },
    { id: "17", name: "Tailor", icon: "🧵" },
    { id: "18", name: "Beautician", icon: "💄" },
    { id: "19", name: "Teacher", icon: "📚" },
    { id: "20", name: "Other", icon: "📋" },
  ]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // App khulte hi Admin Panel (Backend) se Categories mangwana
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roojgar-categories`);
      const data = await response.json();
      
      if (data && data.categories) {
      } else {
        setCategories([
          { id: "1", name: "Plumber", icon: "🔧", color: "#3B82F6" },
          { id: "2", name: "Electrician", icon: "⚡", color: "#F59E0B" },
          { id: "3", name: "Carpenter", icon: "🪚", color: "#10B981" },
          { id: "4", name: "Painter", icon: "🎨", color: "#8B5CF6" },
          { id: "5", name: "Mason", icon: "🧱", color: "#EF4444" },
          { id: "6", name: "Welder", icon: "🔥", color: "#06B6D4" },
          { id: "7", name: "AC Technician", icon: "❄️", color: "#0EA5E9" },
          { id: "8", name: "Driver", icon: "🚗", color: "#F97316" },
          { id: "9", name: "Delivery Boy", icon: "🛵", color: "#22C55E" },
          { id: "10", name: "Cook", icon: "👨‍🍳", color: "#EAB308" },
          { id: "11", name: "House Maid", icon: "🧹", color: "#EC4899" },
          { id: "12", name: "Security Guard", icon: "🛡️", color: "#6366F1" },
          { id: "13", name: "Gardener", icon: "🌿", color: "#16A34A" },
          { id: "14", name: "Mechanic", icon: "🛠️", color: "#78716C" },
          { id: "15", name: "Computer Operator", icon: "💻", color: "#2563EB" },
          { id: "16", name: "Data Entry", icon: "⌨️", color: "#0F766E" },
          { id: "17", name: "Tailor", icon: "🧵", color: "#DB2777" },
          { id: "18", name: "Beautician", icon: "💄", color: "#C026D3" },
          { id: "19", name: "Teacher", icon: "📚", color: "#7C3AED" },
          { id: "20", name: "Other", icon: "📋", color: "#64748B" },
        ]);
      }
    } catch (error) {
      console.log("Category Fetch Error:", error);
      setCategories([
        { id: "1", name: "Plumber", icon: "🔧", color: "#3B82F6" },
        { id: "2", name: "Electrician", icon: "⚡", color: "#F59E0B" },
        { id: "3", name: "Carpenter", icon: "🪚", color: "#10B981" },
        { id: "4", name: "Painter", icon: "🎨", color: "#8B5CF6" },
        { id: "5", name: "Mason", icon: "🧱", color: "#EF4444" },
        { id: "6", name: "Welder", icon: "🔥", color: "#06B6D4" },
        { id: "7", name: "AC Technician", icon: "❄️", color: "#0EA5E9" },
        { id: "8", name: "Driver", icon: "🚗", color: "#F97316" },
        { id: "9", name: "Delivery Boy", icon: "🛵", color: "#22C55E" },
        { id: "10", name: "Cook", icon: "👨‍🍳", color: "#EAB308" },
        { id: "11", name: "House Maid", icon: "🧹", color: "#EC4899" },
        { id: "12", name: "Security Guard", icon: "🛡️", color: "#6366F1" },
        { id: "13", name: "Gardener", icon: "🌿", color: "#16A34A" },
        { id: "14", name: "Mechanic", icon: "🛠️", color: "#78716C" },
        { id: "15", name: "Computer Operator", icon: "💻", color: "#2563EB" },
        { id: "16", name: "Data Entry", icon: "⌨️", color: "#0F766E" },
        { id: "17", name: "Tailor", icon: "🧵", color: "#DB2777" },
        { id: "18", name: "Beautician", icon: "💄", color: "#C026D3" },
        { id: "19", name: "Teacher", icon: "📚", color: "#7C3AED" },
        { id: "20", name: "Other", icon: "📋", color: "#64748B" },
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
    <ImageBackground
      source={{ uri: LEATHER_BG_URL }}
      style={styles.leatherBackground}
      resizeMode="repeat"
    >
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
                  placeholderTextColor="#D97706" 
                  placeholder="Rahul Kumar" 
                  value={name}
                  onChangeText={setName} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholderTextColor="#D97706" 
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
                  placeholderTextColor="#D97706" 
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
                  placeholderTextColor="#D97706" 
                  placeholder="House no, Street, City, Pincode..." 
                  multiline={true} 
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Job Category</Text>

            <TouchableOpacity
              style={styles.categoryDropdownBtn}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={{ color: selectedCategory ? "#FFF8F0" : "#D97706", fontSize: 15, fontWeight: "500" }}>
                {selectedCategory || "Select Job Category"}
              </Text>
            </TouchableOpacity>

            <Modal
              visible={showCategoryModal}
              transparent
              animationType="slide"
            >
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#7C2D12",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                    maxHeight: "70%",
                    borderWidth: 1.5,
                    borderColor: "#F97316",
                  }}
                >
                  <ScrollView>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={{
                          paddingVertical: 15,
                          borderBottomWidth: 1,
                          borderBottomColor: "rgba(251, 146, 60, 0.3)",
                        }}
                        onPress={() => {
                          setSelectedCategory(cat.name);
                          setShowCategoryModal(false);
                        }}
                      >
                        <Text style={{ color: "#FFF8F0", fontSize: 16 }}>
                          {cat.icon} {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    onPress={() => setShowCategoryModal(false)}
                    style={{
                      marginTop: 15,
                      backgroundColor: "#C2410C",
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#FDBA74",
                    }}
                  >
                    <Text style={{ color: "#FFF8F0", fontWeight: "bold" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF8F0" />
              ) : (
                <Text style={styles.submitButtonText}>Apply Now</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  leatherBackground: {
    flex: 1,
    backgroundColor: "#C2410C", // Rich Deep Orange Leather Base Color
  },
  container: { 
    flex: 1, 
  },
  scrollContainer: { 
    padding: 20, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 25,
    marginTop: 10
  },
  backButton: { 
    width: 40,
    height: 40,
    backgroundColor: "#7C2D12",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  backIcon: { 
    color: "#FFF8F0", 
    fontSize: 20,
    fontWeight: "bold",
    marginTop: -2
  },
  headerTitle: { 
    fontSize: 26, 
    color: "#FFF8F0", 
    fontWeight: "800",
    letterSpacing: 0.5
  },
  subText: { 
    color: "#FFEDD5", 
    fontSize: 13,
    marginTop: 4
  },
  formCard: {
    backgroundColor: "#7C2D12", // Dark Burnt Orange / Leather Tile
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#F97316",
    borderStyle: "dashed", // Stitching detail
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  inputGroup: { 
    marginBottom: 18 
  },
  label: { 
    color: "#FFEDD5", 
    fontSize: 12, 
    marginBottom: 8, 
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  input: {
    backgroundColor: "#431407", // Deep Dark Amber Input Background
    color: "#FFF8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#EA580C",
  },
  textArea: { 
    height: 90, 
    textAlignVertical: "top" 
  },
  sectionTitle: { 
    color: "#FFF8F0", 
    fontSize: 18, 
    fontWeight: "700", 
    marginBottom: 12,
    marginLeft: 5
  },
  categoryDropdownBtn: {
    backgroundColor: "#431407",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#EA580C",
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: "#EA580C", // Bright Burnt Orange Button
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: { 
    color: "#FFF8F0", 
    fontSize: 16, 
    fontWeight: "bold",
    letterSpacing: 1
  }
});
