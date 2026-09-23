import { Modal } from "react-native";
import React, { useState, useEffect, useRef } from "react";
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
  ImageBackground,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const LEATHER_BG_URL =
  "https://www.transparenttextures.com/patterns/white-diamond-dark.png";

const API_BASE_URL = "https://kmtbazaar.tech/api";

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Plumber", icon: "🔧" },
  { id: "2", name: "Electrician", icon: "⚡" },
  { id: "3", name: "Carpenter", icon: "🪚" },
  { id: "4", name: "Painter", icon: "🎨" },
  { id: "5", name: "RajMistri", icon: "🧱" },
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
];

export default function RoojgarForm() {
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [address, setAddress] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success screen
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/roojgar-categories`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (
        data &&
        Array.isArray(data.categories) &&
        data.categories.length > 0
      ) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.log("Category Fetch Error:", error);

      // Default categories already available
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !name.trim() ||
      !mobile.trim() ||
      !aadhar.trim() ||
      !address.trim() ||
      !selectedCategory
    ) {
      Alert.alert(
        "Error",
        "Kripya saari details aur category select karein!"
      );
      return;
    }

    if (mobile.length !== 10) {
      Alert.alert(
        "Error",
        "Kripya sahi 10-digit Mobile Number dalein!"
      );
      return;
    }

    if (aadhar.length !== 12) {
      Alert.alert(
        "Error",
        "Kripya sahi 12-digit Aadhar Number dalein!"
      );
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const formData = {
      name: name.trim(),
      mobile: mobile.trim(),
      aadhar: aadhar.trim(),
      address: address.trim(),
      category: selectedCategory,
      appliedAt: new Date().toISOString(),
    };

    try {
      console.log(
        "Submitting Roojgar application to:",
        `${API_BASE_URL}/submit-roojgar`
      );

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 30000);

      const response = await fetch(
        `${API_BASE_URL}/submit-roojgar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const responseText = await response.text();

      let result: any = null;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        result = null;
      }

      console.log(
        "Roojgar submit response:",
        response.status,
        result
      );

      if (!response.ok) {
        const errorMessage =
          result?.detail ||
          result?.message ||
          "Application submit nahi ho payi.";

        throw new Error(errorMessage);
      }

      // IMPORTANT:
      // Backend ne successful response diya.
      // Ab form ko success screen par switch karenge.
      setName("");
      setMobile("");
      setAadhar("");
      setAddress("");
      setSelectedCategory("");

      setSubmissionSuccess(true);
    } catch (error: any) {
      console.log("Roojgar Submit Error:", error);

      if (error?.name === "AbortError") {
        Alert.alert(
          "Server Timeout",
          "Server response nahi de raha hai. Kripya thodi der baad dobara try karein."
        );
      } else {
        Alert.alert(
          "Submit Failed",
          error?.message ||
            "Server se connect nahi ho paya. Kripya thodi der baad try karein."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // SUCCESS SCREEN
  // ============================================================

  if (submissionSuccess) {
    return (
      <ImageBackground
        source={{ uri: LEATHER_BG_URL }}
        style={styles.leatherBackground}
        resizeMode="repeat"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.successContainer}>
            <View style={styles.successCard}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIcon}>✓</Text>
              </View>

              <Text style={styles.successTitle}>
                Application Submitted Successfully
              </Text>

              <Text style={styles.successHindi}>
                आपकी रोज़गार application सफलतापूर्वक submit हो गई है।
              </Text>

              <View style={styles.executiveBox}>
                <Text style={styles.executiveTitle}>
                  Our executive will call you within 24 hours.
                </Text>

                <Text style={styles.executiveText}>
                  हमारी टीम आपकी application verify करेगी और
                  आपको आगे की जानकारी के लिए contact करेगी।
                </Text>
              </View>

              <TouchableOpacity
                style={styles.successButton}
                activeOpacity={0.85}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.successButtonText}>
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ============================================================
  // ROOJGAR FORM
  // ============================================================

  return (
    <ImageBackground
      source={{ uri: LEATHER_BG_URL }}
      style={styles.leatherBackground}
      resizeMode="repeat"
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios" ? "padding" : undefined
          }
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View>
                  <Text style={styles.headerTitle}>
                    Roojgar Form
                  </Text>

                  <Text style={styles.subText}>
                    KMT Bazaar par apni nayi shuruwat karein
                  </Text>
                </View>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Full Name
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    placeholder="Rahul Kumar"
                    value={name}
                    onChangeText={setName}
                    editable={!isSubmitting}
                  />
                </View>

                {/* Mobile */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Mobile Number
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={(text) =>
                      setMobile(
                        text.replace(/[^0-9]/g, "")
                      )
                    }
                    editable={!isSubmitting}
                  />
                </View>

                {/* Aadhaar */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Aadhar Number
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    placeholder="12-digit Aadhar No."
                    keyboardType="numeric"
                    maxLength={12}
                    value={aadhar}
                    onChangeText={(text) =>
                      setAadhar(
                        text.replace(/[^0-9]/g, "")
                      )
                    }
                    editable={!isSubmitting}
                  />
                </View>

                {/* Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Complete Address
                  </Text>

                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                    ]}
                    placeholderTextColor="#94A3B8"
                    placeholder="House no, Street, City, Pincode..."
                    multiline
                    numberOfLines={3}
                    value={address}
                    onChangeText={setAddress}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              {/* Category */}
              <Text style={styles.sectionTitle}>
                Job Category
              </Text>

              <TouchableOpacity
                style={styles.categoryDropdownBtn}
                onPress={() =>
                  setShowCategoryModal(true)
                }
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text
                  style={{
                    color: selectedCategory
                      ? "#0F172A"
                      : "#94A3B8",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {selectedCategory ||
                    "Select Job Category"}
                </Text>

                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 14,
                  }}
                >
                  ▼
                </Text>
              </TouchableOpacity>

              {/* Category Modal */}
              <Modal
                visible={showCategoryModal}
                transparent
                animationType="fade"
                onRequestClose={() =>
                  setShowCategoryModal(false)
                }
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor:
                      "rgba(15, 23, 42, 0.5)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      padding: 20,
                      maxHeight: "70%",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      shadowColor: "#000",
                      shadowOffset: {
                        width: 0,
                        height: -4,
                      },
                      shadowOpacity: 0.15,
                      shadowRadius: 10,
                      elevation: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        backgroundColor: "#CBD5E1",
                        borderRadius: 2,
                        alignSelf: "center",
                        marginBottom: 15,
                      }}
                    />

                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#0F172A",
                        marginBottom: 10,
                      }}
                    >
                      Select Category
                    </Text>

                    {loadingCategories ? (
                      <View
                        style={{
                          padding: 30,
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator
                          size="small"
                          color="#0F172A"
                        />

                        <Text
                          style={{
                            marginTop: 10,
                            color: "#64748B",
                          }}
                        >
                          Loading categories...
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                      >
                        {categories.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={{
                              paddingVertical: 14,
                              paddingHorizontal: 12,
                              borderRadius: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              borderBottomWidth: 1,
                              borderBottomColor:
                                "#F1F5F9",
                            }}
                            onPress={() => {
                              setSelectedCategory(
                                cat.name
                              );
                              setShowCategoryModal(false);
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                marginRight: 10,
                              }}
                            >
                              {cat.icon}
                            </Text>

                            <Text
                              style={{
                                color: "#334155",
                                fontSize: 16,
                                fontWeight: "500",
                              }}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <TouchableOpacity
                      onPress={() =>
                        setShowCategoryModal(false)
                      }
                      style={{
                        marginTop: 15,
                        backgroundColor: "#0F172A",
                        padding: 14,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && {
                    opacity: 0.7,
                  },
                ]}
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator
                      color="#FFFFFF"
                      size="small"
                    />

                    <Text
                      style={[
                        styles.submitButtonText,
                        { marginTop: 6 },
                      ]}
                    >
                      Submitting...
                    </Text>
                  </>
                ) : (
                  <Text
                    style={styles.submitButtonText}
                  >
                    Apply Now
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  leatherBackground: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
  },

  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 10,
  },

  backButton: {
    width: 44,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  backIcon: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: -2,
  },

  headerTitle: {
    fontSize: 26,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  subText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },

  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  input: {
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
  },

  sectionTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  categoryDropdownBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  submitButton: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },

  // Success Screen
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  successCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  successIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    borderWidth: 2,
    borderColor: "#86EFAC",
  },

  successIcon: {
    fontSize: 48,
    color: "#16A34A",
    fontWeight: "800",
  },

  successTitle: {
    fontSize: 24,
    lineHeight: 31,
    color: "#0F172A",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },

  successHindi: {
    fontSize: 15,
    lineHeight: 23,
    color: "#475569",
    textAlign: "center",
    marginBottom: 22,
  },

  executiveBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },

  executiveTitle: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  executiveText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  successButton: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  successButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});