import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
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
  // FIX: setUser ko yahan se hata diya gaya hai taaki red error na aaye
  const { user, logout } = useAuth(); 
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  
  // FIX: Nayi photo ko turant dikhane ke liye local state
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Photo permission is required to update avatar.");
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
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: base64String })
      });

      const resData = await response.json();

      if (response.ok && resData.avatar) {
        // FIX: Photo upload hote hi humne localAvatar ko update kar diya
        setLocalAvatar(resData.avatar);
        Alert.alert("Success", "Profile picture updated successfully!");
      } else {
        throw new Error(resData.detail || "Failed to update");
      }
    } catch (e: any) {
      console.log("Upload Error:", e);
      Alert.alert("Error", e.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // FIX: Agar localAvatar hai toh wo dikhega, warna purana user avatar, warna default logo
  const displayAvatar = localAvatar || user?.avatar;
  const currentAvatar = displayAvatar ? { uri: displayAvatar } : { uri: LOGO_URL };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="profile-screen">
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.header}>
        
        <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={s.avatarContainer}>
          <View style={s.avatarWrap}>
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.brand} />
            ) : (
              <Image source={currentAvatar} style={s.avatar} contentFit="cover" />
            )}
          </View>
          <View style={s.cameraBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={s.name} testID="profile-user-name">{user?.name || "Guest"}</Text>
        <Text style={s.email}>{user?.email || user?.phone || "—"}</Text>
        <View style={s.rolePill}>
          <Text style={s.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {ITEMS.map((it, idx) => (
            <TouchableOpacity
              key={it.label}
              testID={`profile-item-${it.icon}`}
              onPress={() => it.path && router.push(it.path as any)}
              style={[s.row, idx < ITEMS.length - 1 && s.rowBorder]}
            >
              <View style={s.iconWrap}>
                <MaterialCommunityIcons name={it.icon as any} size={20} color={COLORS.brand} />
              </View>
              <Text style={s.rowLabel}>{it.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-button" onPress={async () => { await logout(); router.replace("/auth/login"); }} style={s.logout}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={s.version}>KMT Bazaar v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.xl, paddingTop: SPACING.xl, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatarContainer: { position: "relative", marginBottom: 4 },
  avatarWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden", ...shadow.card },
  avatar: { width: "100%", height: "100%" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: COLORS.brand, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 10 },
  email: { color: "rgba(255,255,255,0.85)", marginTop: 2, fontSize: 13 },
  rolePill: { marginTop: 10, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 4, borderRadius: RADIUS.pill },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: "row", alignItems: "center", padding: SPACING.md, gap: SPACING.md },
  rowBorder: { borderBottomWidth: 1, borderColor: COLORS.border },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, color: COLORS.text, fontWeight: "600" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: SPACING.lg, padding: 14, borderWidth: 1.5, borderColor: COLORS.error, borderRadius: RADIUS.pill, backgroundColor: "#fff" },
  logoutText: { color: COLORS.error, fontWeight: "800" },
  version: { textAlign: "center", color: COLORS.textMuted, marginTop: SPACING.lg, fontSize: 12 },
});