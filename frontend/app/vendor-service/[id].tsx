import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function VendorServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    if (id) api.vendorService(String(id)).then(setService).catch(() => setService(null));
  }, [id]);

  if (!service) return <SafeAreaView style={s.root}><Text style={s.loading}>Loading service...</Text></SafeAreaView>;

  const call = () => {
    if (service.phone) Linking.openURL("tel:" + service.phone);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} /></Pressable>
        <Text style={s.headerTitle}>Service</Text>
        <View style={{width:24}} />
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:30}}>
        {service.image ? <Image source={{uri:service.image}} style={s.hero} contentFit="cover" /> : <View style={[s.hero,s.placeholder]}><MaterialCommunityIcons name="briefcase-outline" size={54} color={COLORS.brand}/></View>}
        <View style={s.body}>
          <Text style={s.name}>{service.name}</Text>
          {!!service.vendor_name && <Text style={s.vendor}>By {service.vendor_name}</Text>}
          {!!service.category && <View style={s.pill}><Text style={s.pillText}>{service.category}</Text></View>}
          {!!service.description && <Text style={s.description}>{service.description}</Text>}
          {service.phone ? <Pressable onPress={call} style={s.call}><MaterialCommunityIcons name="phone" size={20} color="#fff"/><Text style={s.callText}>Contact Service</Text></Pressable> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#fff"},loading:{padding:30,color:COLORS.textSecondary},
 header:{height:56,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:SPACING.lg,borderBottomWidth:1,borderBottomColor:COLORS.border},
 headerTitle:{fontSize:18,fontWeight:"800",color:COLORS.text},hero:{width:"100%",height:240,backgroundColor:COLORS.surfaceTertiary},placeholder:{alignItems:"center",justifyContent:"center"},
 body:{padding:SPACING.lg},name:{fontSize:24,fontWeight:"900",color:COLORS.text},vendor:{fontSize:14,color:COLORS.textSecondary,marginTop:5},pill:{alignSelf:"flex-start",backgroundColor:"#E0F2FE",paddingHorizontal:10,paddingVertical:6,borderRadius:RADIUS.pill,marginTop:12},pillText:{color:COLORS.brand,fontWeight:"800"},description:{fontSize:15,color:COLORS.textSecondary,lineHeight:23,marginTop:18},call:{marginTop:22,backgroundColor:COLORS.brand,padding:14,borderRadius:RADIUS.pill,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:8},callText:{color:"#fff",fontWeight:"800"}
});