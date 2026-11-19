import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { api } from "@/src/api";
import { vendorApi } from "@/src/roleApi";

const LABELS: any = {
  decorator: { title: "Decorator Studio", subtitle: "Create unforgettable celebrations", icon: "party-popper", accent: "#F97316", dark: "#7C2D12" },
  photography_studio: { title: "Photography Studio", subtitle: "Capture every important moment", icon: "camera", accent: "#8B5CF6", dark: "#312E81" },
};

export default function CreativeServiceDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const type = user?.service_type || "decorator";
  const meta = LABELS[type] || LABELS.decorator;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approval, setApproval] = useState("pending");
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({
    business_name: user?.name || "",
    business_description: "",
    experience_years: "0",
    service_areas: "",
    address: "",
    city: "",
    district: "",
    state: "Jharkhand",
    portfolio_images: "",
    website: "",
    instagram: "",
    contact_person: user?.name || "",
  });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.serviceVendorProfile();
      const status = result?.approval_status || user?.service_approval_status || "pending";
      setApproval(status);
      const p = result?.profile || {};
      setProfile(p);
      setDraft({
        business_name: p.business_name || user?.name || "",
        business_description: p.business_description || "",
        experience_years: String(p.experience_years ?? 0),
        service_areas: (p.service_areas || []).join(", "),
        address: p.address || "",
        city: p.city || "",
        district: p.district || "",
        state: p.state || "Jharkhand",
        portfolio_images: (p.portfolio_images || []).join(", "),
        website: p.website || "",
        instagram: p.instagram || "",
        contact_person: p.contact_person || user?.name || "",
      });
      if (status === "approved") {
        const [st, svc, b, e] = await Promise.all([
          vendorApi.serviceStats(),
          vendorApi.services(),
          vendorApi.serviceBookings(),
          vendorApi.serviceVendorEnquiries(),
        ]);
        setStats(st || {});
        setServices(svc || []);
        setBookings(b || []);
        setEnquiries(e || []);
      } else {
        setStats(null); setServices([]); setBookings([]); setEnquiries([]);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load your service profile.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name, user?.service_approval_status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveProfile = async () => {
    if (!draft.business_name.trim() || draft.business_name.trim().length < 2) {
      setError("Please enter your business name.");
      return;
    }
    setSaving(true); setError("");
    try {
      const updated = await api.saveServiceVendorProfile({
        ...draft,
        experience_years: Number(draft.experience_years) || 0,
        service_areas: draft.service_areas.split(",").map((x: string) => x.trim()).filter(Boolean),
        portfolio_images: draft.portfolio_images.split(",").map((x: string) => x.trim()).filter(Boolean).slice(0, 12),
      });
      setProfile(updated);
      if (approval === "rejected") {
        await api.resubmitServiceVendorProfile();
        setApproval("pending");
      }
      await load();
      Platform.OS === "web" ? window.alert("Business profile saved.") : Alert.alert("Saved", "Business profile saved.");
    } catch (e: any) {
      setError(e?.message || "Profile could not be saved.");
    } finally { setSaving(false); }
  };

  const activeBookings = bookings.filter(x => !["completed", "cancelled", "rejected"].includes(String(x.status || "").toLowerCase())).length;
  const pendingEnquiries = enquiries.filter(x => ["new", "replied", "quoted"].includes(String(x.status || "").toLowerCase())).length;

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={meta.accent}/><Text style={s.muted}>Loading your business studio…</Text></View>;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <LinearGradient colors={[meta.dark, "#0F172A"]} style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroIcon}><MaterialCommunityIcons name={meta.icon} size={27} color={meta.dark}/></View>
            <Pressable onPress={logout} style={s.logout}><MaterialCommunityIcons name="logout" size={18} color="#fff"/><Text style={s.logoutText}>Sign out</Text></Pressable>
          </View>
          <Text style={s.eyebrow}>KMT BAZAAR · SERVICE PARTNER</Text>
          <Text style={s.heroTitle}>{meta.title}</Text>
          <Text style={s.heroSub}>{meta.subtitle}</Text>
          <View style={s.statusPill}>
            <View style={[s.dot, { backgroundColor: approval === "approved" ? "#4ADE80" : approval === "rejected" ? "#FCA5A5" : "#FCD34D" }]}/>
            <Text style={s.statusText}>{approval === "approved" ? "VERIFIED PARTNER" : approval === "rejected" ? "ACTION REQUIRED" : "VERIFICATION IN REVIEW"}</Text>
          </View>
        </LinearGradient>

        {approval !== "approved" ? (
          <View style={s.panel}>
            <View style={s.noticeHead}>
              <MaterialCommunityIcons name={approval === "rejected" ? "alert-circle-outline" : "shield-clock-outline"} size={24} color={approval === "rejected" ? "#B91C1C" : "#0369A1"}/>
              <View style={{flex:1}}>
                <Text style={s.panelTitle}>{approval === "rejected" ? "Profile needs an update" : "Complete your business profile"}</Text>
                <Text style={s.panelSub}>{approval === "rejected" ? "Update the information and submit it for another review." : "Your profile will become visible to customers after Admin verification."}</Text>
              </View>
            </View>
            <Field label="Business / Studio Name *" value={draft.business_name} onChange={(v:string)=>setDraft({...draft,business_name:v})}/>
            <Field label="About your business" value={draft.business_description} onChange={(v:string)=>setDraft({...draft,business_description:v})} multiline/>
            <View style={s.two}>
              <Field label="Experience (years)" value={draft.experience_years} onChange={(v:string)=>setDraft({...draft,experience_years:v})} keyboardType="numeric"/>
              <Field label="Contact Person" value={draft.contact_person} onChange={(v:string)=>setDraft({...draft,contact_person:v})}/>
            </View>
            <Field label="Services / Areas (comma separated)" value={draft.service_areas} onChange={(v:string)=>setDraft({...draft,service_areas:v})} placeholder="Karmatar, Jamtara, Madhupur"/>
            <Field label="Business Address" value={draft.address} onChange={(v:string)=>setDraft({...draft,address:v})}/>
            <View style={s.two}>
              <Field label="City" value={draft.city} onChange={(v:string)=>setDraft({...draft,city:v})}/>
              <Field label="District" value={draft.district} onChange={(v:string)=>setDraft({...draft,district:v})}/>
            </View>
            <Field label="Portfolio image URLs (comma separated)" value={draft.portfolio_images} onChange={(v:string)=>setDraft({...draft,portfolio_images:v})} multiline placeholder="Add links to your best work"/>
            <View style={s.two}>
              <Field label="Website" value={draft.website} onChange={(v:string)=>setDraft({...draft,website:v})}/>
              <Field label="Instagram" value={draft.instagram} onChange={(v:string)=>setDraft({...draft,instagram:v})}/>
            </View>
            {!!error && <Text style={s.error}>{error}</Text>}
            <Pressable onPress={saveProfile} disabled={saving} style={[s.primary,{backgroundColor:meta.accent}]}>
              {saving ? <ActivityIndicator color="#fff"/> : <><MaterialCommunityIcons name="content-save-check-outline" size={18} color="#fff"/><Text style={s.primaryText}>{approval === "rejected" ? "Save & Resubmit" : "Save Business Profile"}</Text></>}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.statsGrid}>
              <Stat title="Services" value={services.length} icon="briefcase-outline" accent={meta.accent}/>
              <Stat title="New enquiries" value={pendingEnquiries} icon="message-text-outline" accent="#0EA5E9"/>
              <Stat title="Active bookings" value={activeBookings} icon="calendar-check-outline" accent="#16A34A"/>
              <Stat title="Est. payout" value={"₹"+Number(stats?.payout||0).toLocaleString("en-IN")} icon="wallet-outline" accent="#D97706"/>
            </View>
            <View style={s.panel}>
              <View style={s.sectionHeader}><Text style={s.panelTitle}>Business management</Text><Text style={s.verified}>VERIFIED</Text></View>
              <Action icon="image-multiple-outline" title="Services & Portfolio" sub="Publish packages, pricing and photos" onPress={()=>router.push("/service-vendor/services" as any)} accent={meta.accent}/>
              <Action icon="message-text-outline" title="Customer Enquiries" sub={pendingEnquiries+" enquiries waiting for a response"} onPress={()=>router.push("/service-vendor/enquiries" as any)} accent="#0EA5E9"/>
              <Action icon="calendar-check-outline" title="Booking Calendar" sub="Review customer requests and booking status" onPress={()=>router.push("/service-vendor/service-bookings" as any)} accent="#16A34A"/>
              <Action icon="calendar-clock-outline" title="Availability & Schedule" sub="Set working hours, blocked dates and daily capacity" onPress={()=>router.push("/service-vendor/availability" as any)} accent="#D97706"/>
              <Action icon="chart-line" title="Earnings & Commission" sub="Track revenue and platform deductions" onPress={()=>router.push("/service-vendor/earnings" as any)} accent="#7C3AED"/>
            </View>
            <View style={s.panel}>
              <Text style={s.panelTitle}>Recent activity</Text>
              {enquiries.slice(0,3).map(x=><View key={x.id} style={s.activity}><MaterialCommunityIcons name="message-processing-outline" color={meta.accent} size={19}/><View style={{flex:1}}><Text style={s.activityTitle}>{x.service_name || "Service enquiry"}</Text><Text style={s.activitySub}>{x.customer_name || "Customer"} · {String(x.status||"new").replaceAll("_"," ")}</Text></View></View>)}
              {enquiries.length===0 && <Text style={s.panelSub}>New customer enquiries will appear here.</Text>}
            </View>
          </>
        )}
        <Text style={s.footer}>KMT Bazaar · Local services, professionally managed</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({label,value,onChange,multiline,keyboardType,placeholder}:any) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={String(value??"")} onChangeText={onChange} multiline={multiline} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor="#94A3B8" style={[s.input,multiline&&{minHeight:76,textAlignVertical:"top"}]}/></View>;
}
function Stat({title,value,icon,accent}:any) {
  return <View style={s.stat}><View style={[s.statIcon,{backgroundColor:accent+"18"}]}><MaterialCommunityIcons name={icon} size={18} color={accent}/></View><Text style={s.statValue}>{value}</Text><Text style={s.statTitle}>{title}</Text></View>;
}
function Action({icon,title,sub,onPress,accent}:any) {
  return <Pressable style={s.action} onPress={onPress}><View style={[s.actionIcon,{backgroundColor:accent+"18"}]}><MaterialCommunityIcons name={icon} size={21} color={accent}/></View><View style={{flex:1}}><Text style={s.actionTitle}>{title}</Text><Text style={s.actionSub}>{sub}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8"/></Pressable>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#F1F5F9"},content:{padding:14,paddingBottom:40},
  loading:{flex:1,alignItems:"center",justifyContent:"center",gap:10,backgroundColor:"#F8FAFC"},muted:{color:"#64748B",fontSize:12},
  hero:{borderRadius:24,padding:21,marginBottom:14},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  heroIcon:{width:54,height:54,borderRadius:18,backgroundColor:"#fff",alignItems:"center",justifyContent:"center"},
  logout:{flexDirection:"row",alignItems:"center",gap:6,padding:9,borderRadius:15,backgroundColor:"rgba(255,255,255,.13)"},logoutText:{color:"#fff",fontSize:11,fontWeight:"800"},
  eyebrow:{color:"#CBD5E1",fontSize:9,fontWeight:"900",letterSpacing:1.6,marginTop:19},
  heroTitle:{color:"#fff",fontSize:27,fontWeight:"900",marginTop:5},heroSub:{color:"#CBD5E1",fontSize:12,marginTop:3},
  statusPill:{alignSelf:"flex-start",marginTop:16,flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:11,paddingVertical:7,borderRadius:20,backgroundColor:"rgba(255,255,255,.13)"},
  dot:{width:7,height:7,borderRadius:4},statusText:{fontSize:9,color:"#fff",fontWeight:"900",letterSpacing:.7},
  panel:{backgroundColor:"#fff",borderRadius:20,padding:16,marginBottom:13,borderWidth:1,borderColor:"#E2E8F0"},
  noticeHead:{flexDirection:"row",alignItems:"flex-start",gap:11,marginBottom:15},panelTitle:{fontSize:16,fontWeight:"900",color:"#0F172A"},panelSub:{fontSize:11,lineHeight:16,color:"#64748B",marginTop:4},
  field:{flex:1,marginBottom:10},label:{fontSize:10,fontWeight:"900",color:"#475569",marginBottom:5},
  input:{borderWidth:1,borderColor:"#E2E8F0",backgroundColor:"#F8FAFC",borderRadius:11,padding:11,color:"#0F172A",fontSize:12},
  two:{flexDirection:"row",gap:9},error:{color:"#B91C1C",fontSize:11,marginVertical:8},
  primary:{minHeight:46,borderRadius:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:7},primaryText:{color:"#fff",fontSize:12,fontWeight:"900"},
  statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:9,marginBottom:13},stat:{width:"48%",backgroundColor:"#fff",borderRadius:17,padding:14,borderWidth:1,borderColor:"#E2E8F0"},
  statIcon:{width:34,height:34,borderRadius:11,alignItems:"center",justifyContent:"center"},statValue:{fontSize:20,fontWeight:"900",color:"#0F172A",marginTop:10},statTitle:{fontSize:10,color:"#64748B",fontWeight:"700",marginTop:2},
  sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:6},verified:{fontSize:8,fontWeight:"900",color:"#047857",backgroundColor:"#D1FAE5",padding:6,borderRadius:8},
  action:{flexDirection:"row",alignItems:"center",gap:11,paddingVertical:13,borderBottomWidth:1,borderBottomColor:"#F1F5F9"},
  actionIcon:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center"},actionTitle:{fontSize:12,fontWeight:"900",color:"#0F172A"},actionSub:{fontSize:10,color:"#64748B",marginTop:3},
  activity:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#F1F5F9"},
  activityTitle:{fontSize:11,fontWeight:"800",color:"#0F172A"},activitySub:{fontSize:10,color:"#64748B",marginTop:2},footer:{textAlign:"center",color:"#94A3B8",fontSize:9,marginTop:4}
});