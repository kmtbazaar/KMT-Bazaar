import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/AuthContext";
import { API } from "@/src/api";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

const ITEMS = [
  { icon: "package-variant", label: "My Orders", path: "/orders" },
  { icon: "map-marker-multiple-outline", label: "Saved Addresses", path: "/addresses" },
  { icon: "bell-outline", label: "Notifications", path: "/notifications" },
  { icon: "heart-outline", label: "Wishlist", path: null },
  { icon: "tag-outline", label: "Offers & Coupons", path: null },
  { icon: "headset", label: "Help & Support", path: null },
  { icon: "shield-check-outline", label: "Privacy Policy", path: null },
  { icon: "information-outline", label: "About KMT Bazaar", path: null },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  // Popup state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "help" | "privacy" | "about" | null
  >(null);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Photo permission is required to update avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      uploadAvatar(base64Image);
    }
  };

  const uploadAvatar = async (base64String: string) => {
    setUploading(true);

    try {
      const token = await AsyncStorage.getItem("kmt_token");

      const response = await fetch(`${API}/auth/update-avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: base64String }),
      });

      const resData = await response.json();

      if (response.ok && resData.avatar) {
        setLocalAvatar(resData.avatar);

        Alert.alert(
          "Success",
          "Profile picture updated successfully!"
        );
      } else {
        throw new Error(resData.detail || "Failed to update");
      }
    } catch (e: any) {
      console.log("Upload Error:", e);

      Alert.alert(
        "Error",
        e.message || "Failed to upload image"
      );
    } finally {
      setUploading(false);
    }
  };

  const openInfoModal = (
    type: "help" | "privacy" | "about"
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const closeInfoModal = () => {
    setModalVisible(false);
    setModalType(null);
  };

  const displayAvatar = localAvatar || user?.avatar;
  const currentAvatar = displayAvatar
    ? { uri: displayAvatar }
    : { uri: LOGO_URL };

  const getModalTitle = () => {
    if (modalType === "help") return "Help & Support";
    if (modalType === "privacy") return "Privacy Policy";
    if (modalType === "about") return "About KMT Bazaar";
    return "";
  };

  const getModalIcon = () => {
    if (modalType === "help") return "headset";
    if (modalType === "privacy") return "shield-check-outline";
    if (modalType === "about") return "information-outline";
    return "information-outline";
  };

  return (
    <SafeAreaView
      style={s.root}
      edges={["top"]}
      testID="profile-screen"
    >
      <LinearGradient
        colors={[COLORS.brand, COLORS.brandDark]}
        style={s.header}
      >
        <TouchableOpacity
          onPress={handlePickImage}
          disabled={uploading}
          style={s.avatarContainer}
        >
          <View style={s.avatarWrap}>
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.brand}
              />
            ) : (
              <Image
                source={currentAvatar}
                style={s.avatar}
                contentFit="cover"
              />
            )}
          </View>

          <View style={s.cameraBadge}>
            <MaterialCommunityIcons
              name="camera"
              size={14}
              color="#fff"
            />
          </View>
        </TouchableOpacity>

        <Text
          style={s.name}
          testID="profile-user-name"
        >
          {user?.name || "Guest"}
        </Text>

        <Text style={s.email}>
          {user?.email || user?.phone || "—"}
        </Text>

        <View style={s.rolePill}>
          <Text style={s.roleText}>
            {user?.role?.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {ITEMS.map((it, idx) => (
            <TouchableOpacity
              key={it.label}
              testID={`profile-item-${it.icon}`}
              onPress={() => {
                if (it.path) {
                  router.push(it.path as any);
                  return;
                }

                if (it.label === "Help & Support") {
                  openInfoModal("help");
                  return;
                }

                if (it.label === "Privacy Policy") {
                  openInfoModal("privacy");
                  return;
                }

                if (it.label === "About KMT Bazaar") {
                  openInfoModal("about");
                  return;
                }

                Alert.alert(
                  it.label,
                  "This feature will be available soon."
                );
              }}
              style={[
                s.row,
                idx < ITEMS.length - 1 && s.rowBorder,
              ]}
            >
              <View style={s.iconWrap}>
                <MaterialCommunityIcons
                  name={it.icon as any}
                  size={20}
                  color={COLORS.brand}
                />
              </View>

              <Text style={s.rowLabel}>
                {it.label}
              </Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          testID="logout-button"
          onPress={async () => {
            await logout();
            router.replace("/auth/login");
          }}
          style={s.logout}
        >
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color={COLORS.error}
          />

          <Text style={s.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={s.version}>
          KMT Bazaar v1.0.0
        </Text>
      </ScrollView>

      {/* INFO MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInfoModal}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View style={s.modalTitleRow}>
                <View style={s.modalIcon}>
                  <MaterialCommunityIcons
                    name={getModalIcon() as any}
                    size={23}
                    color={COLORS.brand}
                  />
                </View>

                <Text style={s.modalTitle}>
                  {getModalTitle()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeInfoModal}
                style={s.closeButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView
              style={s.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {modalType === "help" && (
                <View>
                  <Text style={s.modalHeading}>
                    Need Help?
                  </Text>

                  <Text style={s.modalText}>
                    If you have any questions, problems with your
                    order, delivery issues or need any assistance,
                    please contact KMT Bazaar Support.
                  </Text>

                  <View style={s.contactCard}>
                    <MaterialCommunityIcons
                      name="phone"
                      size={22}
                      color={COLORS.brand}
                    />

                    <View style={s.contactTextWrap}>
                      <Text style={s.contactLabel}>
                        Mobile Number
                      </Text>

                      <Text style={s.contactValue}>
                        8100554123
                      </Text>
                    </View>
                  </View>

                  <View style={s.contactCard}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={22}
                      color={COLORS.brand}
                    />

                    <View style={s.contactTextWrap}>
                      <Text style={s.contactLabel}>
                        Email
                      </Text>

                      <Text style={s.contactValue}>
                        km65746@gmail.com
                      </Text>
                    </View>
                  </View>

                  <Text style={s.supportNote}>
                    Our support team will help you with your
                    queries and concerns regarding KMT Bazaar.
                  </Text>
                </View>
              )}

              {modalType === "privacy" && (
                <View>
                  <Text style={s.modalHeading}>
                    KMT Bazaar Privacy Policy
                  </Text>

                  <Text style={s.modalText}>
                    KMT Bazaar respects your privacy and is committed
                    to protecting your personal information.
                  </Text>

                  <Text style={s.policyTitle}>
                    1. Information We Collect
                  </Text>

                  <Text style={s.modalText}>
                    We may collect information such as your name,
                    mobile number, email address, delivery address
                    and order details when you use KMT Bazaar.
                  </Text>

                  <Text style={s.policyTitle}>
                    2. Use of Information
                  </Text>

                  <Text style={s.modalText}>
                    Your information may be used to process orders,
                    provide delivery services, communicate with you,
                    provide customer support and improve the KMT
                    Bazaar experience.
                  </Text>

                  <Text style={s.policyTitle}>
                    3. Payment Information
                  </Text>

                  <Text style={s.modalText}>
                    Payment information is handled through the
                    applicable payment service provider. KMT Bazaar
                    does not intentionally store sensitive payment
                    credentials such as your card PIN or banking
                    password.
                  </Text>

                  <Text style={s.policyTitle}>
                    4. Data Protection
                  </Text>

                  <Text style={s.modalText}>
                    We take reasonable measures to protect your
                    information from unauthorized access, misuse or
                    disclosure.
                  </Text>

                  <Text style={s.policyTitle}>
                    5. Third-Party Services
                  </Text>

                  <Text style={s.modalText}>
                    Some services used by KMT Bazaar, such as
                    payment, hosting, analytics or delivery
                    services, may process information as required to
                    provide their services.
                  </Text>

                  <Text style={s.policyTitle}>
                    6. Your Choices
                  </Text>

                  <Text style={s.modalText}>
                    You may contact KMT Bazaar Support if you have
                    questions about your personal information or
                    require assistance regarding your account.
                  </Text>

                  <Text style={s.policyTitle}>
                    7. Policy Updates
                  </Text>

                  <Text style={s.modalText}>
                    KMT Bazaar may update this Privacy Policy from
                    time to time. Any updated policy will be made
                    available through the app or website.
                  </Text>

                  <Text style={s.policyFooter}>
                    Last updated: September 2026
                  </Text>
                </View>
              )}

              {modalType === "about" && (
                <View style={s.aboutContent}>
                  <Image
                    source={{ uri: LOGO_URL }}
                    style={s.aboutLogo}
                    contentFit="contain"
                  />

                  <Text style={s.aboutTitle}>
                    KMT Bazaar
                  </Text>

                  <Text style={s.aboutText}>
                    KMT Bazaar is a online delivery app, comes with,
                    grocery, food, clothes, electronics, brick.
                    Hardware, medicine and many more order now at
                    kmtbazaar.com
                  </Text>

                  <View style={s.websiteBox}>
                    <MaterialCommunityIcons
                      name="web"
                      size={22}
                      color={COLORS.brand}
                    />

                    <Text style={s.websiteText}>
                      kmtbazaar.com
                    </Text>
                  </View>

                  <Text style={s.aboutVersion}>
                    KMT Bazaar v1.0.0
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              onPress={closeInfoModal}
              style={s.doneButton}
            >
              <Text style={s.doneButtonText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
  },

  header: {
    padding: SPACING.xl,
    paddingTop: SPACING.xl,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 4,
  },

  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadow.card,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.brand,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
  },

  email: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontSize: 13,
  },

  rolePill: {
    marginTop: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },

  roleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.md,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  rowLabel: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "600",
  },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: SPACING.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.pill,
    backgroundColor: "#fff",
  },

  logoutText: {
    color: COLORS.error,
    fontWeight: "800",
  },

  version: {
    textAlign: "center",
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    fontSize: 12,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalBox: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    ...shadow.card,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },

  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  modalHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMuted,
    marginBottom: 14,
  },

  policyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 6,
  },

  policyFooter: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    marginBottom: 10,
    fontStyle: "italic",
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    marginBottom: 2,
    gap: 12,
  },

  contactTextWrap: {
    flex: 1,
  },

  contactLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 3,
  },

  contactValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  supportNote: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
    marginTop: 16,
    marginBottom: 10,
  },

  aboutContent: {
    alignItems: "center",
    paddingVertical: 8,
    paddingBottom: 15,
  },

  aboutLogo: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },

  aboutTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 12,
  },

  aboutText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textMuted,
    marginBottom: 20,
  },

  websiteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
  },

  websiteText: {
    color: COLORS.brand,
    fontSize: 15,
    fontWeight: "800",
  },

  aboutVersion: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 18,
  },

  doneButton: {
    marginHorizontal: 18,
    marginBottom: 18,
    marginTop: 4,
    backgroundColor: COLORS.brand,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    alignItems: "center",
  },

  doneButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});