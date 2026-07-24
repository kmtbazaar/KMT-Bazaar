import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, Modal, Alert, ScrollView, TouchableOpacity, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

export default function Addresses() {
  const router = useRouter();
  const { user, setUser } = useAuth(); // Auth context for syncing address globally
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    label: "Home", 
    full_name: "", 
    line1: "", 
    city: "", 
    state: "", 
    pincode: "", 
    phone: "" 
  });

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await api.addresses();
      setAddresses(data || []);
    } catch (e) {
      console.log("Failed to load addresses", e);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Address Selection Handler (Checkout Style)
  const handleSelectAddress = (selectedAddr: any) => {
    const formattedAddressStr = `${selectedAddr.label || 'Home'} · ${selectedAddr.line1 || selectedAddr.city}`;
    
    // Update active address globally in AuthContext
    if (setUser) {
      setUser({
        ...user,
        activeAddress: selectedAddr,
        address: formattedAddressStr
      });
    }

    // Return back to Home / Checkout page
    router.back();
  };

  const handleOpenForm = (address?: any) => {
    if (address) {
      const addressId = address.id || address._id;
      setEditingId(addressId);
      setFormData({ 
        label: address.label || "Home", 
        full_name: address.full_name || "", 
        line1: address.line1 || "", 
        city: address.city || "", 
        state: address.state || "", 
        pincode: address.pincode || "", 
        phone: address.phone || "" 
      });
    } else {
      setEditingId(null);
      setFormData({ label: "Home", full_name: "", line1: "", city: "", state: "", pincode: "", phone: "" });
    }
    setFormVisible(true);
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!formData.full_name || !formData.line1 || !formData.city || !formData.state || !formData.pincode || !formData.phone) {
      Alert.alert("Required Fields", "Please fill all fields to proceed.");
      return;
    }

    if (formData.pincode.trim().length !== 6) {
      Alert.alert("Invalid Pincode", "Pincode must be exactly 6 digits.");
      return;
    }

    if (formData.phone.trim().length !== 10) {
      Alert.alert("Invalid Phone Number", "Phone number must be exactly 10 digits.");
      return;
    }

    try {
      if (editingId) {
        await api.updateAddress(editingId, formData);
      } else {
        await api.createAddress(formData);
      }
      setFormVisible(false);
      loadAddresses();
    } catch (e: any) {
      console.log("BACKEND ERROR DETAILS:", e);
      Alert.alert("Backend Error", e.message || JSON.stringify(e) || "Something went wrong with the API");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await api.deleteAddress(id);
            loadAddresses();
          } catch (e) {
            Alert.alert("Error", "Failed to delete address");
          }
        }
      }
    ]);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.brand} /></View>;
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select Delivery Address</Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={addresses}
        keyExtractor={(item, index) => (item.id || item._id || index).toString()}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<Text style={s.emptyText}>No saved addresses found.</Text>}
        renderItem={({ item }) => {
          const itemId = item.id || item._id;
          // Check if address is active
          const isSelected = user?.activeAddress?.id === itemId || user?.activeAddress?._id === itemId;

          return (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => handleSelectAddress(item)}
              style={[s.card, isSelected && s.cardSelected]}
            >
              <View style={s.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialCommunityIcons 
                    name={isSelected ? "radiobox-marked" : "radiobox-blank"} 
                    size={22} 
                    color={isSelected ? COLORS.brand : COLORS.textMuted} 
                  />
                  <View style={s.labelBadge}>
                    <MaterialCommunityIcons name={item.label?.toLowerCase() === "work" ? "briefcase" : "home"} size={14} color={COLORS.brand} />
                    <Text style={s.labelText}>{item.label || "Home"}</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={s.selectedBadge}>
                    <Text style={s.selectedBadgeText}>DELIVERING HERE</Text>
                  </View>
                )}
              </View>

              <Text style={s.nameText}>{item.full_name}</Text>
              <Text style={s.addressText}>{item.line1}</Text>
              <Text style={s.addressText}>{item.city}, {item.state} - {item.pincode}</Text>
              <Text style={s.phoneText}>Phone: {item.phone}</Text>

              <View style={s.actionRow}>
                <TouchableOpacity onPress={() => handleOpenForm(item)} style={s.actionBtn}>
                  <Text style={s.actionTextEdit}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(itemId)} style={[s.actionBtn, { borderLeftWidth: 1, borderColor: COLORS.border }]}>
                  <Text style={s.actionTextDelete}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={s.footer}>
        <TouchableOpacity onPress={() => handleOpenForm()} style={s.addBtn}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={s.addBtnText}>ADD NEW ADDRESS</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={formVisible} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>{editingId ? "Edit Address" : "Add New Address"}</Text>

              <View style={s.typeRow}>
                {["Home", "Work", "Other"].map(type => (
                  <TouchableOpacity key={type} onPress={() => setFormData({ ...formData, label: type })} style={[s.typeBtn, formData.label === type && s.typeBtnActive]}>
                    <Text style={[s.typeText, formData.label === type && s.typeTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={s.input} placeholder="Receiver's Name" value={formData.full_name} onChangeText={t => setFormData({ ...formData, full_name: t })} />
              <TextInput style={s.input} placeholder="Street / House No." value={formData.line1} onChangeText={t => setFormData({ ...formData, line1: t })} />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="City" value={formData.city} onChangeText={t => setFormData({ ...formData, city: t })} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="State" value={formData.state} onChangeText={t => setFormData({ ...formData, state: t })} />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Pincode" keyboardType="number-pad" maxLength={6} value={formData.pincode} onChangeText={t => setFormData({ ...formData, pincode: t.replace(/[^0-9]/g, '') })} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Phone No." keyboardType="phone-pad" maxLength={10} value={formData.phone} onChangeText={t => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })} />
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity onPress={() => setFormVisible(false)} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={s.saveBtn}>
                  <Text style={s.saveBtnText}>SAVE ADDRESS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  emptyText: { textAlign: "center", marginTop: 40, color: COLORS.textMuted, fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, ...shadow.soft },
  cardSelected: { borderColor: COLORS.brand, backgroundColor: "#fffaf5" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.md, borderBottomWidth: 1, borderColor: COLORS.surfaceSecondary },
  labelBadge: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.brandLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  labelText: { color: COLORS.brand, fontSize: 12, fontWeight: "700" },
  selectedBadge: { backgroundColor: COLORS.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  selectedBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  nameText: { color: COLORS.text, fontSize: 16, fontWeight: "800", paddingHorizontal: SPACING.md, paddingTop: 12, paddingBottom: 2 },
  addressText: { color: COLORS.text, fontSize: 14, paddingHorizontal: SPACING.md, paddingTop: 2, lineHeight: 20 },
  phoneText: { color: COLORS.textMuted, fontSize: 13, paddingHorizontal: SPACING.md, paddingVertical: 6, fontWeight: "600" },
  actionRow: { flexDirection: "row", borderTopWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  actionTextEdit: { color: COLORS.brand, fontWeight: "700", fontSize: 13 },
  actionTextDelete: { color: COLORS.error, fontWeight: "700", fontSize: 13 },
  footer: { padding: SPACING.lg, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  addBtn: { backgroundColor: COLORS.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: RADIUS.pill, gap: 6 },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 16 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, alignItems: "center" },
  typeBtnActive: { backgroundColor: COLORS.brandLight, borderColor: COLORS.brand },
  typeText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  typeTextActive: { color: COLORS.brand, fontWeight: "800" },
  input: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.sm, marginBottom: 12, fontSize: 14, color: COLORS.text },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary },
  cancelBtnText: { color: COLORS.text, fontWeight: "700" },
  saveBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.brand },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
