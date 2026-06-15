import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

interface Props {
  value?: string;
  onChange: (dataUri: string) => void;
  label?: string;
  aspect?: [number, number]; // crop aspect
  testID?: string;
}

export default function ImageUploader({ value, onChange, label = "Photo", aspect = [1, 1], testID }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickFrom = async (source: "library" | "camera") => {
    setErr(null);
    try {
      // permissions
      if (source === "library") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setErr("Gallery permission required");
          return;
        }
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setErr("Camera permission required");
          return;
        }
      }
      setBusy(true);
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect,
        quality: 0.7,
        base64: true,
      };
      const result = source === "library"
        ? await ImagePicker.launchImageLibraryAsync(opts)
        : await ImagePicker.launchCameraAsync(opts);
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0];
      // Prefer base64 from picker; build data URI
      let dataUri = a.uri;
      if (a.base64) {
        const mime = a.mimeType || "image/jpeg";
        dataUri = `data:${mime};base64,${a.base64}`;
      }
      onChange(dataUri);
    } catch (e: any) {
      setErr(e.message || "Failed to pick image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <View style={s.preview} testID={testID ? `${testID}-preview` : undefined}>
          {value ? (
            <Image source={{ uri: value }} style={s.img} contentFit="cover" />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={32} color={COLORS.textMuted} />
          )}
          {busy && <View style={s.busy}><ActivityIndicator color="#fff" /></View>}
        </View>
        <View style={s.btns}>
          <Pressable testID={testID ? `${testID}-gallery` : "img-gallery"} onPress={() => pickFrom("library")} style={s.btn}>
            <MaterialCommunityIcons name="image-multiple-outline" size={18} color={COLORS.brand} />
            <Text style={s.btnText}>Gallery</Text>
          </Pressable>
          <Pressable testID={testID ? `${testID}-camera` : "img-camera"} onPress={() => pickFrom("camera")} style={s.btn}>
            <MaterialCommunityIcons name="camera-outline" size={18} color={COLORS.brand} />
            <Text style={s.btnText}>Camera</Text>
          </Pressable>
          {value && (
            <Pressable testID={testID ? `${testID}-remove` : "img-remove"} onPress={() => onChange("")} style={[s.btn, s.btnRemove]}>
              <MaterialCommunityIcons name="close" size={16} color={COLORS.error} />
              <Text style={[s.btnText, { color: COLORS.error }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
      {err && <Text style={s.err}>{err}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontWeight: "700", color: COLORS.text, marginBottom: 8, fontSize: 13 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  preview: { width: 90, height: 90, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceTertiary, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  busy: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  btns: { flex: 1, gap: 6 },
  btn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  btnText: { color: COLORS.brand, fontWeight: "700", fontSize: 13 },
  btnRemove: { borderColor: COLORS.error, backgroundColor: "#FEF2F2" },
  err: { color: COLORS.error, marginTop: 6, fontSize: 12 },
});
