import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminBanners() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({ title: "", subtitle: "", cta: "Shop Now", image: "", color: "#2563EB", order: "99" });

  const load = useCallback(async () => { try { setBanners(await api.banners()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    await adminApi.createBanner({ ...f, order: parseInt(f.order) || 99 });
    setModal(false);
    setF({ title: "", subtitle: "", cta: "Shop Now", image: "", color: "#2563EB", order: "99" });
    load();
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-banners-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Banners ({banners.length})</Text>
        <Pressable testID="add-banner-btn" onPress={() => setModal(true)} hitSlop={10}>
          <MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>
      <FlatList
        data={banners}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View style={s.banner}>
            <Image source={{ uri: item.image }} style={s.bImg} contentFit="cover" />
            <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.1)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={s.bText}>
              <Text style={s.bSub}>{item.subtitle}</Text>
              <Text style={s.bTitle}>{item.title}</Text>
              <View style={[s.bCta, { backgroundColor: item.color }]}><Text style={s.bCtaText}>{item.cta}</Text></View>
            </View>
            <Pressable testID={`del-banner-${item.id}`} onPress={async () => { await adminApi.deleteBanner(item.id); load(); }} style={s.delBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      />
      <Modal visible={modal} transparent animationType="slide">
        <View style={ms.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={ms.sheet}>
            <View style={ms.handle} />
            <Text style={ms.title}>Add Banner</Text>
            <Input ph="Title" v={f.title} oc={(v: string) => setF({ ...f, title: v })} testID="bf-title" />
            <Input ph="Subtitle" v={f.subtitle} oc={(v: string) => setF({ ...f, subtitle: v })} testID="bf-sub" />
            <Input ph="CTA text" v={f.cta} oc={(v: string) => setF({ ...f, cta: v })} testID="bf-cta" />
            <Input ph="Image URL" v={f.image} oc={(v: string) => setF({ ...f, image: v })} testID="bf-image" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Input ph="Color #" v={f.color} oc={(v: string) => setF({ ...f, color: v })} testID="bf-color" /></View>
              <View style={{ flex: 1 }}><Input ph="Order" v={f.order} oc={(v: string) => setF({ ...f, order: v })} testID="bf-order" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setModal(false)} style={[ms.btn, ms.btnGhost]}><Text style={ms.btnGhostText}>Cancel</Text></Pressable>
              <Pressable testID="bf-save" onPress={save} style={[ms.btn, ms.btnPrimary]}><Text style={ms.btnText}>Create</Text></Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Input({ ph, v, oc, testID }: any) {
  return <TextInput testID={testID} placeholder={ph} value={v} onChangeText={oc} placeholderTextColor={COLORS.textMuted} style={ms.input} />;
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, alignSelf: "center", borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  btn: { flex: 1, padding: 14, borderRadius: RADIUS.pill, alignItems: "center" },
  btnPrimary: { backgroundColor: COLORS.brand },
  btnText: { color: "#fff", fontWeight: "800" },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: "700" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  banner: { height: 160, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: COLORS.surfaceTertiary },
  bImg: { width: "100%", height: "100%" },
  bText: { position: "absolute", left: 16, top: 20, right: 100 },
  bSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700" },
  bTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  bCta: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, alignSelf: "flex-start" },
  bCtaText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  delBtn: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(220,38,38,0.85)", alignItems: "center", justifyContent: "center" },
});
