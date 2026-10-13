import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { uploadImageAsset } from "@/src/api";

type Props = {
  value?: string[];
  onChange: (images: string[]) => void;
  label?: string;
  minCount?: number;
  maxCount?: number;
  testID?: string;
};

export default function ProductImagesUploader({
  value = [],
  onChange,
  label = "Product photos",
  minCount = 3,
  maxCount = 6,
  testID,
}: Props) {
  const images = Array.isArray(value) ? value.filter((image) => typeof image === "string" && image.trim()) : [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pickPhoto = async (source: "gallery" | "camera") => {
    if (busy || images.length >= maxCount) return;
    setError("");
    try {
      if (source === "gallery") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Gallery permission is required to add product photos.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Camera permission is required to take a product photo.");
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      setBusy(true);
      const result = source === "gallery"
        ? await ImagePicker.launchImageLibraryAsync(options)
        : await ImagePicker.launchCameraAsync(options);

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const url = await uploadImageAsset({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        file: asset.file,
      }, "product");

      onChange([...images, url]);
    } catch (e: any) {
      setError(e?.message || "Could not upload this product photo.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    setError("");
  };

  const missing = Math.max(0, minCount - images.length);
  const emptyTiles = Array.from({ length: missing }, (_, i) => i);

  return (
    <View style={s.wrap} testID={testID}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.helper}>Add at least {minCount} different photos. Up to {maxCount} photos are supported.</Text>

      <View style={s.grid}>
        {images.map((uri, index) => (
          <View key={uri + "-" + index} style={s.tile} testID={testID ? `${testID}-photo-${index + 1}` : undefined}>
            <Image source={{ uri }} style={s.photo} contentFit="cover" />
            <View style={s.photoLabel}>
              <Text style={s.photoLabelText}>{index === 0 ? "Main photo" : `Photo ${index + 1}`}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
              onPress={() => removePhoto(index)}
              disabled={busy}
              style={s.remove}
              testID={testID ? `${testID}-remove-${index + 1}` : undefined}
            >
              <MaterialCommunityIcons name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}

        {emptyTiles.map((slot) => (
          <Pressable
            key={`required-${slot}`}
            onPress={() => { void pickPhoto("gallery"); }}
            disabled={busy}
            style={[s.tile, s.emptyTile]}
            testID={testID ? `${testID}-required-${images.length + slot + 1}` : undefined}
          >
            <MaterialCommunityIcons name="image-plus-outline" size={25} color={COLORS.brand} />
            <Text style={s.emptyTitle}>Photo {images.length + slot + 1}</Text>
            <Text style={s.requiredText}>Required</Text>
          </Pressable>
        ))}

        {images.length >= minCount && images.length < maxCount ? (
          <Pressable
            onPress={() => { void pickPhoto("gallery"); }}
            disabled={busy}
            style={[s.tile, s.emptyTile]}
            testID={testID ? `${testID}-add-more` : undefined}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={25} color={COLORS.brand} />
            <Text style={s.emptyTitle}>Add another</Text>
            <Text style={s.requiredText}>Optional</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.actions}>
        <Pressable
          onPress={() => { void pickPhoto("gallery"); }}
          disabled={busy || images.length >= maxCount}
          style={[s.actionButton, (busy || images.length >= maxCount) && s.disabled]}
          testID={testID ? `${testID}-gallery` : undefined}
        >
          <MaterialCommunityIcons name="image-multiple-outline" size={18} color={COLORS.brand} />
          <Text style={s.actionText}>Add from Gallery</Text>
        </Pressable>
        <Pressable
          onPress={() => { void pickPhoto("camera"); }}
          disabled={busy || images.length >= maxCount}
          style={[s.actionButton, (busy || images.length >= maxCount) && s.disabled]}
          testID={testID ? `${testID}-camera` : undefined}
        >
          {busy ? <ActivityIndicator color={COLORS.brand} size="small" /> : <MaterialCommunityIcons name="camera-outline" size={18} color={COLORS.brand} />}
          <Text style={s.actionText}>Take Photo</Text>
        </Pressable>
      </View>

      <Text style={[s.count, missing > 0 ? s.countWarning : s.countReady]}>
        {missing > 0 ? `${images.length}/${minCount} required photos added` : `${images.length} photos selected`}
      </Text>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontWeight: "800", color: COLORS.text, marginBottom: 4, fontSize: 14 },
  helper: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: 92, height: 104, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", height: "100%" },
  photoLabel: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.72)", paddingHorizontal: 3, paddingVertical: 4 },
  photoLabelText: { textAlign: "center", color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  remove: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(15,23,42,0.82)", alignItems: "center", justifyContent: "center" },
  emptyTile: { borderStyle: "dashed", borderColor: COLORS.brand, backgroundColor: COLORS.brandLight, padding: 5, gap: 5 },
  emptyTitle: { fontSize: 11, fontWeight: "800", color: COLORS.brandDark, textAlign: "center" },
  requiredText: { fontSize: 10, color: COLORS.textMuted },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, backgroundColor: COLORS.brandLight, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  actionText: { color: COLORS.brandDark, fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  count: { marginTop: 8, fontSize: 12, fontWeight: "800" },
  countWarning: { color: COLORS.error },
  countReady: { color: "#15803D" },
  error: { color: COLORS.error, fontSize: 12, marginTop: 6 },
});
