import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const ICON: Record<string, string> = { order: "package-variant", promo: "tag-outline", delivery: "moped" };

export default function Notifications() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => { try { setList(await api.notifications()); } catch {} })();
  }, []));

  const onTap = async (n: any) => {
    if (!n.read) { await api.markNotifRead(n.id); setList((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x)); }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="notifications-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<View style={s.empty}><MaterialCommunityIcons name="bell-off-outline" size={64} color={COLORS.textMuted} /><Text style={s.emptyT}>No notifications yet</Text></View>}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 50)}>
            <Pressable testID={`notif-${item.id}`} onPress={() => onTap(item)} style={[s.card, !item.read && s.cardUnread]}>
              <View style={[s.iconWrap, { backgroundColor: item.read ? COLORS.surfaceTertiary : COLORS.brandLight }]}>
                <MaterialCommunityIcons name={(ICON[item.type] || "bell") as any} size={20} color={COLORS.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardBody}>{item.body}</Text>
                <Text style={s.cardTime}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              {!item.read && <View style={s.dot} />}
            </Pressable>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { flexDirection: "row", gap: 12, backgroundColor: "#fff", padding: 14, marginBottom: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "flex-start" },
  cardUnread: { backgroundColor: COLORS.brandLight, borderColor: COLORS.brand },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "800", color: COLORS.text },
  cardBody: { color: COLORS.textSecondary, marginTop: 2, fontSize: 13 },
  cardTime: { color: COLORS.textMuted, marginTop: 4, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 },
  empty: { alignItems: "center", marginTop: 80, gap: 10 },
  emptyT: { color: COLORS.textMuted, fontWeight: "600" },
});
