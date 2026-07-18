import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Switch, Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const ROLE_LABEL: Record<string, string> = { customer: "Customer", vendor: "Vendor", delivery: "Delivery", admin: "Admin" };
const ROLE_COLOR: Record<string, string> = { customer: "#2563EB", vendor: "#F97316", delivery: "#16A34A", admin: "#9333EA" };

export default function AdminUsers() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const allUsers = await adminApi.users(role as string);
      const list = (allUsers || []) as any[];

      if (role === "vendor") {
        const filteredUsers = list.filter((u: any) => {
          const name = (u.name || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          const isDemo = name.includes("demo") || email.includes("demo");
          const hiddenSeedEmail = email === "vendor@kmtbazaar.com";
          return !isDemo && !hiddenSeedEmail;
        });
        setUsers(filteredUsers);
      } else {
        setUsers(list);
      }
    } catch (e) {
      console.log(e);
    }
  }, [role]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // 🔥 Master Control Toggle (With Suspend/Unsuspend Confirmation)
  const toggle = async (id: string, currentActive: boolean, userRole: string, name: string) => {
    if (userRole === "vendor") {
      if (currentActive !== false) {
        Alert.alert("Suspend Vendor?", `Are you sure you want to SUSPEND '${name}'? All their stores will go offline immediately.`, [
          { text: "Cancel", style: "cancel" },
          { text: "Suspend", style: "destructive", onPress: async () => { await adminApi.toggleUser(id); load(); } }
        ]);
      } else {
        Alert.alert("Unsuspend Vendor?", `Are you sure you want to UNSUSPEND '${name}' and make them active again?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Unsuspend", style: "default", onPress: async () => { await adminApi.toggleUser(id); load(); } }
        ]);
      }
    } else {
      await adminApi.toggleUser(id);
      load();
    }
  };

  const title = role ? `${ROLE_LABEL[role as string] || "Users"}s` : "All Users";

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-users-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<Text style={s.empty}>No users</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card} testID={`user-${item.id}`}>
            <View style={[s.avatar, { backgroundColor: (ROLE_COLOR[item.role] || "#999") + "22" }]}>
              <Text style={[s.avatarText, { color: ROLE_COLOR[item.role] || "#666" }]}>{(item.name || "?").charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>{item.email || item.phone}</Text>
              <View style={[s.rolePill, { backgroundColor: (ROLE_COLOR[item.role] || "#999") + "22" }]}>
                <Text style={[s.roleText, { color: ROLE_COLOR[item.role] || "#666" }]}>{ROLE_LABEL[item.role] || item.role}</Text>
              </View>
            </View>
            <Switch
              testID={`toggle-${item.id}`}
              value={item.active !== false}
              onValueChange={() => toggle(item.id, item.active !== false, item.role, item.name)}
              trackColor={{ true: COLORS.success, false: COLORS.borderStrong }}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", fontSize: 18 },
  name: { fontWeight: "700", color: COLORS.text },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});