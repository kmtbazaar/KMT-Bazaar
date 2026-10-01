import React, { useEffect, useState, useCallback, useRef } from "react";
import * as THREE from "three";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform, ActivityIndicator, Animated as RNAnimated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from "react-native-reanimated";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { IMAGE_FALLBACK_URL, RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

// Custom Theme Palette: Clean Pure White, Sky Blue Header & Vibrant Orange
const THEME = {
  whiteBg: "#FFF9F0",        // Soft warm-white page background
  skyHeader: "#0284C7",      // Deep Sky Blue Header
  skyHeaderDark: "#0369A1",  // Deep Header Accent
  orange: "#FF6B00",         // Vibrant Orange
  orangeBright: "#FF8800",   // Bright Orange Highlight
  orangeGlow: "#F97316",     // Border Glow Orange
  black: "#0F172A",          // Dark Slate Text for Clear Reading
  blackMuted: "#64748B",     // Muted Slate Text
  white: "#FFFFFF",          // Pure White
  borderSoft: "#E2E8F0",     // Soft Divider Border
};

// Search bar placeholder texts for animation
const SEARCH_PLACEHOLDERS = [
  "Search 'groceries'...",
  "Search 'fresh food'...",
  "Search 'medicines'...",
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

function NightSky() {
  const canvasRef = useRef<any>(null);
  const [hour, setHour] = useState(new Date().getHours() + new Date().getMinutes() / 60);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setHour(now.getHours() + now.getMinutes() / 60);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, 215, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / 215, 0.1, 100);
    camera.position.set(0, 1.6, 12);
    camera.lookAt(0, 1.2, 0);

    const hemi = new THREE.HemisphereLight(0x9ccfff, 0x10151f, 1.7);
    scene.add(hemi);
    const moonLight = new THREE.DirectionalLight(0x9dbbff, 2.0);
    moonLight.position.set(4, 7, 3);
    scene.add(moonLight);
    const warmLight = new THREE.PointLight(0xff8a32, 3.0, 5);
    warmLight.position.set(-2.2, 1.05, 1.2);
    scene.add(warmLight);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(45, 32, 16),
      new THREE.MeshBasicMaterial({ side: THREE.BackSide })
    );
    scene.add(sky);

    const stars = new THREE.Group();
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 15;
      starPos.push(Math.cos(a) * r, 3 + Math.random() * 14, Math.sin(a) * r);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    stars.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xeaf4ff, size: 0.055, transparent: true, opacity: 0.9 })));
    scene.add(stars);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0xdde6f2, roughness: 0.95, metalness: 0 })
    );
    moon.position.set(3.5, 4.7, -1.8);
    scene.add(moon);
    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x9bbcff, transparent: true, opacity: 0.12 })
    );
    moonGlow.position.copy(moon.position);
    scene.add(moonGlow);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 20),
      new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.35;
    ground.position.z = 0;
    scene.add(ground);

    const hills = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(2.6 + (i % 3) * 0.7, 20, 12),
        new THREE.MeshStandardMaterial({ color: 0x16212a, roughness: 1 })
      );
      hill.scale.set(1.8, 0.45 + (i % 2) * 0.2, 0.7);
      hill.position.set(-7 + i * 2.4, -0.05, -1.7 - (i % 3) * 0.7);
      hills.add(hill);
    }
    scene.add(hills);

    const hut = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3021, roughness: 1 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x211b19, roughness: 1 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.65, 1.9), wallMat);
    wall.position.y = 0.5;
    hut.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.55, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.05;
    roof.scale.z = 0.72;
    hut.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.08), new THREE.MeshStandardMaterial({ color: 0x17100c }));
    door.position.set(-0.55, 0.08, 0.98);
    hut.add(door);
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.08), new THREE.MeshBasicMaterial({ color: 0xffa23b }));
    window.position.set(0.62, 0.62, 0.98);
    hut.add(window);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.25, 0.48), roofMat);
    chimney.position.set(0.72, 2.45, 0);
    hut.add(chimney);
    hut.position.set(-2.2, -0.25, -0.3);
    hut.scale.setScalar(0.95);
    scene.add(hut);

    const smokeGroup = new THREE.Group();
    const smokeCount = 90;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeData = Array.from({ length: smokeCount }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.28,
      size: 0.07 + Math.random() * 0.13,
      height: Math.random(),
    }));
    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = 0.72 + (Math.random() - 0.5) * 0.12;
      smokePositions[i * 3 + 1] = 3.02 + Math.random() * 2.2;
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({ color: 0xb9c2c8, size: 0.16, transparent: true, opacity: 0.32, depthWrite: false });
    smokeGroup.add(new THREE.Points(smokeGeo, smokeMat));
    smokeGroup.position.set(-2.2, -0.25, -0.3);
    scene.add(smokeGroup);

    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x5d6875, transparent: true, opacity: 0.42, roughness: 1 });
    for (let i = 0; i < 11; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.75 + Math.random() * 0.55, 16, 10), cloudMat);
      puff.scale.set(1.8 + Math.random() * 1.5, 0.45 + Math.random() * 0.35, 0.65);
      puff.position.set(-7 + Math.random() * 14, 3.2 + Math.random() * 2.5, -3.5 - Math.random() * 3);
      cloudGroup.add(puff);
    }
    scene.add(cloudGroup);

    const resize = () => {
      const w = window.innerWidth;
      renderer.setSize(w, 215, false);
      camera.aspect = w / 215;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const day = hour >= 6 && hour < 17;
      const sunset = hour >= 17 && hour < 19;
      const night = !day && !sunset;

      const top = day ? new THREE.Color(0x48aee8) : sunset ? new THREE.Color(0x391b55) : new THREE.Color(0x020713);
      const bottom = day ? new THREE.Color(0xbfeaff) : sunset ? new THREE.Color(0xff7040) : new THREE.Color(0x14264d);
      const skyColor = top.clone().lerp(bottom, 0.42);
      renderer.setClearColor(skyColor, 1);
      hemi.intensity = day ? 2.2 : sunset ? 1.15 : 0.72;
      moonLight.intensity = night ? 2.2 : sunset ? 0.75 : 0.15;
      warmLight.intensity = night ? 4.0 : 0.6;
      moon.visible = night || sunset;
      moonGlow.visible = moon.visible;
      stars.visible = night;

      cloudGroup.position.x = Math.sin(elapsed * 0.025) * 2.8;
      cloudGroup.position.z = Math.sin(elapsed * 0.012) * 0.5;
      smokeMat.opacity = night ? 0.38 : 0.25;
      const arr = smokeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < smokeCount; i++) {
        const d = smokeData[i];
        d.height = (d.height + d.speed * 0.006) % 1;
        const y = d.height * 2.8;
        arr[i * 3] = 0.72 + Math.sin(elapsed * 0.55 + d.phase + y * 1.7) * (0.06 + y * 0.11) + y * 0.08;
        arr[i * 3 + 1] = 3.02 + y;
        arr[i * 3 + 2] = Math.cos(elapsed * 0.42 + d.phase) * (0.04 + y * 0.05);
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGroup.rotation.y = Math.sin(elapsed * 0.08) * 0.015;

      camera.position.x = Math.sin(elapsed * 0.055) * 0.12;
      camera.position.y = 1.6 + Math.sin(elapsed * 0.035) * 0.035;
      camera.lookAt(0, 1.15, 0);
      moon.rotation.y += 0.0008;
      stars.rotation.y += 0.00005;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => m.dispose());
        }
      });
    };
  }, [hour]);

  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={s.nightSky}>
        {React.createElement("canvas" as any, { ref: canvasRef, style: { width: "100%", height: "215px", display: "block" } })}
      </View>
    );
  }

  const isNight = hour >= 19 || hour < 6;
  const isSunset = hour >= 17 && hour < 19;
  return (
    <View pointerEvents="none" style={s.nightSky}>
      <LinearGradient
        colors={isNight ? ["#020617", "#0B1120", "#172554", "#312E81"] : isSunset ? ["#1E1B4B", "#7C2D12", "#F97316", "#FED7AA"] : ["#0EA5E9", "#38BDF8", "#E0F2FE"]}
        locations={[0, 0.3, 0.7, 1]}
        style={s.nightGradient}
      />
    </View>
  );
}



