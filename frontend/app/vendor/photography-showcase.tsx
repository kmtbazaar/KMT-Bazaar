import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import ImageUploader from "@/src/components/ImageUploader";

const DEFAULT_PROFILE: any = {
  brand_title: "KMT Bazaar Weddings",
  headline: "Your story, beautifully framed",
  intro: "Cinematic wedding films, joyful rituals and timeless albums.",
  hero_image: "", reels: [], album_title: "Karizma Wedding Album",
  album_pdf_url: "", album_page_count: 40, album_cover_image: "", active: true,
};
const REEL_CATEGORIES = ["Haldi", "Mehndi", "Wedding", "Pre-Wedding", "Cinematic", "Drone", "Reception", "Other"];

export default function PhotographyShowcaseManager() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(title + "\n" + message);
    else Alert.alert(title, message);
  };
  const load = useCallback(async () => {
    try {
      const saved = await vendorApi.photographyShowcase();
      setProfile({ ...DEFAULT_PROFILE, ...saved, reels: Array.isArray(saved?.reels) ? saved.reels : [] });
    } catch (error: any) {
      notify("Could not load portfolio settings", error?.message || "Please reopen this page.");
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (key: string, value: any) => setProfile((old: any) => ({ ...old, [key]: value }));
  const updateReel = (index: number, key: string, value: string) => setProfile((old: any) => ({
    ...old, reels: old.reels.map((reel: any, i: number) => i === index ? { ...reel, [key]: value } : reel),
  }));
  const addReel = () => {
    if (profile.reels.length >= 20) return notify("Reel limit", "You can add up to 20 YouTube reels.");
    update("reels", [...profile.reels, { title: "", category: "Haldi", youtube_url: "" }]);
  };
  const removeReel = (index: number) => update("reels", profile.reels.filter((_: any, i: number) => i !== index));

  const save = async () => {
    const reels = (profile.reels || []).map((reel: any) => ({
      title: String(reel.title || "").trim(),
      category: String(reel.category || "Wedding").trim(),
      youtube_url: String(reel.youtube_url || "").trim(),
    })).filter((reel: any) => reel.youtube_url);
    const invalid = reels.find((reel: any) => !/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)(?:\/|$)/i.test(reel.youtube_url));
    if (invalid) return notify("Invalid YouTube link", invalid.youtube_url);
    if (profile.album_pdf_url && !/^https:\/\//i.test(String(profile.album_pdf_url).trim())) {
      return notify("Secure PDF link required", "Use a public HTTPS PDF URL. Google Drive access should be Anyone with the link – Viewer.");
    }
    setSaving(true);
    try {
      const saved = await vendorApi.updatePhotographyShowcase({
        ...profile, reels,
        album_page_count: Math.max(1, Math.min(200, Number(profile.album_page_count) || 40)),
      });
      setProfile({ ...DEFAULT_PROFILE, ...saved, reels: Array.isArray(saved?.reels) ? saved.reels : [] });
      notify("Portfolio saved", "Your customer-facing KMT Bazaar Weddings page has been updated.");
    } catch (error: any) {
      notify("Could not save portfolio", error?.message || "Please check the links and try again.");
    } finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={s.root}><View style={s.center}><MaterialCommunityIcons name="camera-outline" size={34} color="#B38B48" /><Text style={s.loading}>Loading studio portfolio...</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}><MaterialCommunityIcons name="arrow-left" size={23} color="#F7E8C1" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>KMT BAZAAR WEDDINGS</Text>
          <Text style={s.headerTitle}>Wedding Portfolio</Text>
          <Text style={s.headerSub}>Studio account: {user?.name || "Love Hurt Studio"}</Text>
        </View>
        <MaterialCommunityIcons name="movie-open-play-outline" size={25} color="#D8BC7E" />
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.noteCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#8B6A31" />
          <Text style={s.noteText}>Yahan save ki gayi reels aur album customer ke Photography page par dikhenge. Existing packages aur bookings Love Hurt Studio ke service-vendor account se hi connected rahenge.</Text>
        </View>
        <Text style={s.section}>Wedding page identity</Text>
        <Field label="Brand title" value={profile.brand_title} onChangeText={(v: string) => update("brand_title", v)} placeholder="KMT Bazaar Weddings" />
        <Field label="Main headline" value={profile.headline} onChangeText={(v: string) => update("headline", v)} placeholder="Your story, beautifully framed" />
        <Field label="Studio introduction" value={profile.intro} onChangeText={(v: string) => update("intro", v)} placeholder="Tell customers about your photography style" multiline />
        <ImageUploader value={profile.hero_image} onChange={(value) => update("hero_image", value)} label="Wedding hero photograph" aspect={[16, 9]} testID="photography-showcase-hero-image" />

        <View style={s.sectionRow}>
          <View style={{ flex: 1 }}><Text style={s.section}>Wedding Reels</Text><Text style={s.helper}>Add YouTube links and select the ceremony moment.</Text></View>
          <Pressable onPress={addReel} style={s.addButton} testID="photography-showcase-add-reel"><MaterialCommunityIcons name="plus" size={17} color="#20150D" /><Text style={s.addText}>Add Reel</Text></Pressable>
        </View>
        {profile.reels.length === 0 && <View style={s.empty}><MaterialCommunityIcons name="youtube" size={25} color="#BE123C" /><Text style={s.emptyText}>No reels yet. Start with Haldi, Mehndi or Wedding highlights.</Text></View>}
        {profile.reels.map((reel: any, index: number) => (
          <View key={"reel-" + index} style={s.reelCard}>
            <View style={s.reelHead}><Text style={s.reelTitle}>REEL {index + 1}</Text><Pressable onPress={() => removeReel(index)} hitSlop={10}><MaterialCommunityIcons name="delete-outline" size={21} color="#BE123C" /></Pressable></View>
            <Field label="Reel title" value={reel.title} onChangeText={(v: string) => updateReel(index, "title", v)} placeholder="Haldi ceremony highlights" />
            <Text style={s.fieldLabel}>EVENT CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {REEL_CATEGORIES.map(category => <Pressable key={category} onPress={() => updateReel(index, "category", category)} style={[s.chip, reel.category === category && s.chipActive]}><Text style={[s.chipText, reel.category === category && s.chipTextActive]}>{category}</Text></Pressable>)}
            </ScrollView>
            <Field label="YouTube video / Shorts link" value={reel.youtube_url} onChangeText={(v: string) => updateReel(index, "youtube_url", v)} placeholder="https://youtu.be/..." autoCapitalize="none" />
          </View>
        ))}

        <Text style={s.section}>Karizma Wedding Album</Text>
        <Text style={s.helper}>Paste a public PDF link. For Google Drive, set access to Anyone with the link – Viewer.</Text>
        <Field label="Album title" value={profile.album_title} onChangeText={(v: string) => update("album_title", v)} placeholder="Karizma Wedding Album" />
        <Field label="Total PDF pages" value={String(profile.album_page_count ?? 40)} onChangeText={(v: string) => update("album_page_count", v.replace(/[^0-9]/g, ""))} placeholder="40" keyboardType="number-pad" />
        <Field label="Public PDF URL" value={profile.album_pdf_url} onChangeText={(v: string) => update("album_pdf_url", v)} placeholder="https://drive.google.com/file/d/..." autoCapitalize="none" multiline />
        <ImageUploader value={profile.album_cover_image} onChange={(value) => update("album_cover_image", value)} label="Album cover photo" aspect={[3, 4]} testID="photography-showcase-album-cover" />

        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}><Text style={s.toggleTitle}>Show portfolio to customers</Text><Text style={s.helper}>Turn this off to temporarily hide reels and album.</Text></View>
          <Switch value={profile.active !== false} onValueChange={(value) => update("active", value)} trackColor={{ false: "#CBD5E1", true: "#B99A55" }} thumbColor={profile.active !== false ? "#7C5A2B" : "#64748B"} />
        </View>
        <Pressable onPress={save} disabled={saving} style={[s.saveButton, saving && { opacity: 0.65 }]} testID="photography-showcase-save">
          <MaterialCommunityIcons name="content-save-check-outline" size={20} color="#1A120B" /><Text style={s.saveText}>{saving ? "Saving portfolio..." : "Save Wedding Portfolio"}</Text>
        </Pressable>
        <Text style={s.footer}>Love Hurt Studio · KMT Bazaar Weddings</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: any) {
  return <View style={s.fieldWrap}><Text style={s.fieldLabel}>{label.toUpperCase()}</Text><TextInput {...props} placeholderTextColor="#9A8D78" style={[s.input, props.multiline && s.multiline]} /></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F0E6" },
  header: { backgroundColor: "#1B1112", paddingHorizontal: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#8D7045" },
  back: { width: 35, height: 40, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#C7A66A", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  headerTitle: { color: "#FFF7E8", fontSize: 20, fontWeight: "900", marginTop: 3 },
  headerSub: { color: "#D8C9AC", fontSize: 11, marginTop: 3 },
  body: { padding: 16, paddingBottom: 70, maxWidth: 820, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#725B3B", marginTop: 12, fontWeight: "700" },
  noteCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "#F2E5C9", borderWidth: 1, borderColor: "#D9C08E", borderRadius: 14, padding: 13, marginBottom: 22 },
  noteText: { flex: 1, color: "#58442A", fontSize: 12, lineHeight: 18 },
  section: { color: "#291B18", fontSize: 17, fontWeight: "900", marginBottom: 9, marginTop: 10 },
  helper: { color: "#776B5D", fontSize: 11, lineHeight: 16, marginBottom: 8 },
  fieldWrap: { marginBottom: 13 },
  fieldLabel: { color: "#77654D", fontSize: 9, fontWeight: "900", letterSpacing: 1.1, marginBottom: 5 },
  input: { backgroundColor: "#FFFCF6", borderWidth: 1, borderColor: "#E0D4C0", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: "#2A211A", fontSize: 13 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 19 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D6B875", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 20 },
  addText: { color: "#20150D", fontSize: 11, fontWeight: "900" },
  empty: { padding: 18, backgroundColor: "#FFFCF6", borderRadius: 13, alignItems: "center", borderWidth: 1, borderColor: "#E7DCCB", marginBottom: 12 },
  emptyText: { color: "#7C6B58", fontSize: 11, marginTop: 8, textAlign: "center", lineHeight: 17 },
  reelCard: { backgroundColor: "#FFFCF6", borderRadius: 15, borderWidth: 1, borderColor: "#E4D8C4", padding: 13, marginBottom: 12 },
  reelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  reelTitle: { color: "#9B793F", fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
  chips: { gap: 7, paddingBottom: 12 },
  chip: { borderWidth: 1, borderColor: "#D8CBB8", borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#F8F2E8" },
  chipActive: { backgroundColor: "#34211C", borderColor: "#34211C" },
  chipText: { color: "#655748", fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: "#F8E8C7" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E2D5C1", marginTop: 8 },
  toggleTitle: { color: "#34251B", fontWeight: "900", fontSize: 12, marginBottom: 3 },
  saveButton: { marginTop: 18, paddingVertical: 15, borderRadius: 13, backgroundColor: "#D6B875", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  saveText: { color: "#25180F", fontWeight: "900", fontSize: 13 },
  footer: { color: "#95866D", fontSize: 10, textAlign: "center", marginTop: 17 },
});
