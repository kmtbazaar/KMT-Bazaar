import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, Modal, Alert, ScrollView, TouchableOpacity, Keyboard, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

const normalizeMobile = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

async function reverseGeocodeDevice(latitude: number, longitude: number) {
  return await api.reverseGeocode(latitude, longitude);
}

export default function Addresses() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [pendingMapLocation, setPendingMapLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [existingLocationSaved, setExistingLocationSaved] = useState(false);
  const [gpsPrefillLoading, setGpsPrefillLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [formData, setFormData] = useState({ 
    label: "Home", 
    full_name: "", 
    line1: "",
    line2: "",
    landmark: "",
    district: "",
    city: "", 
    state: "", 
    pincode: "", 
    phone: "" 
  });

  const params = useLocalSearchParams<{ mode?: string }>();

  useEffect(() => {
    loadAddresses();

    if (params.mode !== "initial") {
      AsyncStorage.removeItem("kmt_current_location");
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem("kmt_current_location");
        if (!raw) return;

        const gps = JSON.parse(raw);
        const latitude = Number(gps?.latitude);
        const longitude = Number(gps?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        await AsyncStorage.removeItem("kmt_current_location");
        setEditingId(null);
        setFormVisible(false);
        setMapVisible(true);
        setPendingMapLocation({
          latitude,
          longitude,
          accuracy: Number(gps?.accuracy) || undefined,
        });
        setLocationCaptured({
          latitude,
          longitude,
          accuracy: Number(gps?.accuracy) || undefined,
        });
        setExistingLocationSaved(false);
        setGpsPrefillLoading(true);
        let profileName = user?.name || "";
        let profilePhone = user?.phone || "";

        // Always read the authenticated profile so both mobile-login and
        // email-login customers get their saved mobile number here.
        try {
          const profile = await api.me();
          profileName = profileName || profile?.name || "";
          profilePhone = profilePhone || profile?.phone || "";
        } catch (profileError) {
          console.log("Profile lookup for address autofill failed:", profileError);
        }

        setFormData(prev => ({
          ...prev,
          full_name: profileName || prev.full_name,
          phone: normalizeMobile(profilePhone) || normalizeMobile(prev.phone),
        }));

        try {
          const geo = await reverseGeocodeDevice(latitude, longitude);
          setFormData(prev => ({
            ...prev,
            line1: geo?.line1 || prev.line1,
            line2: geo?.line2 || prev.line2,
            district: geo?.district || prev.district,
            city: geo?.city || prev.city,
            state: geo?.state || prev.state,
            pincode: geo?.pincode || prev.pincode,
          }));
        } catch (error) {
          console.log("Initial reverse geocode failed:", error);
          setLocationError("GPS captured. Please enter the address details manually.");
        } finally {
          setGpsPrefillLoading(false);
        }
      } catch (error) {
        console.log("Initial location setup failed:", error);
        setGpsPrefillLoading(false);
      }
    })();
  }, [params.mode, user?.name, user?.phone]);


  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "location" && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
          setPendingMapLocation(prev => ({
            latitude: Number(data.lat),
            longitude: Number(data.lng),
            accuracy: prev?.accuracy,
          }));
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await api.addresses();
      setAddresses(data || []);

      const stored = await AsyncStorage.getItem("selected_address");
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedId = parsed.id || parsed._id;
        setSelectedAddrId(storedId ? String(storedId) : null);
      } else if (user?.activeAddress) {
        const activeId = user.activeAddress.id || user.activeAddress._id;
        setSelectedAddrId(activeId ? String(activeId) : null);
      }
    } catch (e) {
      console.log("Failed to load addresses", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (selectedAddr: any) => {
    const formattedAddressStr = `${selectedAddr.label || 'Home'} · ${selectedAddr.line1 || selectedAddr.city}`;
    
    try {
      await AsyncStorage.setItem("selected_address", JSON.stringify(selectedAddr));
    } catch (err) {
      console.log("Error saving active address:", err);
    }

    if (setUser) {
      setUser({
        ...user,
        activeAddress: selectedAddr,
        address: formattedAddressStr
      });
    }

    router.back();
  };


  const openDetailsAfterMap = async (location: { latitude: number; longitude: number; accuracy?: number }) => {
    setMapVisible(false);
    setPendingMapLocation(location);
    setLocationCaptured(location);
    setLocationError("");
    setGpsPrefillLoading(true);

    let profileName = user?.name || "";
    let profilePhone = user?.phone || "";
    try {
      const profile = await api.me();
      profileName = profileName || profile?.name || "";
      profilePhone = profilePhone || profile?.phone || "";
    } catch {}

    setFormData(prev => ({
      ...prev,
      full_name: profileName || prev.full_name,
      phone: normalizeMobile(profilePhone) || normalizeMobile(prev.phone),
    }));

    try {
      const geo = await reverseGeocodeDevice(location.latitude, location.longitude);
      setFormData(prev => ({
        ...prev,
        line1: geo?.line1 || "",
        line2: geo?.line2 || "",
        district: geo?.district || prev.district,
        city: geo?.city || geo?.district || prev.city,
        state: geo?.state || prev.state,
        pincode: geo?.pincode || prev.pincode,
      }));
    } catch {
      setLocationError("Location set hai. Address details manually fill kar sakte hain.");
    } finally {
      setGpsPrefillLoading(false);
    }
    setFormVisible(true);
  };

  const handleOpenForm = (address?: any) => {
    setLocationCaptured(null);
    setLocationError("");
    setExistingLocationSaved(Boolean(address?.has_location));

    if (address) {
      const addressId = address.id || address._id;
      setEditingId(addressId ? String(addressId) : null);
      setFormData({
        label: address.label || "Home",
        full_name: address.full_name || address.name || "",
        line1: address.line1 || address.address || "",
        landmark: address.landmark || "",
        district: address.district || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode ? String(address.pincode) : "",
        phone: address.phone ? String(address.phone) : ""
      });
    } else {
      setEditingId(null);
      setFormData({ label: "Home", full_name: user?.name || "", line1: "", line2: "", landmark: "", district: "", city: "", state: "", pincode: "", phone: normalizeMobile(user?.phone || "") });
    }
    if (!address) {
      setFormVisible(false);
      setMapVisible(true);
      setLocationError("");
      setPendingMapLocation(null);
      setTimeout(() => {
        getCurrentLocation().catch(() => {});
      }, 0);
    } else {
      setFormVisible(true);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && !window.isSecureContext) {
          throw new Error("Location requires a secure HTTPS connection. Please open https://kmtbazaar.tech.");
        }
        if (!navigator.geolocation) {
          throw new Error("This browser does not support location access.");
        }

        const result = await new Promise<{ latitude: number; longitude: number; accuracy?: number }>((resolve, reject) => {
          let watchId: number | null = null;
          let best: { latitude: number; longitude: number; accuracy?: number } | null = null;
          let settled = false;

          const finish = (value?: { latitude: number; longitude: number; accuracy?: number }, error?: Error) => {
            if (settled) return;
            settled = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            window.clearTimeout(timeoutId);
            if (error) reject(error);
            else resolve(value || best as { latitude: number; longitude: number; accuracy?: number });
          };

          const timeoutId = window.setTimeout(() => {
            if (best && Number.isFinite(best.accuracy) && (best.accuracy as number) <= 150) {
              finish(best);
            } else {
              finish(undefined, new Error("Precise GPS is not available yet. Turn on Location/GPS and try again."));
            }
          }, 30000);

          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const accuracy = Number(position.coords.accuracy);
              const current = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
              };

              if (!best || (current.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) {
                best = current;
              }

              if ((current.accuracy ?? Infinity) <= 75) {
                finish(current);
              }
            },
            (error) => {
              const messages: Record<number, string> = {
                1: "Location permission was denied. Allow location access for KMT Bazaar and try again.",
                2: "Turn on device GPS/location and try again.",
                3: "Precise GPS timed out. Turn on Location/GPS and try again.",
              };
              finish(undefined, new Error(messages[error?.code] || error?.message || "Could not fetch current location."));
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
        });

        setLocationCaptured(result);
        setPendingMapLocation(result);
        setExistingLocationSaved(false);
        return result;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Location permission is required. Allow KMT Bazaar to use your location and try again.");
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
      };
      setLocationCaptured(result);
      setPendingMapLocation(result);
      setExistingLocationSaved(false);
      return result;
    } catch (e: any) {
      const message = e?.message || "Could not fetch current location.";
      setLocationError(message);
      throw new Error(message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    setSaveError("");

    const requiredFields: Array<[string, string]> = [
      ["Receiver's Name", formData.full_name],
      ["Street / House No.", formData.line1],
      ["Area / Street", formData.line2],
      ["District", formData.district],
      ["City", formData.city],
      ["State", formData.state],
      ["Pincode", formData.pincode],
      ["Mobile Number", formData.phone],
    ];

    const missingField = requiredFields.find(([, value]) => !value?.trim());
    if (missingField) {
      const message = `${missingField[0]} is required. Please fill all * marked fields. Nearby / Landmark is optional.`;
      setSaveError(message);
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Mandatory field required", message);
      }
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

    const saveData = {
      ...formData,
      city: formData.city || formData.district,
    };

    try {
      if (editingId) {
        await api.updateAddress(editingId, saveData);
      } else {
        if (!locationCaptured) {
          Alert.alert("Location Required", "Please set your current location before saving this address.");
          return;
        }

        await api.createAddress({
          ...saveData,
          latitude: locationCaptured.latitude,
          longitude: locationCaptured.longitude,
          is_default: addresses.length === 0,
        });
      }

      setFormVisible(false);
      setEditingId(null);
      setLocationCaptured(null);
      setLocationError("");
      setExistingLocationSaved(false);
      setGpsPrefillLoading(false);
      loadAddresses();
    } catch (e: any) {
      console.log("ADDRESS SAVE ERROR:", e);
      Alert.alert("Address Error", e.message || "Could not save address.");
    }
  };


  // 🔥 FIXED DELETE HANDLER (WEB & MOBILE COMPATIBLE)
  const handleDelete = async (item: any) => {
    const targetId = String(item.id || item._id);

    const executeDelete = async () => {
      try {
        setLoading(true);
        await api.deleteAddress(targetId);

        if (selectedAddrId === targetId) {
          await AsyncStorage.removeItem("selected_address");
          setSelectedAddrId(null);
        }
        
        await loadAddresses();
      } catch (e: any) {
        console.log("DELETE API ERROR:", e);
        Alert.alert("Error", e.message || "Failed to delete address");
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this address?")) {
        executeDelete();
      }
    } else {
      Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: executeDelete
        }
      ]);
    }
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
          const itemId = String(item.id || item._id);
          const isSelected = selectedAddrId === itemId || String(user?.activeAddress?.id || user?.activeAddress?._id) === itemId;

          return (
            <View style={[s.card, isSelected && s.cardSelected]}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleSelectAddress(item)}
                style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}
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

                <Text style={s.nameText}>{item.full_name || item.name}</Text>
                <Text style={s.addressText}>{item.line1 || item.address}</Text>
                <Text style={s.addressText}>{item.city}, {item.state} - {item.pincode}</Text>
                <Text style={s.phoneText}>Phone: {item.phone}</Text>
                <View style={[s.locationBadge, item.has_location ? s.locationBadgeOk : s.locationBadgeWarn]}>
                  <MaterialCommunityIcons name={item.has_location ? "crosshairs-gps" : "map-marker-alert"} size={14} color={item.has_location ? "#15803D" : "#B45309"} />
                  <Text style={[s.locationBadgeText, { color: item.has_location ? "#15803D" : "#B45309" }]}>
                    {item.has_location ? "GPS location saved" : "GPS location required"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={s.actionRow}>
                <TouchableOpacity 
                  activeOpacity={0.6}
                  onPress={() => handleOpenForm(item)} 
                  style={s.actionBtn}
                >
                  <Text style={s.actionTextEdit}>EDIT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.6}
                  onPress={() => handleDelete(item)} 
                  style={[s.actionBtn, { borderLeftWidth: 1, borderColor: COLORS.border }]}
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


      <Modal visible={mapVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={s.mapScreen} edges={["top", "bottom"]}>
          <View style={s.mapHeader}>
            <TouchableOpacity onPress={() => setMapVisible(false)} style={s.mapBackBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={s.mapTitle}>Set delivery location</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.mapWrap}>
            {Platform.OS === "web" ? (
              pendingMapLocation ? (
                <iframe
                  title="Set delivery location"
                  srcDoc={buildMapHtml(pendingMapLocation.latitude, pendingMapLocation.longitude)}
                  style={{ width: "100%", height: "100%", border: 0 } as any}
                />
              ) : (
                <View style={s.mapLoading}>
                  <ActivityIndicator size="large" color={COLORS.brand} />
                  <Text style={s.mapLoadingText}>Getting your current location…</Text>
                </View>
              )
            ) : (
              pendingMapLocation ? (
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: buildMapHtml(pendingMapLocation.latitude, pendingMapLocation.longitude) }}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data || "{}");
                      if (data?.type === "location" && Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
                        setPendingMapLocation(prev => ({
                          latitude: Number(data.lat),
                          longitude: Number(data.lng),
                          accuracy: prev?.accuracy,
                        }));
                      }
                    } catch {}
                  }}
                  style={{ flex: 1 }}
                />
              ) : (
                <View style={s.mapLoading}>
                  <ActivityIndicator size="large" color={COLORS.brand} />
                  <Text style={s.mapLoadingText}>Getting your current location…</Text>
                </View>
              )
            )}
            <View pointerEvents="none" style={s.centerPin}>
              <MaterialCommunityIcons name="map-marker" size={48} color="#E11D48" />
            </View>
            <View pointerEvents="none" style={s.mapHint}>
              <Text style={s.mapHintText}>Move the map until the pin is exactly on your home.</Text>
            </View>
          </View>

          <View style={s.mapFooter}>
            <View style={s.mapSelectedRow}>
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#15803D" />
              <Text style={s.mapSelectedText}>{pendingMapLocation ? "Location selected" : "Finding your location…"}</Text>
            </View>
            <TouchableOpacity
              disabled={!pendingMapLocation}
              onPress={() => pendingMapLocation && openDetailsAfterMap(pendingMapLocation)}
              style={[s.confirmLocationBtn, !pendingMapLocation && { opacity: 0.5 }]}
            >
              <Text style={s.confirmLocationText}>CONFIRM LOCATION</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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

              <FieldLabel text="Receiver's Name" required />
              <TextInput style={s.input} placeholder="Receiver's Name *" value={formData.full_name} onChangeText={t => setFormData({ ...formData, full_name: t })} />
              <FieldLabel text="Mobile No." required />
              <TextInput style={s.input} placeholder="Mobile No. *" keyboardType="phone-pad" maxLength={10} value={formData.phone} onChangeText={t => setFormData({ ...formData, phone: normalizeMobile(t) })} />
              <FieldLabel text="House No." required />
              <TextInput style={s.input} placeholder="House No. *" value={formData.line1} onChangeText={t => setFormData({ ...formData, line1: t })} />
              <FieldLabel text="Area / Street" required />
              <TextInput style={s.input} placeholder="Area / Street *" value={formData.line2 || ""} onChangeText={t => setFormData({ ...formData, line2: t })} />
              <FieldLabel text="Nearby / Landmark" />
              <TextInput style={s.input} placeholder="Nearby / Landmark (optional)" value={formData.landmark} onChangeText={t => setFormData({ ...formData, landmark: t })} />
              <FieldLabel text="Village" required />
              <TextInput style={s.input} placeholder="Village *" value={formData.district} onChangeText={t => setFormData({ ...formData, district: t })} />

              <FieldLabel text="State" required />
              <TextInput style={s.input} placeholder="State *" value={formData.state} onChangeText={t => setFormData({ ...formData, state: t })} />

              <View style={s.fieldRow}>
                <View style={s.fieldHalf}><FieldLabel text="Pincode" required /><TextInput style={s.input} placeholder="Pincode *" keyboardType="number-pad" maxLength={6} value={formData.pincode} onChangeText={t => setFormData({ ...formData, pincode: t.replace(/[^0-9]/g, '') })} /></View>
                <View style={s.fieldHalf}><View /></View>
              </View>

              <Text style={s.requiredNote}>* Mandatory field  ·  Nearby / Landmark is optional</Text>
              {!!saveError && <Text style={s.formError}>{saveError}</Text>}

              {gpsPrefillLoading && (
                <View style={s.gpsLoadingRow}>
                  <ActivityIndicator size="small" color={COLORS.brand} />
                  <Text style={s.gpsLoadingText}>Finding nearby street, district, city and pincode…</Text>
                </View>
              )}

              <View style={s.locationCard}>
                <View style={s.locationCardHeader}>
                  <View style={s.locationIcon}><MaterialCommunityIcons name={locationCaptured ? "crosshairs-gps" : "map-marker-radius"} size={20} color={locationCaptured ? "#15803D" : COLORS.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.locationCardTitle}>Delivery location</Text>
                    <Text style={s.locationCardText}>
                      {locationCaptured ? "Current GPS captured for this address." : existingLocationSaved ? "GPS is already saved. Refresh it with the button below when needed." : "Current GPS is required for delivery."}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => getCurrentLocation().catch(() => {})} style={[s.locationBtn, locationCaptured && s.locationBtnSuccess]} disabled={locationLoading} activeOpacity={0.8}>
                  {locationLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name={locationCaptured ? "check-circle" : "crosshairs-gps"} size={18} color="#fff" />}
                  <Text style={s.locationBtnText}>{locationLoading ? "GETTING LOCATION..." : locationCaptured ? "LOCATION CAPTURED" : "USE MY CURRENT LOCATION"}</Text>
                </TouchableOpacity>
                {!!locationCaptured && <Text style={s.locationSuccessText}>GPS ready{locationCaptured.accuracy ? " · ±" + Math.round(locationCaptured.accuracy) + " m" : ""}. This will be used for delivery.</Text>}
                {!!locationError && <Text style={s.locationErrorText}>{locationError}</Text>}
                <Text style={s.locationPrivacyText}>Exact GPS is used for delivery and is not shown to other customers.</Text>
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


