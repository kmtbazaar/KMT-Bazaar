Import React, { useEffect, useState } from "react";
Import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, Modal, Alert, ScrollView, TouchableOpacity, Keyboard } from "react-native";
Import { SafeAreaView } from "react-native-safe-area-context";
Import { MaterialCommunityIcons } from "@expo/vector-icons";
Import { useRouter } from "expo-router";
Import AsyncStorage from "@react-native-async-storage/async-storage";
Import { api } from "@/src/api";
Import { useAuth } from "@/src/AuthContext";
Import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

Export default function Addresses() {
  Const router = useRouter();
  Const { user, setUser } = useAuth(); // Auth context for syncing address globally
  Const [addresses, setAddresses] = useState<any[]>([]);
  Const [loading, setLoading] = useState(true);
  Const [formVisible, setFormVisible] = useState(false);
  Const [editingId, setEditingId] = useState<string | null>(null);
  Const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  Const [formData, setFormData] = useState({ 
    Label: "Home", 
    Full_name: "", 
    Line1: "", 
    City: "", 
    State: "", 
    Pincode: "", 
    Phone: "" 
  });

  UseEffect(() => { 
    LoadAddresses(); 
  }, []);

  Const loadAddresses = async () => {
    SetLoading(true);
    Try {
      Const data = await api.addresses();
      SetAddresses(data || []);

      // Read current selected address from storage to highlight radio button
      Const stored = await AsyncStorage.getItem("selected_address");
      If (stored) {
        Const parsed = JSON.parse(stored);
        Const storedId = parsed.id || parsed._id;
        SetSelectedAddrId(storedId ? String(storedId) : null);
      } else if (user?.activeAddress) {
        Const activeId = user.activeAddress.id || user.activeAddress._id;
        SetSelectedAddrId(activeId ? String(activeId) : null);
      }
    } catch (e) {
      Console.log("Failed to load addresses", e);
    } finally {
      SetLoading(false);
    }
  };

  // 🎯 Address Selection Handler (Checkout / Home Sync)
  Const handleSelectAddress = async (selectedAddr: any) => {
    Const formattedAddressStr = `${selectedAddr.label || 'Home'} · ${selectedAddr.line1 || selectedAddr.city}`;
    
    // 1. Save locally in AsyncStorage so it persists across app reopens
    Try {
      Await AsyncStorage.setItem("selected_address", JSON.stringify(selectedAddr));
    } catch (err) {
      Console.log("Error saving active address:", err);
    }

    // 2. Update active address globally in AuthContext
    If (setUser) {
      SetUser({
        ...user,
        ActiveAddress: selectedAddr,
        Address: formattedAddressStr
      });
    }

    // 3. Return back to Home / Checkout page
    Router.back();
  };

  Const handleOpenForm = (address?: any) => {
    If (address) {
      Const addressId = address.id || address._id;
      SetEditingId(addressId ? String(addressId) : null);
      SetFormData({ 
        Label: address.label || "Home", 
        Full_name: address.full_name || address.name || "", 
        Line1: address.line1 || address.address || "", 
        City: address.city || "", 
        State: address.state || "", 
        Pincode: address.pincode ? String(address.pincode) : "", 
        Phone: address.phone ? String(address.phone) : "" 
      });
    } else {
      SetEditingId(null);
      SetFormData({ label: "Home", full_name: "", line1: "", city: "", state: "", pincode: "", phone: "" });
    }
    SetFormVisible(true);
  };

  Const handleSave = async () => {
    Keyboard.dismiss();

    If (!formData.full_name || !formData.line1 || !formData.city || !formData.state || !formData.pincode || !formData.phone) {
      Alert.alert("Required Fields", "Please fill all fields to proceed.");
      Return;
    }

    If (formData.pincode.trim().length !== 6) {
      Alert.alert("Invalid Pincode", "Pincode must be exactly 6 digits.");
      Return;
    }

    If (formData.phone.trim().length !== 10) {
      Alert.alert("Invalid Phone Number", "Phone number must be exactly 10 digits.");
      Return;
    }

    Try {
      If (editingId) {
        Await api.updateAddress(editingId, formData);
      } else {
        Await api.createAddress(formData);
      }
      SetFormVisible(false);
      SetEditingId(null);
      LoadAddresses();
    } catch (e: any) {
      Console.log("BACKEND ERROR DETAILS:", e);
      Alert.alert("Backend Error", e.message || JSON.stringify(e) || "Something went wrong with the API");
    }
  };

  // 🔥 FIXED DELETE HANDLER (Passes correct ID format)
  Const handleDelete = async (item: any) => {
    Const targetId = String(item.id || item._id);

    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      { 
        Text: "Delete", 
        Style: "destructive", 
        OnPress: async () => {
          Try {
            Await api.deleteAddress(targetId);
            If (selectedAddrId === targetId) {
              Await AsyncStorage.removeItem("selected_address");
              SetSelectedAddrId(null);
            }
            LoadAddresses();
          } catch (e: any) {
            Console.log("DELETE API ERROR:", e);
            Alert.alert("Error", e.message || "Failed to delete address");
          }
        }
      }
    ]);
  };

  If (loading) {
    Return <View style={s.center}><ActivityIndicator size="large" color={COLORS.brand} /></View>;
  }

  Return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select Delivery Address</Text>
      </View>

      <FlatList
        Style={{ flex: 1 }}
        Data={addresses}
        KeyExtractor={(item, index) => (item.id || item._id || index).toString()}
        ContentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<Text style={s.emptyText}>No saved addresses found.</Text>}
        RenderItem={({ item }) => {
          Const itemId = String(item.id || item._id);
          
          // Check if address is active
          Const isSelected = selectedAddrId === itemId || String(user?.activeAddress?.id || user?.activeAddress?._id) === itemId;

          Return (
            <View style={[s.card, isSelected && s.cardSelected]}>
              {/* Card Body - Tap to Select Address */}
              <TouchableOpacity 
                ActiveOpacity={0.7}
                OnPress={() => handleSelectAddress(item)}
                Style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}
              >
                <View style={s.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialCommunityIcons 
                      Name={isSelected ? "radiobox-marked" : "radiobox-blank"} 
                      Size={22} 
                      Color={isSelected ? COLORS.brand : COLORS.textMuted} 
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

                <Text style={s.nameText}>{item.full_name || item.name}</Text>
                <Text style={s.addressText}>{item.line1 || item.address}</Text>
                <Text style={s.addressText}>{item.city}, {item.state} - {item.pincode}</Text>
                <Text style={s.phoneText}>Phone: {item.phone}</Text>
              </TouchableOpacity>

              {/* Action Buttons - Independent Click Handlers */}
              <View style={s.actionRow}>
                <TouchableOpacity 
                  ActiveOpacity={0.6}
                  OnPress={() => handleOpenForm(item)} 
                  Style={s.actionBtn}
                >
                  <Text style={s.actionTextEdit}>EDIT</Text>
                </TouchableOpacity>

                {/* 🔥 FIXED DELETE BUTTON (Passes full item object) */}
                <TouchableOpacity 
                  ActiveOpacity={0.6}
                  OnPress={() => handleDelete(item)} 
                  Style={[s.actionBtn, { borderLeftWidth: 1, borderColor: COLORS.border }]}
                >
                  <Text style={s.actionTextDelete}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                <TouchableOpacity onPress={() => { setFormVisible(false); setEditingId(null); }} style={s.cancelBtn}>
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

Const s = StyleSheet.create({
  Root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  Center: { flex: 1, justifyContent: "center", alignItems: "center" },
  Header: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  BackBtn: { marginRight: 16 },
  HeaderTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  EmptyText: { textAlign: "center", marginTop: 40, color: COLORS.textMuted, fontSize: 14 },
  Card: { backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, ...shadow.soft, overflow: "hidden" },
  CardSelected: { borderColor: COLORS.brand, backgroundColor: "#fffaf5" },
  CardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: SPACING.sm, borderBottomWidth: 1, borderColor: COLORS.surfaceSecondary },
  LabelBadge: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.brandLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  LabelText: { color: COLORS.brand, fontSize: 12, fontWeight: "700" },
  SelectedBadge: { backgroundColor: COLORS.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  SelectedBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  NameText: { color: COLORS.text, fontSize: 16, fontWeight: "800", paddingTop: 10, paddingBottom: 2 },
  AddressText: { color: COLORS.text, fontSize: 14, paddingTop: 2, lineHeight: 20 },
  PhoneText: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 6, fontWeight: "600" },
  ActionRow: { flexDirection: "row", borderTopWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  ActionBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  ActionTextEdit: { color: COLORS.brand, fontWeight: "700", fontSize: 13 },
  ActionTextDelete: { color: COLORS.error, fontWeight: "700", fontSize: 13 },
  Footer: { padding: SPACING.lg, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  AddBtn: { backgroundColor: COLORS.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: RADIUS.pill, gap: 6 },
  AddBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  ModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  ModalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl },
  ModalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 16 },
  TypeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  TypeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, alignItems: "center" },
  TypeBtnActive: { backgroundColor: COLORS.brandLight, borderColor: COLORS.brand },
  TypeText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  TypeTextActive: { color: COLORS.brand, fontWeight: "800" },
  Input: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.sm, marginBottom: 12, fontSize: 14, color: COLORS.text },
  ModalActions: { flexDirection: "row", gap: 12, marginTop: 10 },
  CancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary },
  CancelBtnText: { color: COLORS.text, fontWeight: "700" },
  SaveBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.brand },
  SaveBtnText: { color: "#fff", fontWeight: "700" },
});