export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [banners, setBanners] = useState<any[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [vendorServices, setVendorServices] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const bannerListRef = useRef<FlatList<any>>(null);
  const voiceRecognitionRef = useRef<any>(null);

  const tabBarTranslateY = useRef(new RNAnimated.Value(0)).current;
  const lastHomeOffsetY = useRef(0);
  const homeTabHidden = useRef(false);

  const handleHomeTabBarScroll = useCallback((event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastHomeOffsetY.current;

    if (Math.abs(diff) > 10) {
      if (diff > 0 && currentOffsetY > 50 && !homeTabHidden.current) {
        homeTabHidden.current = true;
        RNAnimated.timing(tabBarTranslateY, {
          toValue: 100,
          duration: 250,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            navigation.setOptions({
              tabBarStyle: {
                position: "absolute",
                borderTopColor: THEME.borderSoft,
                backgroundColor: "#FFFFFF",
                height: 65,
                paddingTop: 4,
                paddingBottom: 12,
                transform: [{ translateY: 100 }],
              },
            });
          }
        });
      } else if (diff < 0 && homeTabHidden.current) {
        homeTabHidden.current = false;
        navigation.setOptions({
          tabBarStyle: {
            position: "absolute",
            borderTopColor: THEME.borderSoft,
            backgroundColor: "#FFFFFF",
            height: 65,
            paddingTop: 4,
            paddingBottom: 12,
            transform: [{ translateY: tabBarTranslateY }],
          },
        });
        RNAnimated.timing(tabBarTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }

      lastHomeOffsetY.current = currentOffsetY;
    }
  }, [navigation, tabBarTranslateY]);

  useFocusEffect(
    useCallback(() => {
      lastHomeOffsetY.current = 0;
      homeTabHidden.current = false;
      tabBarTranslateY.setValue(0);
      navigation.setOptions({
        tabBarStyle: {
          position: "absolute",
          borderTopColor: THEME.borderSoft,
          backgroundColor: "#FFFFFF",
          height: 65,
          paddingTop: 4,
          paddingBottom: 12,
        },
      });

      return () => {
        homeTabHidden.current = false;
        tabBarTranslateY.setValue(0);
      };
    }, [navigation, tabBarTranslateY])
  );

  // Customer delivery location state
  const [selectedAddress, setSelectedAddress] = useState("Set your delivery location");
  const [locationReady, setLocationReady] = useState(false);
  const [initialLocationLoading, setInitialLocationLoading] = useState(false);
  const [initialLocationError, setInitialLocationError] = useState("");

  // Existing customers use their saved/default address. New customers must set location first.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const syncDeliveryLocation = async () => {
        try {
          const stored = await AsyncStorage.getItem("selected_address");

          if (stored) {