function buildMapHtml(latitude: number, longitude: number) {
  const lat = Number.isFinite(Number(latitude)) ? Number(latitude) : 20.5937;
  const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : 78.9629;
  return [
    "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no\">",
    "<link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\">",
    "<style>html,body,#map{margin:0;width:100%;height:100%;overflow:hidden}.leaflet-control-attribution{font-size:9px}</style>",
    "</head><body><div id=\"map\"></div>",
    "<script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"><\\/script>",
    "<script>(function(){var start=[" + lat + "," + lng + "];var map=L.map('map',{zoomControl:true}).setView(start,18);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors'}).addTo(map);var marker=L.marker(start,{draggable:true}).addTo(map);function send(){var p=marker.getLatLng();var msg=JSON.stringify({type:'location',lat:p.lat,lng:p.lng});try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg);}}catch(e){}try{if(window.parent&&window.parent!==window){window.parent.postMessage(msg,'*');}}catch(e){}}marker.on('dragend',send);map.on('moveend',function(){var c=map.getCenter();marker.setLatLng(c);send();});send();})();<\\/script>",
    "</body></html>"
  ].join("");
}

function FieldLabel({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <Text style={s.fieldLabel}>
      {text}{required ? <Text style={s.requiredStar}> *</Text> : null}
    </Text>
  );
}

