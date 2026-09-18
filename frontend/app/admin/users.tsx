import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Switch,
  Alert,
  Platform,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  delivery: "Delivery",
  admin: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  customer: "#2563EB",
  vendor: "#F97316",
  delivery: "#16A34A",
  admin: "#9333EA",
};

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

          const isDemo =
            name.includes("demo") ||
            email.includes("demo");

          const hiddenSeedEmail =
            email === "vendor@kmtbazaar.com";

          return !isDemo && !hiddenSeedEmail;
        });

        setUsers(filteredUsers);
      } else {
        setUsers(list);
      }
    } catch (e) {
      console.log("Load users error:", e);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (
    id: string,
    currentActive: boolean,
    userRole: string,
    name: string
  ) => {
    try {
      if (userRole === "vendor") {
        if (currentActive !== false) {
          Alert.alert(
            "Suspend Vendor?",
            `Are you sure you want to SUSPEND '${name}'? All their stores will go offline immediately.`,
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Suspend",
                style: "destructive",
                onPress: async () => {
                  await adminApi.toggleUser(id);
                  await load();
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Unsuspend Vendor?",
            `Are you sure you want to UNSUSPEND '${name}' and make them active again?`,
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Unsuspend",
                style: "default",
                onPress: async () => {
                  await adminApi.toggleUser(id);
                  await load();
                },
              },
            ]
          );
        }
      } else {
        await adminApi.toggleUser(id);
        await load();
      }
    } catch (e: any) {
      console.log("Toggle user error:", e);

      if (Platform.OS === "web") {
        window.alert(
          `Update Failed:\n\n${
            e?.message ||
            "Unable to update this user."
          }`
        );
      } else {
        Alert.alert(
          "Update Failed",
          e?.message ||
            "Unable to update this user."
        );
      }
    }
  };

  const deleteUser = async (
    id: string,
    userRole: string,
    name: string
  ) => {
    const message =
      userRole === "vendor"
        ? `Are you sure you want to DELETE '${name}'?\n\nThis will also delete their stores and products.`
        : `Are you sure you want to DELETE '${name}'?\n\nThis action cannot be undone.`;

    /*
     * WEB / VERCEL
     *
     * Alert.alert() web par reliable nahi hota.
     * Isliye Vercel/web ke liye browser confirm use kar rahe hain.
     */
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Delete User?\n\n${message}`
      );

      if (!confirmed) {
        return;
      }

      try {
        console.log(
          "DELETE USER REQUEST:",
          id,
          userRole,
          name
        );

        await adminApi.deleteUser(id);

        window.alert(
          `${name} has been deleted successfully.`
        );

        await load();
      } catch (e: any) {
        console.log(
          "Delete user error:",
          e
        );

        window.alert(
          `Delete Failed:\n\n${
            e?.message ||
            "Unable to delete this user."
          }`
        );
      }

      return;
    }

    /*
     * ANDROID / IOS
     */
    Alert.alert(
      "Delete User?",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log(
                "DELETE USER REQUEST:",
                id,
                userRole,
                name
              );

              await adminApi.deleteUser(id);

              Alert.alert(
                "Deleted",
                `${name} has been deleted successfully.`
              );

              await load();
            } catch (e: any) {
              console.log(
                "Delete user error:",
                e
              );

              Alert.alert(
                "Delete Failed",
                e?.message ||
                  "Unable to delete this user."
              );
            }
          },
        },
      ]
    );
  };

  const title = role
    ? `${ROLE_LABEL[role as string] || "Users"}s`
    : "All Users";

  return (
    <SafeAreaView
      style={s.root}
      edges={["top"]}
      testID="admin-users-screen"
    >
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={15}
          style={s.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={s.title}>
          {title}
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 40,
        }}
        ListEmptyComponent={
          <Text style={s.empty}>
            No users
          </Text>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 10 }} />
        )}
        renderItem={({ item }) => (
          <View
            style={s.card}
            testID={`user-${item.id}`}
          >
            <View
              style={[
                s.avatar,
                {
                  backgroundColor:
                    (ROLE_COLOR[item.role] ||
                      "#999") + "22",
                },
              ]}
            >
              <Text
                style={[
                  s.avatarText,
                  {
                    color:
                      ROLE_COLOR[item.role] ||
                      "#666",
                  },
                ]}
              >
                {(item.name || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={s.userInfo}>
              <Text
                style={s.name}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text
                style={s.meta}
                numberOfLines={1}
              >
                {item.email || item.phone}
              </Text>

              <View
                style={[
                  s.rolePill,
                  {
                    backgroundColor:
                      (ROLE_COLOR[item.role] ||
                        "#999") + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    s.roleText,
                    {
                      color:
                        ROLE_COLOR[item.role] ||
                        "#666",
                    },
                  ]}
                >
                  {ROLE_LABEL[item.role] ||
                    item.role}
                </Text>
              </View>
            </View>

            <View style={s.actions}>
              <Switch
                testID={`toggle-${item.id}`}
                value={item.active !== false}
                onValueChange={() =>
                  toggle(
                    item.id,
                    item.active !== false,
                    item.role,
                    item.name
                  )
                }
                trackColor={{
                  true: COLORS.success,
                  false:
                    COLORS.borderStrong,
                }}
              />

              {item.role !== "admin" && (
                <Pressable
                  testID={`delete-${item.id}`}
                  hitSlop={{
                    top: 15,
                    bottom: 15,
                    left: 15,
                    right: 15,
                  }}
                  onPress={() => {
                    console.log(
                      "DELETE BUTTON PRESSED:",
                      item.id
                    );

                    deleteUser(
                      item.id,
                      item.role,
                      item.name
                    );
                  }}
                  style={({ pressed }) => [
                    s.deleteButton,
                    pressed &&
                      s.deleteButtonPressed,
                  ]}
                >
                  <View
                    pointerEvents="none"
                    style={s.deleteInner}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={28}
                      color="#DC2626"
                    />
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor:
      COLORS.surfaceSecondary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#fff",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  empty: {
    textAlign: "center",
    marginTop: 80,
    color: COLORS.textMuted,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    fontWeight: "800",
    fontSize: 18,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontWeight: "700",
    color: COLORS.text,
  },

  meta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    marginTop: 6,
  },

  roleText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 2,
    borderColor: "#FCA5A5",
    elevation: 3,
  },

  deleteInner: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonPressed: {
    opacity: 0.5,
    transform: [
      {
        scale: 0.94,
      },
    ],
  },
});