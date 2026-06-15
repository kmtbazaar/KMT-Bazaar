import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminCategories() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [f, setF] = useState({ name: "", icon: "tag", color: "#2563EB", image: "" });

  const load = useCallback(async () => { try { setCats(await api.categories()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = async (id: string) => { await adminApi.deleteCategory(id); load(); };
  const save = async () => {
    await adminApi.createCategory(f);
    setModal(false); setF({ name: "", icon: "tag", color: "#2563EB", image: "" }); load();
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-categories-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Categories ({cats.length})</Text>
        <Pressable testID="add-cat-btn" onPress={() => setModal(true)} hitSlop={10}>
          <MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>
      <FlatList
        data={cats}
        keyExtractor={(c) => c.id}
        numColumns={2}
        contentContainerStyle={{ padding: SPACING.lg }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <Text style={s.name}>{item.name}</Text>
            <View style={[s.colorDot, { backgroundColor: item.color }]} />
            <Pressable testID={`del-cat-${item.id}`} onPress={() => onDelete(item.id)} style={s.delBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
            </Pressable>
          </View>
        )}
      />
      <Modal visible={modal} transparent animationType="slide">
        <View style={ms.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={ms.sheet}>
            <View style={ms.handle} />
            <Text style={ms.title}>Add Category</Text>
            <Input ph="Name" v={f.name} oc={(v: string) => setF({ ...f, name: v })} testID="cf-name" />
            <Input ph="Icon (MaterialCommunityIcons name)" v={f.icon} oc={(v: string) => setF({ ...f, icon: v })} testID="cf-icon" />
            <Input ph="Color (#RRGGBB)" v={f.color} oc={(v: string) => setF({ ...f, color: v })} testID="cf-color" />
            <Input ph="Image URL" v={f.image} oc={(v: string) => setF({ ...f, image: v })} testID="cf-image" />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setModal(false)} style={[ms.btn, ms.btnGhost]}><Text style={ms.btnGhostText}>Cancel</Text></Pressable>
              <Pressable testID="cf-save" onPress={save} style={[ms.btn, ms.btnPrimary]}><Text style={ms.btnText}>Create</Text></Pressable>
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
  card: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", position: "relative" },
  img: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.surfaceTertiary },
  name: { fontWeight: "700", color: COLORS.text, marginTop: 8 },
  colorDot: { width: 24, height: 6, borderRadius: 3, marginTop: 6 },
  delBtn: { position: "absolute", top: 8, right: 8, padding: 4 },
});