const s = StyleSheet.create({

  mapScreen: { flex: 1, backgroundColor: "#fff" },
  mapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  mapBackBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  mapTitle: { fontSize: 17, fontWeight: "900", color: COLORS.text },
  mapWrap: { flex: 1, position: "relative", overflow: "hidden" },
  centerPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -24, marginTop: -42 },
  mapHint: { position: "absolute", top: 14, left: 18, right: 18, alignItems: "center" },
  mapHintText: { backgroundColor: "rgba(255,255,255,0.94)", color: COLORS.text, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, fontSize: 12, fontWeight: "800" },
  mapFooter: { backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderColor: COLORS.border },
  mapSelectedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  mapSelectedText: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  confirmLocationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 14 },
  confirmLocationText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  mapLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapLoadingText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "700" },
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  emptyText: { textAlign: "center", marginTop: 40, color: COLORS.textMuted, fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, ...shadow.soft, overflow: "hidden" },
  cardSelected: { borderColor: COLORS.brand, backgroundColor: "#fffaf5" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: SPACING.sm, borderBottomWidth: 1, borderColor: COLORS.surfaceSecondary },
  labelBadge: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.brandLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, gap: 4 },
  labelText: { color: COLORS.brand, fontSize: 12, fontWeight: "700" },
  selectedBadge: { backgroundColor: COLORS.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  selectedBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  nameText: { color: COLORS.text, fontSize: 16, fontWeight: "800", paddingTop: 10, paddingBottom: 2 },
  addressText: { color: COLORS.text, fontSize: 14, paddingTop: 2, lineHeight: 20 },
  phoneText: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 6, fontWeight: "600" },
  locationBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.pill, marginBottom: 10, borderWidth: 1 },
  locationBadgeOk: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  locationBadgeWarn: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  locationBadgeText: { fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", borderTopWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
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
  fieldLabel: { color: COLORS.text, fontSize: 12, fontWeight: "800", marginBottom: 5 },
  requiredStar: { color: "#DC2626", fontWeight: "900" },
  input: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, borderRadius: RADIUS.sm, marginBottom: 12, fontSize: 14, color: COLORS.text },
  locationCard: { marginTop: 6, padding: 12, borderRadius: RADIUS.md, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  locationCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  locationIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  locationCardTitle: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  locationCardText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 2 },
  locationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, paddingVertical: 11, borderRadius: RADIUS.pill, backgroundColor: COLORS.brand },
  locationBtnSuccess: { backgroundColor: "#16A34A" },
  locationBtnText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  locationSuccessText: { color: "#15803D", fontSize: 10, fontWeight: "700", marginTop: 7 },
  locationErrorText: { color: "#B91C1C", fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 7 },
  locationPrivacyText: { color: COLORS.textMuted, fontSize: 9, lineHeight: 14, marginTop: 7 },
  requiredNote: { color: COLORS.textMuted, fontSize: 10, marginBottom: 8 },
  formError: { color: "#DC2626", fontSize: 12, lineHeight: 18, fontWeight: "800", marginBottom: 10 },
  fieldRow: { flexDirection: "row", gap: 8, width: "100%" },
  fieldHalf: { flex: 1, minWidth: 0 },
  gpsLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  gpsLoadingText: { flex: 1, color: COLORS.brand, fontSize: 10, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary },
  cancelBtnText: { color: COLORS.text, fontWeight: "700" },
  saveBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.brand },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
