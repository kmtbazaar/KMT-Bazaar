import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type DateTimePickerFieldProps = {
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  appearance?: "light" | "dark";
};

const pad = (value: number) => String(value).padStart(2, "0");

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateLabel(value: string) {
  if (!value) return "";
  return parseDate(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DateTimePickerField({
  mode,
  value,
  onChange,
  placeholder,
  appearance = "dark",
}: DateTimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = parseDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [hour, setHour] = useState(value.split(":")[0] || "09");
  const [minute, setMinute] = useState(value.split(":")[1] || "00");

  useEffect(() => {
    if (!open) return;
    const date = parseDate(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setHour(value.split(":")[0] || "09");
    setMinute(value.split(":")[1] || "00");
  }, [open, mode, value]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const calendarCells = useMemo(
    () => [
      ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `blank-${index}`, day: 0 })),
      ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
    ],
    [firstWeekday, daysInMonth]
  );
  const selectedDate = value ? dateValue(parseDate(value)) : "";
  const selectedTime = `${hour}:${minute}`;
  const modalTitle = mode === "date" ? "Select travel date" : "Select pickup time";
  const fieldLabel = mode === "date" ? "Travel date" : "Pickup time";

  if (Platform.OS === "web") {
    return React.createElement("input", {
      type: mode,
      value: value || "",
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
      "aria-label": fieldLabel,
      style: {
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        height: 48,
        padding: "0 12px",
        border: "1px solid #2b3039",
        borderRadius: 12,
        backgroundColor: appearance === "light" ? "#ffffff" : "#171a20",
        color: appearance === "light" ? "#0f172a" : "#ffffff",
        fontSize: 14,
        fontFamily: "inherit",
        colorScheme: appearance,
        cursor: "pointer",
      },
    });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${fieldLabel.toLowerCase()}`}
        onPress={() => setOpen(true)}
        style={[styles.field, appearance === "light" && styles.fieldLight]}
      >
        <Text style={[styles.fieldText, appearance === "light" && styles.fieldTextLight, !value && styles.placeholder, !value && appearance === "light" && styles.placeholderLight]} numberOfLines={1}>
          {value ? (mode === "date" ? dateLabel(value) : value) : placeholder || `Select ${fieldLabel.toLowerCase()}`}
        </Text>
        <MaterialCommunityIcons
          name={mode === "date" ? "calendar-month-outline" : "clock-outline"}
          size={19}
          color={appearance === "light" ? "#64748b" : "#a6abb4"}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={20} color="#ffffff" />
              </Pressable>
            </View>

            {mode === "date" ? (
              <>
                <View style={styles.monthHeader}>
                  <Pressable
                    onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
                    style={styles.monthButton}
                    accessibilityLabel="Previous month"
                  >
                    <MaterialCommunityIcons name="chevron-left" size={23} color="#ffffff" />
                  </Pressable>
                  <Text style={styles.monthTitle}>
                    {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </Text>
                  <Pressable
                    onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}
                    style={styles.monthButton}
                    accessibilityLabel="Next month"
                  >
                    <MaterialCommunityIcons name="chevron-right" size={23} color="#ffffff" />
                  </Pressable>
                </View>
                <View style={styles.calendarGrid}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <View key={`weekday-${index}`} style={styles.dayCell}>
                      <Text style={styles.weekday}>{day}</Text>
                    </View>
                  ))}
                  {calendarCells.map((cell) => {
                    if (!cell.day) return <View key={cell.key} style={styles.dayCell} />;
                    const chosen = selectedDate === dateValue(new Date(year, monthIndex, cell.day));
                    return (
                      <View key={cell.key} style={styles.dayCell}>
                        <Pressable
                          onPress={() => {
                            onChange(dateValue(new Date(year, monthIndex, cell.day)));
                            setOpen(false);
                          }}
                          style={[styles.dayButton, chosen && styles.dayButtonActive]}
                        >
                          <Text style={[styles.dayText, chosen && styles.dayTextActive]}>{cell.day}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.timeHint}>Choose an hour and minute</Text>
                <View style={styles.timeColumns}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.columnLabel}>HOUR</Text>
                    <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 24 }, (_, index) => pad(index)).map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => setHour(item)}
                          style={[styles.timeOption, hour === item && styles.timeOptionActive]}
                        >
                          <Text style={[styles.timeOptionText, hour === item && styles.timeOptionTextActive]}>{item}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.columnLabel}>MINUTE</Text>
                    <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 12 }, (_, index) => pad(index * 5)).map((item) => (
                        <Pressable
                          key={item}
                          onPress={() => setMinute(item)}
                          style={[styles.timeOption, minute === item && styles.timeOptionActive]}
                        >
                          <Text style={[styles.timeOptionText, minute === item && styles.timeOptionTextActive]}>{item}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <Text style={styles.selectedTime}>{selectedTime}</Text>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => setOpen(false)} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onChange(selectedTime);
                      setOpen(false);
                    }}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneText}>Set time</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#2b3039",
    borderRadius: 12,
    backgroundColor: "#171a20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fieldText: { color: "#ffffff", fontSize: 14, flex: 1 },
  fieldLight: { backgroundColor: "#ffffff", borderColor: "#dbe4ee" },
  fieldTextLight: { color: "#0f172a" },
  placeholder: { color: "#777d87" },
  placeholderLight: { color: "#94a3b8" },
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,.72)", padding: 18 },
  pickerCard: { width: "100%", maxWidth: 390, padding: 16, borderRadius: 20, backgroundColor: "#111318", borderWidth: 1, borderColor: "#2b3039" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  closeButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#242833", alignItems: "center", justifyContent: "center" },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#242833", alignItems: "center", justifyContent: "center" },
  monthTitle: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.2857%", minHeight: 39, alignItems: "center", justifyContent: "center" },
  weekday: { color: "#8e949f", fontSize: 12, fontWeight: "800" },
  dayButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayButtonActive: { backgroundColor: "#ef233c" },
  dayText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  dayTextActive: { color: "#ffffff", fontWeight: "900" },
  timeHint: { color: "#a6abb4", fontSize: 12, marginBottom: 12 },
  timeColumns: { flexDirection: "row", gap: 12 },
  timeColumn: { flex: 1 },
  columnLabel: { color: "#a6abb4", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 7, textAlign: "center" },
  timeList: { maxHeight: 220, borderRadius: 12, backgroundColor: "#171a20", padding: 5 },
  timeOption: { minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, marginBottom: 3 },
  timeOptionActive: { backgroundColor: "#ef233c" },
  timeOptionText: { color: "#ffffff", fontSize: 13 },
  timeOptionTextActive: { fontWeight: "900" },
  selectedTime: { color: "#ffffff", fontSize: 25, fontWeight: "900", textAlign: "center", marginTop: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, backgroundColor: "#242833" },
  cancelText: { color: "#ffffff", fontWeight: "800" },
  doneButton: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, backgroundColor: "#ef233c" },
  doneText: { color: "#ffffff", fontWeight: "900" },
});
