import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import { adminApi } from "@/src/roleApi";

import {
  COLORS,
  RADIUS,
  SPACING,
} from "@/src/theme";

export default function RoojgarApplications() {
  const router = useRouter();

  const [applications, setApplications] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadApplications = useCallback(
    async () => {
      try {
        setLoading(true);

        const response =
          await adminApi.roojgarApplications();

        setApplications(response || []);
      } catch (error) {
        console.log(
          "Roojgar applications load error:",
          error
        );

        setApplications([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await loadApplications();

    setRefreshing(false);
  };

  const handleStatusChange = async (
    application: any,
    status: "pending" | "done"
  ) => {
    try {
      await adminApi.updateRoojgarStatus(
        application.id,
        status
      );

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      if (Platform.OS === "web") {
        window.alert(
          status === "done"
            ? "Application marked as Done."
            : "Application moved to Pending."
        );
      } else {
        Alert.alert(
          "Success",
          status === "done"
            ? "Application marked as Done."
            : "Application moved to Pending."
        );
      }
    } catch (error) {
      console.log(
        "Roojgar status update error:",
        error
      );

      if (Platform.OS === "web") {
        window.alert(
          "Could not update application status."
        );
      } else {
        Alert.alert(
          "Error",
          "Could not update application status."
        );
      }
    }
  };

  return (
    <View style={s.root}>
      {/* HEADER */}

      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backButton}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color="#fff"
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            Roojgar Applications
          </Text>

          <Text style={s.headerSubtitle}>
            {applications.length} application
            {applications.length === 1
              ? ""
              : "s"}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="briefcase-account-outline"
          size={28}
          color="#fff"
        />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
          />
        }
      >
        {/* LOADING */}

        {loading &&
          applications.length === 0 && (
            <View style={s.messageCard}>
              <MaterialCommunityIcons
                name="loading"
                size={30}
                color={COLORS.brand}
              />

              <Text style={s.messageTitle}>
                Loading applications...
              </Text>
            </View>
          )}

        {/* EMPTY */}

        {!loading &&
          applications.length === 0 && (
            <View style={s.messageCard}>
              <View style={s.emptyIcon}>
                <MaterialCommunityIcons
                  name="briefcase-search-outline"
                  size={34}
                  color={COLORS.textMuted}
                />
              </View>

              <Text style={s.messageTitle}>
                No Roojgar Applications
              </Text>

              <Text style={s.messageText}>
                New applications submitted from
                the Roojgar form will appear here.
              </Text>
            </View>
          )}

        {/* APPLICATIONS */}

        {applications.map(
          (
            application: any,
            index: number
          ) => {
            const status =
              application?.status === "done"
                ? "done"
                : "pending";

            return (
              <View
                key={
                  application?.id ||
                  `roojgar-${index}`
                }
                style={s.applicationCard}
              >
                {/* NUMBER + NAME */}

                <View style={s.cardHeader}>
                  <View style={s.numberBadge}>
                    <Text style={s.numberText}>
                      #{index + 1}
                    </Text>
                  </View>

                  <View style={s.nameContainer}>
                    <Text
                      style={s.name}
                      numberOfLines={2}
                    >
                      {application?.name ||
                        "Name not provided"}
                    </Text>

                    <Text style={s.date}>
                      Applied:{" "}
                      {formatApplicationDate(
                        application?.appliedAt ||
                          application?.created_at
                      )}
                    </Text>
                  </View>
                </View>

                {/* FORM DATA */}

                <View style={s.details}>
                  <Detail
                    icon="phone-outline"
                    label="Mobile"
                    value={
                      application?.mobile ||
                      "Not provided"
                    }
                  />

                  <Detail
                    icon="briefcase-outline"
                    label="Category"
                    value={
                      application?.category ||
                      "Not provided"
                    }
                  />

                  <Detail
                    icon="map-marker-outline"
                    label="Address"
                    value={
                      application?.address ||
                      "Not provided"
                    }
                  />

                  {/* Aadhaar intentionally hidden */}
                  <Detail
                    icon="card-account-details-outline"
                    label="Aadhaar"
                    value="Protected"
                  />
                </View>

                {/* STATUS */}

                <View style={s.statusSection}>
                  <Text style={s.statusLabel}>
                    Application Status
                  </Text>

                  <View style={s.statusButtons}>
                    <Pressable
                      onPress={() =>
                        handleStatusChange(
                          application,
                          "pending"
                        )
                      }
                      style={[
                        s.statusButton,
                        s.pendingButton,
                        status === "pending" &&
                          s.pendingActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={18}
                        color={
                          status === "pending"
                            ? "#fff"
                            : "#92400E"
                        }
                      />

                      <Text
                        style={[
                          s.pendingText,
                          status === "pending" &&
                            s.activeText,
                        ]}
                      >
                        Pending
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        handleStatusChange(
                          application,
                          "done"
                        )
                      }
                      style={[
                        s.statusButton,
                        s.doneButton,
                        status === "done" &&
                          s.doneActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={18}
                        color={
                          status === "done"
                            ? "#fff"
                            : "#166534"
                        }
                      />

                      <Text
                        style={[
                          s.doneText,
                          status === "done" &&
                            s.activeText,
                        ]}
                      >
                        Done
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }
        )}
      </ScrollView>
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={19}
          color={COLORS.brand}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>
          {label}
        </Text>

        <Text
          style={s.detailValue}
          numberOfLines={4}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function formatApplicationDate(
  dateValue: any
) {
  if (!dateValue) {
    return "Date not available";
  }

  try {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return String(dateValue);
  }
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
    gap: 12,
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.lg,
    paddingTop:
      Platform.OS === "web" ? 20 : 55,
    paddingBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    marginTop: 3,
  },

  content: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },

  applicationCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  numberBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  numberText: {
    color: COLORS.brand,
    fontSize: 14,
    fontWeight: "900",
  },

  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  date: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  details: {
    marginTop: 16,
    gap: 12,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },

  statusSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  statusLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 9,
  },

  statusButtons: {
    flexDirection: "row",
    gap: 9,
  },

  statusButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },

  pendingButton: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },

  pendingActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },

  doneButton: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },

  doneActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  pendingText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "800",
  },

  doneText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },

  activeText: {
    color: "#fff",
  },

  messageCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor:
      COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  messageTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  messageText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 300,
  },
});