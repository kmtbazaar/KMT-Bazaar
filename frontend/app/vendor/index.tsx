import React, { useCallback, useState, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, TextInput, Modal, Alert, Switch, Animated } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker"; 
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { api } from "@/src/api"; 
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

const ACTIONS = [
  { icon: "clipboard-list-outline", label: "Orders", path: "/vendor/orders", color: "#F97316" },
  { icon: "chart-line", label: "Earnings", path: "/vendor/earnings", color: "#16A34A" },
];

export default function VendorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", image: "", category_id: "cat-grocery" }); 
  const [categories, setCategories] = useState<any[]>([]);

  // Profile picture state
  const [profilePic, setProfilePic] = useState(LOGO_URL);

  // 🔥 Settings Menu aur Animation ka logic
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const handleSettingsPress = () => {
    // Smooth Round Animation Start
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      spinAnim.setValue(0); // Reset for next time
      setShowSettingsMenu(true); // Animation khatam hote hi menu open
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'] // Aadha chakkar ghumega
  });

  const load = useCallback(async () => { 
    try { 
      setStats(await vendorApi.stats());
      setCategories(await api.categories()); 
    } catch (e) {
      console.log(e);
    } 
  }, []);
  
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickProfileImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setProfilePic(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleToggleOnline = async (storeId: string, currentVal: boolean) => {
    const newVal = !currentVal;

    setStats((prev: any) => {
      if (!prev) return prev;
      const updatedStores = prev.stores.map((s: any) =>
        s.id === storeId ? { ...s, is_online: newVal } : s
      );
      return { ...prev, stores: updatedStores };
    });

    try {
      await vendorApi.updateStore(storeId, { is_online: newVal });
    } catch (error) {
      Alert.alert("Error", "Could not update store status.");
      setStats((prev: any) => {
        if (!prev) return prev;
        const updatedStores = prev.stores.map((s: any) =>
          s.id === storeId ? { ...s, is_online: currentVal } : s
        );
        return { ...prev, stores: updatedStores };
      });
    }
  };

  const pickStoreImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 1], 
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setStoreForm({ ...storeForm, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleCreateStore = async () => {
    if (!storeForm.name || !storeForm.address) {
      Alert.alert("Error", "Please fill store name and address.");
      return;
    }
    try {
      await vendorApi.createStore(storeForm); 
      Alert.alert("Success", "Store Created Successfully!");
      setShowCreateStore(false);
      setStoreForm({ name: "", address: "", image: "", category_id: "cat-grocery" }); 
      load(); 
    } catch (error) {
      Alert.alert("Error", "Could not create store.");
    }
  };

  return (
    <View style={s.root} testID="vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.header}>
          
          <View style={s.headerTop}>
            
            {/* Left Side: Logo/Profile Pic Only */}
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Pressable onPress={pickProfileImage}>
                <Image source={{ uri: profilePic }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff' }} contentFit="cover" />
              </Pressable>
            </View>

            {/* Middle: Centered Text */}
            <View style={{ flex: 2, alignItems: "center" }}>
              <Text style={s.headerTitle}>Vendor Dashboard</Text>
              <Text style={s.headerSub}>Welcome, {user?.name}</Text>
            </View>

            {/* 🔥 Right Side: Notification Icon + Animated Settings Icon */}
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
              
              <Pressable onPress={() => router.push("/vendor/orders" as any)} hitSlop={10}>
                <MaterialCommunityIcons name="bell-outline" size={28} color="#fff" />
              </Pressable>

              <Pressable onPress={handleSettingsPress} hitSlop={10}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <MaterialCommunityIcons name="cog" size={28} color="#fff" />
                </Animated.View>
              </Pressable>

            </View>

          </View>

          <Text style={s.bigStat}>₹{stats?.payout ?? 0}</Text>
          <Text style={s.bigLabel}>Estimated Payout (after {stats?.commission_percent ?? 10}% commission)</Text>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
        refreshControl={<RefreshControl tintColor={COLORS.accent} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.kpiRow}>
          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" color={COLORS.success} />
          <KPI label="Products" value={stats?.products ?? 0} icon="package" color={COLORS.brand} />
        </View>
        <View style={s.kpiRow}>
          <KPI label="Orders" value={stats?.orders ?? 0} icon="clipboard-list" color={COLORS.accent} />
          <KPI label="Pending" value={stats?.pending ?? 0} icon="clock-outline" color="#EAB308" />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.lg, marginBottom: SPACING.md }}>
          <Text style={s.sectionTitle}>My Stores</Text>
          <Pressable onPress={() => setShowCreateStore(true)} style={s.addBtnSmall}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {(stats?.stores || []).map((st: any) => {
          const isOnline = st.is_online !== false; 

          return (
            <View key={st.id} style={s.storeCard}>
              {/* Sirf Image par click karne se andar ka page khulega */}
              <Pressable 
                onPress={() => router.push({ pathname: `/vendor/store/${st.id}`, params: { name: st.name, image: st.image, address: st.address } } as any)}
              >
                <Image source={{ uri: st.image }} style={s.storeImg} contentFit="cover" />
              </Pressable>

              <View style={{ flex: 1, marginLeft: 10 }}>
                
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={s.storeName} numberOfLines={1}>{st.name}</Text>
                  </View>

                  {st.is_approved ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}>
                        <Text style={{ color: isOnline ? '#166534' : '#991b1b', fontSize: 10, fontWeight: '800' }}>
                          {isOnline ? 'LIVE' : 'OFFLINE'}
                        </Text>
                      </View>
                      {/* Switch ko bada karne ke liye transform scale use kiya gaya hai */}
                      <View style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }], marginHorizontal: 4 }}>
                        <Switch
                          value={isOnline}
                          onValueChange={() => handleToggleOnline(st.id, isOnline)}
                          trackColor={{ false: "#f87171", true: "#4ade80" }}
                          thumbColor={"#fff"}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#fef08a', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ color: '#854d0e', fontSize: 10, fontWeight: '800' }}>PENDING</Text>
                    </View>
                  )}
                </View>

                <Text style={s.storeMeta}>★ {st.rating} · {st.delivery_min} min · {st.address}</Text>
              </View>
            </View>
          );
        })}
        
        {(stats?.stores || []).length === 0 && (
          <View style={s.emptyBox}>
            <MaterialCommunityIcons name="storefront-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.emptyText}>You don't have a store yet.</Text>
            <Text style={s.emptySubText}>Click the + icon above to create your first store.</Text>
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: SPACING.lg }]}>Quick Actions</Text>
        <View style={s.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} testID={`vendor-${a.label}`} onPress={() => router.push(a.path as any)} style={s.actionCard}>
              <View style={[s.actionIcon, { backgroundColor: a.color + "1A" }]}>
                <MaterialCommunityIcons name={a.icon as any} size={24} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* --- SETTINGS DROP MENU (LOGOUT) --- */}
      <Modal visible={showSettingsMenu} transparent animationType="fade">
        <Pressable style={s.menuOverlay} onPress={() => setShowSettingsMenu(false)}>
          <View style={s.menuDropdown}>
            <Pressable 
              style={s.menuItem} 
              onPress={async () => { 
                setShowSettingsMenu(false); 
                await logout(); 
                router.replace("/auth/login"); 
              }}
            >
              <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
              <Text style={s.menuTextLogout}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* --- CREATE STORE MODAL --- */}
      <Modal visible={showCreateStore} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Create New Store</Text>
            
            <Text style={s.label}>Store Banner</Text>
            <Pressable onPress={pickStoreImage} style={s.imagePickerBtn}>
              {storeForm.image ? (
                <Image source={{ uri: storeForm.image }} style={s.previewImg} contentFit="cover" />
              ) : (
                <View style={s.imagePlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={28} color={COLORS.textMuted} />
                  <Text style={s.imagePlaceholderText}>Upload Store Banner</Text>
                </View>
              )}
            </Pressable>

            <TextInput
              placeholder="Store Name (e.g. CyberDham Mart)"
              value={storeForm.name}
              onChangeText={(t) => setStoreForm({ ...storeForm, name: t })}
              style={s.input}
            />
            
            <TextInput
              placeholder="Full Address"
              value={storeForm.address}
              onChangeText={(t) => setStoreForm({ ...storeForm, address: t })}
              style={s.input}
              multiline
            />

            <View style={s.modalActions}>
              <Pressable onPress={() => setShowCreateStore(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreateStore} style={s.saveBtn}>
                <Text style={s.saveText}>Create Store</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function KPI({ label, value, icon, color }: any) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIcon, { backgroundColor: color + "1A" }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  bigStat: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 18 },
  bigLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  kpiIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiValue: { fontWeight: "800", color: COLORS.text, fontSize: 18 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  addBtnSmall: { backgroundColor: COLORS.brand, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", ...shadow.soft },
  storeCard: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, ...shadow.soft },
  storeImg: { width: 60, height: 60, borderRadius: 8 },
  storeName: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  storeMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  emptyBox: { alignItems: "center", padding: 30, backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed" },
  emptyText: { fontWeight: "700", color: COLORS.text, marginTop: 10 },
  emptySubText: { color: COLORS.textMuted, textAlign: "center", fontSize: 12, marginTop: 4 },
  actions: { gap: 8, marginTop: 10 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontWeight: "700", color: COLORS.text },
  
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.1)", alignItems: "flex-end", paddingRight: 20, paddingTop: 80 },
  menuDropdown: { backgroundColor: "#fff", padding: 10, borderRadius: 8, ...shadow.card, minWidth: 140 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 10 },
  menuTextLogout: { color: "#EF4444", fontWeight: "800", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: SPACING.xl },
  modalContent: { backgroundColor: "#fff", padding: SPACING.xl, borderRadius: RADIUS.lg, ...shadow.soft },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 4 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.md, color: COLORS.text },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: SPACING.md },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: COLORS.textMuted, fontWeight: "700" },
  saveBtn: { backgroundColor: COLORS.brand, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.pill },
  saveText: { color: "#fff", fontWeight: "700" },
  imagePickerBtn: { height: 110, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", marginBottom: SPACING.md, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { color: COLORS.textMuted, marginTop: 4, fontSize: 12, fontWeight: "600" },
});
