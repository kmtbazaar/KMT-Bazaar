import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform, ActivityIndicator, Animated as RNAnimated, TextInput, BackHandler } from "react-native";
import { BlurView } from "expo-blur";
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
import { BrandingFooter } from "@/src/components/AnimatedBrandLogo";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;
const HERO_BACKDROP_HEIGHT = 182; // Extend animated sky to the banner line without moving page content
const HERO_COLLAPSE_SCROLL_THRESHOLD = 120; // Collapse when banner CTA reaches the top; keep categories clear

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
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

const RECENT_SEARCHES_KEY = "kmt_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function NightSky() {
  const canvasRef = useRef<any>(null);
  const [hour, setHour] = useState(new Date().getHours() + new Date().getMinutes() / 60);
  const cloudOne = useSharedValue(-45);
  const cloudTwo = useSharedValue(0);
  const cloudDepth = useSharedValue(0);

  useEffect(() => {
    const clock = setInterval(() => {
      const now = new Date();
      setHour(now.getHours() + now.getMinutes() / 60);
    }, 30000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
      });
      if (!gl) return;

      const vertexSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
          v_uv = a_position * 0.5 + 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      const fragmentSource = `
        precision highp float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform float u_hour;
        uniform vec2 u_resolution;

        float hash(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 31.19);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 6; i++) {
            value += noise(p) * amp;
            p = p * 2.03 + vec2(17.0, 9.0);
            amp *= 0.5;
          }
          return value;
        }

        float boxMask(vec2 p, vec2 center, vec2 halfSize, float softness) {
          float d = max(abs(p.x - center.x) - halfSize.x, abs(p.y - center.y) - halfSize.y);
          return 1.0 - smoothstep(0.0, softness, d);
        }

        float phaseSun(float x) {
          return smoothstep(5.0, 8.0, x) * (1.0 - smoothstep(16.5, 20.0, x));
        }

        void main() {
          vec2 uv = v_uv;
          float aspect = u_resolution.x / max(u_resolution.y, 1.0);
          float t = u_time * 0.00002;

          float day = phaseSun(u_hour);
          float sunset = smoothstep(16.0, 18.8, u_hour) * (1.0 - smoothstep(18.8, 20.5, u_hour));
          float night = 1.0 - day;

          float horizon = pow(1.0 - uv.y, 1.45);
          float upper = smoothstep(0.0, 0.92, uv.y);

          vec3 daylightTop = vec3(0.055, 0.34, 0.68);
          vec3 daylightMid = vec3(0.14, 0.58, 0.88);
          vec3 daylightHorizon = vec3(0.88, 0.95, 1.0);

          vec3 sunsetTop = vec3(0.035, 0.025, 0.11);
          vec3 sunsetMid = vec3(0.30, 0.075, 0.33);
          vec3 sunsetHorizon = vec3(1.0, 0.42, 0.18);

          vec3 nightTop = vec3(0.002, 0.006, 0.022);
          vec3 nightMid = vec3(0.012, 0.045, 0.14);
          vec3 nightHorizon = vec3(0.06, 0.11, 0.22);

          vec3 daySky = mix(daylightHorizon, daylightTop, upper);
          daySky = mix(daySky, daylightMid, 0.32 + horizon * 0.20);

          vec3 sunsetSky = mix(sunsetHorizon, sunsetTop, upper);
          sunsetSky = mix(sunsetSky, sunsetMid, 0.42 + horizon * 0.18);

          vec3 nightSky = mix(nightHorizon, nightTop, upper);
          nightSky = mix(nightSky, nightMid, 0.36 + horizon * 0.20);

          vec3 sky = mix(nightSky, daySky, day);
          sky = mix(sky, sunsetSky, sunset);

          float haze = pow(max(1.0 - uv.y, 0.0), 3.1);
          vec3 hazeColor = mix(vec3(0.64, 0.79, 0.92), vec3(1.0, 0.54, 0.30), sunset);
          hazeColor = mix(hazeColor, vec3(0.12, 0.20, 0.34), night * 0.68);
          sky = mix(sky, hazeColor, haze * (0.20 + sunset * 0.42 + night * 0.08));

          // Layered volumetric-style cloud banks with independent motion.
          float highA = fbm(vec2(uv.x * 2.0 + t * 0.34, uv.y * 4.2 + 1.7));
          float highB = fbm(vec2(uv.x * 4.5 - t * 0.22, uv.y * 7.5 + 7.0));
          float highCloud = smoothstep(0.54, 0.74, highA * 0.72 + highB * 0.28);
          highCloud *= smoothstep(0.40, 0.58, uv.y) * (1.0 - smoothstep(0.82, 0.98, uv.y));

          float lowA = fbm(vec2(uv.x * 3.6 - t * 0.55, uv.y * 7.0 + 15.0));
          float lowB = fbm(vec2(uv.x * 7.5 + t * 0.30, uv.y * 13.0 + 4.0));
          float lowCloud = smoothstep(0.50, 0.71, lowA * 0.67 + lowB * 0.33);
          lowCloud *= smoothstep(0.10, 0.24, uv.y) * (1.0 - smoothstep(0.42, 0.62, uv.y));

          vec3 cloudTop = mix(vec3(0.98, 0.99, 1.0), vec3(0.52, 0.62, 0.74), night);
          vec3 cloudMid = mix(vec3(0.76, 0.84, 0.92), vec3(0.17, 0.24, 0.36), night);
          vec3 cloudHighColor = mix(cloudMid, cloudTop, 0.58 + 0.42 * highA);
          vec3 cloudLowColor = mix(vec3(0.58, 0.68, 0.78), vec3(0.09, 0.14, 0.23), night);

          sky = mix(sky, cloudHighColor, highCloud * (0.16 + 0.24 * (day + sunset * 0.7 + night * 0.16)));
          sky = mix(sky, cloudLowColor, lowCloud * (0.18 + 0.22 * night));

          // Sun bloom and atmospheric disk.
          float sunPhase = clamp((u_hour - 5.8) / 13.0, 0.0, 1.0);
          float sunX = mix(0.14, 0.86, sunPhase);
          float sunY = 0.16 + 0.58 * sin(sunPhase * 3.1415926);
          vec2 sunDelta = vec2((uv.x - sunX) * aspect, uv.y - sunY);
          float sunDist = length(sunDelta);
          float sunHalo = exp(-sunDist * 5.2);
          float sunDisc = 1.0 - smoothstep(0.018, 0.032, sunDist);
          sky += vec3(1.0, 0.70, 0.32) * sunHalo * (day * 0.16 + sunset * 0.30);
          sky += vec3(1.0, 0.90, 0.62) * sunDisc * (day * 0.52 + sunset * 0.34);

          // Dense stars with gentle twinkle at night.
          vec2 starGrid = floor(vec2(uv.x * 250.0, uv.y * 140.0));
          float starRnd = hash(starGrid);
          float starLayer = step(0.993, starRnd) * smoothstep(0.18, 0.72, uv.y);
          float starTwinkle = 0.62 + 0.38 * sin(u_time * 0.0013 + starRnd * 37.0);
          sky += vec3(0.72, 0.84, 1.0) * starLayer * starTwinkle * night * 0.72;

          vec2 brightGrid = floor(vec2(uv.x * 92.0 + 3.0, uv.y * 58.0 + 11.0));
          float brightRnd = hash(brightGrid);
          float brightStar = step(0.986, brightRnd) * smoothstep(0.24, 0.76, uv.y);
          sky += vec3(0.90, 0.95, 1.0) * brightStar * night * 0.55;

          // Moon with surface variation and cloud occlusion.
          vec2 moonPos = vec2(0.79, 0.71);
          vec2 moonDelta = vec2((uv.x - moonPos.x) * aspect, uv.y - moonPos.y);
          float moonDist = length(moonDelta);
          float moonMask = 1.0 - smoothstep(0.045, 0.053, moonDist);
          float moonHalo = exp(-moonDist * 9.0);
          float moonCrater1 = exp(-length(moonDelta - vec2(-0.011, 0.009)) * 42.0);
          float moonCrater2 = exp(-length(moonDelta - vec2(0.015, -0.011)) * 50.0);
          float moonCrater3 = exp(-length(moonDelta - vec2(0.005, 0.018)) * 65.0);
          float moonSurface = 0.92 - moonCrater1 * 0.12 - moonCrater2 * 0.09 - moonCrater3 * 0.06;
          float moonCloudOcclusion = highCloud * 0.75;

          sky += vec3(0.62, 0.74, 0.98) * moonHalo * night * 0.20;
          sky += vec3(0.92, 0.95, 1.0) * moonMask * moonSurface * night * (0.72 - moonCloudOcclusion * 0.48);

          // Distant hills and horizon silhouette.
          float hillNoise = fbm(vec2(uv.x * 2.5 + 2.0, 8.0));
          float hillLine = 0.060 + hillNoise * 0.035 + 0.018 * sin(uv.x * 9.0 + t * 0.8);
          float distantLand = 1.0 - smoothstep(hillLine, hillLine + 0.012, uv.y);
          sky = mix(sky, mix(vec3(0.07, 0.11, 0.16), vec3(0.012, 0.020, 0.032), night), distantLand);

          // A tiny warm village glow behind the hut.
          float villageGlow = exp(-pow((uv.x - 0.29) * 22.0, 2.0)) * exp(-pow((uv.y - 0.095) * 24.0, 2.0));
          sky += vec3(1.0, 0.42, 0.12) * villageGlow * (0.12 + night * 0.22);

          // Rustic hut silhouette with warm window.
          float hutWall = boxMask(uv, vec2(0.29, 0.126), vec2(0.095, 0.053), 0.004);
          float roofHalf = 0.125;
          float roofTop = 0.175 + (1.0 - abs(uv.x - 0.29) / roofHalf) * 0.090;
          float roofMask = step(abs(uv.x - 0.29), roofHalf) * step(0.175, uv.y) * step(uv.y, roofTop);
          float eaveMask = boxMask(uv, vec2(0.29, 0.175), vec2(0.137, 0.010), 0.004);
          float chimney = boxMask(uv, vec2(0.355, 0.225), vec2(0.015, 0.038), 0.003);

          vec3 hutColor = mix(vec3(0.08, 0.045, 0.026), vec3(0.015, 0.018, 0.024), night * 0.92);
          sky = mix(sky, hutColor, max(hutWall, max(roofMask, eaveMask)) * (0.72 + night * 0.25));
          sky = mix(sky, vec3(0.035, 0.028, 0.022), chimney * 0.95);

          float windowMask = boxMask(uv, vec2(0.323, 0.132), vec2(0.016, 0.014), 0.003);
          float doorMask = boxMask(uv, vec2(0.255, 0.115), vec2(0.020, 0.043), 0.003);
          sky = mix(sky, vec3(0.06, 0.035, 0.02), doorMask);
          sky += vec3(1.0, 0.52, 0.15) * windowMask * (0.24 + night * 1.35);
          sky += vec3(1.0, 0.25, 0.07) * windowMask * exp(-length(vec2((uv.x - 0.323) * aspect, uv.y - 0.132)) * 24.0) * night * 0.30;

          // Chimney smoke: expands, curls, drifts and fades into the clouds.
          float smokeY = smoothstep(0.245, 0.29, uv.y) * (1.0 - smoothstep(0.60, 0.76, uv.y));
          float smokeCenter = 0.355
            + 0.018 * sin(uv.y * 19.0 + t * 1.5)
            + 0.014 * sin(uv.y * 47.0 - t * 2.1)
            + 0.010 * sin(uv.y * 81.0 + t * 0.9);
          float smokeWidth = 0.016 + (uv.y - 0.25) * 0.075;
          float smokeDist = abs(uv.x - smokeCenter) / max(smokeWidth, 0.006);
          float smokeShape = 1.0 - smoothstep(0.28, 1.10, smokeDist);
          float smokeNoise = fbm(vec2(uv.x * 8.0 + t * 0.28, uv.y * 10.0 - t * 0.65));
          float smokePockets = smoothstep(0.28, 0.76, smokeNoise);
          float smoke = smokeShape * smokePockets * smokeY;

          vec3 smokeColor = mix(vec3(0.72, 0.75, 0.78), vec3(0.21, 0.25, 0.31), night);
          sky = mix(sky, smokeColor, smoke * (0.16 + 0.24 * night));

          // Soft foreground haze + filmic vignette.
          float grassHaze = smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.12, 0.20, uv.y));
          sky = mix(sky, vec3(0.10, 0.15, 0.16), grassHaze * (0.10 + night * 0.10));

          vec2 vig = uv - 0.5;
          float vignette = 1.0 - smoothstep(0.34, 0.78, length(vec2(vig.x * 0.85, vig.y)));
          sky *= 0.84 + vignette * 0.16;

          float grain = (hash(uv * u_resolution + u_time * 0.008) - 0.5) * 0.012;
          sky += grain;

          gl_FragColor = vec4(clamp(sky, 0.0, 1.0), 1.0);
        }
      `;

      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error("Cinematic sky shader compile failed:", gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertexShader || !fragmentShader) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Cinematic sky shader link failed:", gl.getProgramInfoLog(program));
        return;
      }

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );

      const position = gl.getAttribLocation(program, "a_position");
      const timeUniform = gl.getUniformLocation(program, "u_time");
      const hourUniform = gl.getUniformLocation(program, "u_hour");
      const resolutionUniform = gl.getUniformLocation(program, "u_resolution");

      const resize = () => {
        const widthPx = Math.max(1, Math.floor(window.innerWidth * Math.min(window.devicePixelRatio, 2)));
        const heightPx = Math.max(1, Math.floor(HERO_BACKDROP_HEIGHT * Math.min(window.devicePixelRatio, 2)));
        canvas.width = widthPx;
        canvas.height = heightPx;
        canvas.style.width = "100%";
        canvas.style.height = `${HERO_BACKDROP_HEIGHT}px`;
        gl.viewport(0, 0, widthPx, heightPx);
      };

      resize();
      window.addEventListener("resize", resize);

      let frame = 0;
      const render = (time: number) => {
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(timeUniform, time);
        gl.uniform1f(hourUniform, hour);
        gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        frame = window.requestAnimationFrame(render);
      };

      frame = window.requestAnimationFrame(render);

      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        if (program) gl.deleteProgram(program);
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        if (buffer) gl.deleteBuffer(buffer);
      };
    }

    cloudOne.value = withRepeat(
      withSequence(
        withTiming(58, { duration: 22000 }),
        withTiming(-45, { duration: 22000 })
      ),
      -1,
      false
    );

    cloudTwo.value = withRepeat(
      withSequence(
        withTiming(-58, { duration: 28000 }),
        withTiming(72, { duration: 28000 })
      ),
      -1,
      false
    );

    cloudDepth.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 7000 }),
        withTiming(0, { duration: 7000 })
      ),
      -1,
      true
    );
  }, [hour]);

  const isNight = hour >= 19 || hour < 6;
  const isSunset = hour >= 17 && hour < 19;

  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={s.nightSky}>
        {React.createElement("canvas" as any, { ref: canvasRef, style: { width: "100%", height: `${HERO_BACKDROP_HEIGHT}px`, display: "block" } })}
      </View>
    );
  }

  const cloudOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cloudOne.value },
      { translateY: -cloudDepth.value * 2 },
      { scale: 1 + cloudDepth.value * 0.025 },
    ],
  }));

  const cloudTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cloudTwo.value },
      { translateY: cloudDepth.value * 2 },
      { scale: 1.02 - cloudDepth.value * 0.02 },
    ],
  }));

  return (
    <View pointerEvents="none" style={s.nightSky}>
      <LinearGradient
        colors={
          isNight
            ? ["#020617", "#0B1120", "#172554", "#312E81"]
            : isSunset
              ? ["#1E1B4B", "#4C1D95", "#8B5CF6", "#F5D0FE"]
              : ["#7DD3FC", "#38BDF8", "#0EA5E9", "#E0F2FE"]
        }
        locations={[0, 0.28, 0.68, 1]}
        style={s.nightGradient}
      />
      <Animated.View style={[s.cloud, s.cloudOne, cloudOneStyle]}>
        <View style={[s.cloudPuff, { width: 58, height: 32, left: 14, top: 10, backgroundColor: "rgba(255,255,255,0.82)" }]} />
        <View style={[s.cloudPuff, { width: 82, height: 44, left: 42, top: -1, backgroundColor: "rgba(255,255,255,0.88)" }]} />
        <View style={[s.cloudPuff, { width: 54, height: 30, left: 102, top: 12, backgroundColor: "rgba(255,255,255,0.76)" }]} />
      </Animated.View>
      <Animated.View style={[s.cloud, s.cloudTwo, cloudTwoStyle]}>
        <View style={[s.cloudPuff, { width: 46, height: 26, left: 14, top: 11, backgroundColor: "rgba(255,255,255,0.74)" }]} />
        <View style={[s.cloudPuff, { width: 72, height: 38, left: 40, top: 0, backgroundColor: "rgba(255,255,255,0.82)" }]} />
        <View style={[s.cloudPuff, { width: 54, height: 29, left: 86, top: 10, backgroundColor: "rgba(255,255,255,0.68)" }]} />
      </Animated.View>
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
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const bannerListRef = useRef<FlatList<any>>(null);
  const voiceRecognitionRef = useRef<any>(null);

  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [homeSearchFocusInput, setHomeSearchFocusInput] = useState(true);
  const [homeSearchProducts, setHomeSearchProducts] = useState<any[]>([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState(false);
  const [homeSearchError, setHomeSearchError] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const homeSearchFetchStarted = useRef(false);
  const homeSearchHistoryEntry = useRef(false);

  useEffect(() => {
    if (!homeSearchOpen) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const currentState = window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};
      window.history.pushState(
        { ...currentState, kmtHomeSearchOverlay: true },
        "",
        window.location.href
      );
      homeSearchHistoryEntry.current = true;

      const handleBrowserBack = () => {
        homeSearchHistoryEntry.current = false;
        try { voiceRecognitionRef.current?.stop?.(); } catch {}
        voiceRecognitionRef.current = null;
        setVoiceListening(false);
        setHomeSearchOpen(false);
        setHomeSearchQuery("");
      };
      window.addEventListener("popstate", handleBrowserBack);
      return () => window.removeEventListener("popstate", handleBrowserBack);
    }

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      voiceRecognitionRef.current = null;
      setVoiceListening(false);
      setHomeSearchOpen(false);
      setHomeSearchQuery("");
      return true;
    });
    return () => backSubscription.remove();
  }, [homeSearchOpen]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .filter((item): item is string => typeof item === "string")
              .slice(0, MAX_RECENT_SEARCHES)
          );
        }
      } catch (error) {
        console.warn("Failed to load recent searches:", error);
      }
    })();
  }, []);

  const tabBarTranslateY = useRef(new RNAnimated.Value(0)).current;
  const lastHomeOffsetY = useRef(0);
  const homeTabHidden = useRef(false);
  const heroCollapseProgress = useRef(new RNAnimated.Value(0)).current;

  const handleHomeTabBarScroll = useCallback((event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastHomeOffsetY.current;

    if (Math.abs(diff) > 10) {
      // Let the banner scroll away first; then smoothly slide the hero up to free screen space.
      if (diff > 0 && currentOffsetY > HERO_COLLAPSE_SCROLL_THRESHOLD && !heroCollapsed) {
        setHeroCollapsed(true);
        RNAnimated.timing(heroCollapseProgress, {
          toValue: 1,
          duration: 320,
          useNativeDriver: false,
        }).start();
      } else if (diff < 0 && heroCollapsed && currentOffsetY <= HERO_COLLAPSE_SCROLL_THRESHOLD) {
        // On a downward swipe, smoothly restore the hero and search spacing.
        setHeroCollapsed(false);
        RNAnimated.timing(heroCollapseProgress, {
          toValue: 0,
          duration: 360,
          useNativeDriver: false,
        }).start();
      }

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
  }, [navigation, tabBarTranslateY, heroCollapsed, heroCollapseProgress]);

  useFocusEffect(
    useCallback(() => {
      lastHomeOffsetY.current = 0;
      homeTabHidden.current = false;
      setHeroCollapsed(false);
      heroCollapseProgress.setValue(0);
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
        setHeroCollapsed(false);
        heroCollapseProgress.setValue(0);
        tabBarTranslateY.setValue(0);
      };
    }, [navigation, tabBarTranslateY, heroCollapseProgress])
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
            const parsed = JSON.parse(stored);
            if (parsed?.has_location !== false && parsed?.id) {
              const label = parsed.label || "Home";
              const place = parsed.line1 || parsed.city || "Saved address";
              if (mounted) {
                setSelectedAddress(`${label} · ${place}`);
                setLocationReady(true);
              }
              return;
            }
          }

          const list = await api.addresses();

          if (list?.length) {
            const valid = list.find((a: any) => a.has_location && a.is_default) ||
              list.find((a: any) => a.has_location) ||
              list.find((a: any) => a.is_default);

            if (valid?.has_location) {
              const label = valid.label || "Home";
              const place = valid.line1 || valid.city || "Saved address";
              if (mounted) {
                setSelectedAddress(`${label} · ${place}`);
                setLocationReady(true);
                await AsyncStorage.setItem("selected_address", JSON.stringify(valid));
              }
              return;
            }
          }

          if (mounted) {
            setLocationReady(false);
            setSelectedAddress("Set your delivery location");
          }
        } catch (error) {
          console.log("Delivery location sync failed:", error);
          if (mounted) setLocationReady(false);
        }
      };

      syncDeliveryLocation();
      return () => { mounted = false; };
    }, [user])
  );

  // Let customers open the map first; GPS is optional and can be requested on the map screen.
  const captureInitialLocation = useCallback(() => {
    router.push({ pathname: "/addresses", params: { mode: "initial" } } as any);
  }, [router]);

  const handleHomeLocationPress = useCallback(() => {
    router.push("/addresses" as any);
  }, [router]);

  // Public catalog data can load before a delivery location is selected.
  const load = useCallback(async () => {

    try {
      const [b, c, s, vs, t, u] = await Promise.all([
        api.banners().catch((error) => {
          console.warn("Home banners unavailable:", error);
          return [];
        }),
        api.categories().catch((error) => {
          console.warn("Shop by Category unavailable:", error);
          return [];
        }),
        api.stores().catch((error) => {
          console.warn("Nearby Stores unavailable:", error);
          return [];
        }),
        api.vendorServices().catch((error) => {
          console.warn("Vendor services unavailable:", error);
          return [];
        }),
        api.products({ trending: true }).catch((error) => {
          console.warn("Trending products unavailable:", error);
          return [];
        }),
        api.unreadCount().catch((error) => {
          // A notification/session issue must not block public catalog data.
          console.warn("Unread count unavailable:", error);
          return null;
        }),
      ]);
      setBanners(b || []);
      setCats(c || []);
      setStores(s || []);
      setVendorServices(vs || []);
      setTrending(t || []);
      setUnread(u?.count || 0);
    } catch (e) {
      console.log("load err", e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Animated Search Bar Placeholder Index
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Shared Values for Flashing Border Animations ONLY
  const bellScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (banners.length > 1) {
      try {
        bannerListRef.current?.scrollToOffset({ offset: bannerIndex * (BANNER_W + 12), animated: true });
      } catch {}
    }
  }, [bannerIndex, banners.length]);

  // Automatic banner carousel
  useEffect(() => {
    if (banners.length < 2) {
      setBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Search placeholder animation timer
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Continuous Dynamic Gradient Border Flash Animation Effect ONLY
  useEffect(() => {
    flashOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Notification Bell Pulse Animation Effect
  useEffect(() => {
    if (unread > 0) {
      bellScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1, // Infinite loop when unread > 0
        true
      );
    } else {
      bellScale.value = withTiming(1, { duration: 200 });
    }
  }, [unread]);

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bellScale.value }]
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value
  }));

  const loadHomeSearchProducts = useCallback(async () => {
    if (homeSearchFetchStarted.current) return;
    homeSearchFetchStarted.current = true;
    setHomeSearchLoading(true);
    setHomeSearchError("");

    try {
      const data = await api.products({ limit: 500 });
      const response = data as any;
      const products = Array.isArray(response)
        ? response
        : Array.isArray(response?.products)
          ? response.products
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.products)
              ? response.data.products
              : Array.isArray(response?.items)
                ? response.items
                : [];
      const normalizedProducts = products
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => ({
          ...item,
          id: item.id ?? item.product_id ?? item._id,
        }))
        .filter((item: any) => item.id != null && String(item.id).trim() !== "");
      setHomeSearchProducts(normalizedProducts);
    } catch (error) {
      console.warn("Home search products unavailable:", error);
      setHomeSearchError("Products could not be loaded. Please try again.");
      homeSearchFetchStarted.current = false;
    } finally {
      setHomeSearchLoading(false);
    }
  }, []);

  const openHomeSearch = () => {
    setHomeSearchFocusInput(true);
    setHomeSearchQuery("");
    setHomeSearchOpen(true);
    void loadHomeSearchProducts();
  };

  const closeHomeSearch = () => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
    voiceRecognitionRef.current = null;
    setVoiceListening(false);
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      homeSearchHistoryEntry.current &&
      (window.history.state as any)?.kmtHomeSearchOverlay
    ) {
      window.history.back();
      return;
    }
    homeSearchHistoryEntry.current = false;
    setHomeSearchOpen(false);
    setHomeSearchQuery("");
  };

  const retryHomeSearch = () => {
    homeSearchFetchStarted.current = false;
    void loadHomeSearchProducts();
  };

  const saveHomeRecentSearch = useCallback(async (value: string) => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) return;

    const updated = [
      clean,
      ...recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to save recent search:", error);
    }
  }, [recentSearches]);

  const deleteHomeRecentSearch = useCallback(async (value: string) => {
    const updated = recentSearches.filter((item) => item !== value);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to delete recent search:", error);
    }
  }, [recentSearches]);

  const handleHomeSearchSubmit = () => {
    if (homeSearchQuery.trim()) {
      void saveHomeRecentSearch(homeSearchQuery);
    }
  };

  const homeSearchResults = useMemo(() => {
    const keyword = homeSearchQuery.trim().normalize("NFKC").toLowerCase();
    if (!keyword) return homeSearchProducts;

    return homeSearchProducts.filter((item: any) => {
      const searchableText = [
        item?.name,
        item?.product_name,
        item?.productName,
        item?.title,
        item?.description,
        item?.unit,
        item?.category,
        item?.item_category,
        item?.brand,
        item?.sku,
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ")
        .normalize("NFKC")
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [homeSearchProducts, homeSearchQuery]);

  const homeSearchRows = useMemo(() => {
    const rows: any[][] = [];
    for (let index = 0; index < homeSearchResults.length; index += 2) {
      rows.push(homeSearchResults.slice(index, index + 2));
    }
    return rows;
  }, [homeSearchResults]);

  const heroExpandedHeight = HERO_BACKDROP_HEIGHT;
  const heroAnimatedHeight = heroCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [heroExpandedHeight, 0],
  });
  const heroAnimatedTranslateY = heroCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const heroAnimatedOpacity = heroCollapseProgress.interpolate({
    inputRange: [0, 0.86, 1],
    outputRange: [1, 1, 0],
  });

  const startVoiceSearch = useCallback(() => {
    if (voiceListening) {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
      return;
    }

    setHomeSearchFocusInput(false);
    setHomeSearchQuery("");
    setHomeSearchOpen(true);
    void loadHomeSearchProducts();

    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      window.alert("Voice search is not supported in this browser. Please use Chrome with microphone permission enabled.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      voiceRecognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-IN";

      recognition.onstart = () => setVoiceListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
        if (transcript) {
          setHomeSearchQuery(transcript);
          void saveHomeRecentSearch(transcript);
        }
      };
      recognition.onerror = () => {
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
      };
      recognition.onend = () => {
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
      };
      recognition.start();
    } catch {
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
    }
  }, [loadHomeSearchProducts, saveHomeRecentSearch, voiceListening]);

  const handleHomeOverlayVoicePress = (event: any) => {
    event?.stopPropagation?.();
    startVoiceSearch();
  };

  useEffect(() => () => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Clear unread badge on click & navigate
  const handleNotificationPress = () => {
    setUnread(0);
    router.push("/notifications" as any);
  };

  return (
    <View style={[s.root, Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as any) : {}]} testID="home-screen">
      {/* Dynamic time-of-day hero: day, sunset and night */}
      <RNAnimated.View
        pointerEvents={heroCollapsed ? "none" : "auto"}
        style={[
          s.heroHeaderShell,
          {
            height: heroAnimatedHeight,
            opacity: heroAnimatedOpacity,
            transform: [{ translateY: heroAnimatedTranslateY }],
          },
        ]}
      >
      <NightSky />
      <View style={s.headerBg} />

      <SafeAreaView edges={["top"]} style={s.headerWrap}>
        <View style={s.headerRow}>
          {/* 1. Address Selector (Route: /addresses) */}
          <Pressable 
            style={s.locWrap} 
            testID="location-selector"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleHomeLocationPress}
          >
            <View style={s.locIconBg}>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={THEME.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.locLabel}>Deliver to</Text>
              <Text style={s.locValue} numberOfLines={1}>
                {selectedAddress}{" "}
                <MaterialCommunityIcons name="chevron-down" size={16} color={THEME.white} />
              </Text>
            </View>
          </Pressable>

          {/* Animated Notification Bell on Top Right */}
          <View style={s.headerActions}>
            <Animated.View style={animatedBellStyle}>
              <Pressable testID="notifications-bell" onPress={handleNotificationPress} style={s.iconBtn}>
                <MaterialCommunityIcons name="bell-ring-outline" size={22} color={THEME.white} />
                {unread > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>

      </SafeAreaView>
      <View style={s.skyClearSpace} pointerEvents="none" testID="home-hero-brand-space">
        <Animated.Text testID="home-hero-brand-neon" style={[s.heroBrandNeon, animatedFlashStyle]}>
          KMT BAZAAR
        </Animated.Text>
      </View>
      </RNAnimated.View>

      {/* The search bar stays usable while the hero shell slides away after the banner scrolls off. */}
      <SafeAreaView
        edges={heroCollapsed ? ["top"] : []}
        style={[s.searchBarSafeArea, heroCollapsed && s.searchBarSafeAreaCollapsed, { backgroundColor: "transparent" }]}
      >
        <View style={[s.searchBarOuter, heroCollapsed && s.searchBarOuterCollapsed]}>
        {/* Search Bar */}
        <Pressable
          testID="home-search-trigger"
          onPress={openHomeSearch}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={THEME.white} />
          <View style={{ flex: 1, marginLeft: 8, height: 22, overflow: "hidden", justifyContent: "center" }}>
            <Animated.View
              key={placeholderIdx}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(400)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Text style={s.searchPlaceholderText}>
                {SEARCH_PLACEHOLDERS[placeholderIdx]}
              </Text>
            </Animated.View>
          </View>
          <Pressable
            testID="home-voice-search"
            onPress={(event: any) => {
              event?.stopPropagation?.();
              startVoiceSearch();
            }}
            hitSlop={8}
            style={[s.searchMicBg, voiceListening && s.searchMicListening]}
          >
            <MaterialCommunityIcons
              name={voiceListening ? "microphone" : "microphone-outline"}
              size={18}
              color={THEME.white}
            />
          </Pressable>
        </Pressable>
        </View>
      </SafeAreaView>


      <ScrollView
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl tintColor={THEME.orange} refreshing={refreshing} onRefresh={onRefresh} />
            )
          }
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          onScroll={handleHomeTabBarScroll}
          scrollEventThrottle={16}
          style={Platform.OS === 'web' ? ({ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y' } as any) : { flex: 1 }}
        >
          {!locationReady && (
            <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
              <View style={[s.locationGateCard, { width: "100%", maxWidth: 600, padding: SPACING.md, alignSelf: "center" }]}>
                <View style={[s.locationGateIcon, { width: 54, height: 54, borderRadius: 27, marginBottom: 8 }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={26} color={THEME.orange} />
                </View>
                <Text style={[s.locationGateTitle, { fontSize: 18 }]}>Set your delivery location</Text>
                <Text style={[s.locationGateText, { fontSize: 12, lineHeight: 18 }]}>
                  Browse products and stores now. Choose a delivery location to continue with the delivery flow.
                </Text>
                <Pressable
                  onPress={captureInitialLocation}
                  disabled={initialLocationLoading}
                  style={[s.locationGateButton, { marginTop: 12, paddingVertical: 11 }, initialLocationLoading && { opacity: 0.7 }]}
                >
                  {initialLocationLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="map-marker-radius" size={19} color="#fff" />
                  )}
                  <Text style={s.locationGateButtonText}>
                    {initialLocationLoading ? "DETECTING LOCATION..." : "CHOOSE LOCATION ON MAP"}
                  </Text>
                </Pressable>
                {!!initialLocationError && (
                  <Text style={s.locationGateError}>{initialLocationError}</Text>
                )}
                <Text style={s.locationGatePrivacy}>
                  Your exact delivery GPS is used for delivery and is not shown to other customers.
                </Text>
              </View>
            </View>
          )}


        {/* Smooth banner carousel; dots are overlaid inside the banner bottom edge */}
        <View style={s.bannerCarouselShell}>
          <FlatList
            horizontal
            style={Platform.OS === 'web' ? { overflowX: 'auto' } : {}}
            data={banners}
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            decelerationRate={0.98}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xs, gap: 12 }}
            keyExtractor={(it) => String(it.id)}
            ref={(ref) => {
              if (banners.length > 1 && ref && typeof (ref as any).scrollToIndex === "function") {
                try { (ref as any).scrollToIndex({ index: bannerIndex, animated: true, viewPosition: 0 }); } catch {}
              }
            }}
            renderItem={({ item }) => (
              <View style={s.bannerItemWrap}>
                <View testID={`banner-${item.id}`} style={s.banner}>
                  <Image
                  source={{ uri: brokenImages[`banner:${String(item.id)}`] ? IMAGE_FALLBACK_URL : (item.image || IMAGE_FALLBACK_URL) }}
                  style={s.bannerImg}
                  contentFit="cover"
                  onError={() => setBrokenImages(prev => ({ ...prev, [`banner:${String(item.id)}`]: true }))}
                />

                <Animated.View style={[s.bannerFlashBorder, animatedFlashStyle]} />

                <View style={s.bannerText}>
                  {item.subtitle ? <Text style={s.bannerSubtitle}>{item.subtitle}</Text> : null}
                  {item.title ? <Text style={s.bannerTitle}>{item.title}</Text> : null}
                  <View style={s.bannerCta}>
                    <Text style={s.bannerCtaText}>{item.cta || "Explore Now"} →</Text>
                  </View>
                </View>
                </View>
                {banners.length > 1 && (
                  <View pointerEvents="none" style={s.bannerRopeConnector}>
                    <View style={s.bannerRopeLine} />
                    <View style={s.bannerRopeKnot} />
                  </View>
                )}
              </View>
            )}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.round(offsetX / (BANNER_W + 12));
              if (nextIndex >= 0 && nextIndex < banners.length) setBannerIndex(nextIndex);
            }}
          />

          {banners.length > 1 && (
            <View pointerEvents="none" style={s.bannerDotsOverlay}>
              {banners.map((item, index) => (
                <BannerDot key={String(item.id)} active={index === bannerIndex} />
              ))}
            </View>
          )}
        </View>

        {/* Categories Section with Flashing Border Tiles */}
        <SectionTitle title="Shop by Category" subtitle="Clear & easy ordering" />
        <View style={s.catsGrid}>
          {cats.map((c) => (
            <View key={c.id} style={s.catItemWrap}>
              <Pressable
                testID={`category-${c.id}`}
                onPress={() => router.push({ pathname: "/home-category/[id]", params: { id: String(c.id), name: String(c.name || "") } } as any)}
                style={s.catItem}
              >
                <View style={s.catCircleWrap}>
                  <Animated.View style={[s.catFlashBorder, animatedFlashStyle]} />
                  <View style={s.catCircle}>
                    <Image
                      source={{ uri: brokenImages[`cat:${String(c.id)}`] ? IMAGE_FALLBACK_URL : (c.image || IMAGE_FALLBACK_URL) }}
                      style={s.catImg}
                      contentFit="cover"
                      onError={() => setBrokenImages(prev => ({ ...prev, [`cat:${String(c.id)}`]: true }))}
                    />
                  </View>
                </View>
                <Text style={s.catName} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Nearby Stores List — directly below Shop by Category */}
        <View style={s.nearbySectionLift}>
          <SectionTitle title="Nearby Stores" subtitle="Fast delivery hubs" />
        </View>
        <FlatList
          horizontal
          data={stores}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 10, paddingTop: 2, paddingBottom: 8 }}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => {
            const isAvailable = item.is_online !== false;

            return (
              <Pressable 
                testID={`store-${item.id}`} 
                style={[s.storeCardSmall, !isAvailable && { opacity: 0.55 }]}
                disabled={!isAvailable}
                onPress={() => router.push({ pathname: `/store/${item.id}`, params: { name: item.name } } as any)}
              >
                {/* Animated Flashing Gradient Border */}
                <Animated.View style={[s.storeFlashBorder, animatedFlashStyle]} />
                
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: brokenImages[`store:${String(item.id)}`] ? IMAGE_FALLBACK_URL : (item.image || IMAGE_FALLBACK_URL) }}
                    style={s.storeImgSmall}
                    contentFit="cover"
                    onError={() => setBrokenImages(prev => ({ ...prev, [`store:${String(item.id)}`]: true }))}
                  />
                  
                  {!isAvailable && (
                    <View style={s.offlineOverlay}>
                      <Text style={s.offlineText}>CLOSED</Text>
                    </View>
                  )}
                </View>

                <View style={{ padding: 6 }}>
                  <Text style={[s.storeNameSmall, !isAvailable && { color: THEME.blackMuted }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    
                    {isAvailable ? (
                      <View style={s.ratePillSmall}>
                        <MaterialCommunityIcons name="star" size={9} color={THEME.white} />
                        <Text style={s.rateTextSmall}>{item.rating || "4.5"}</Text>
                      </View>
                    ) : (
                      <View style={[s.ratePillSmall, { backgroundColor: THEME.blackMuted }]}>
                        <MaterialCommunityIcons name="store-off-outline" size={9} color={THEME.white} />
                        <Text style={s.rateTextSmall}>Off</Text>
                      </View>
                    )}

                    <Text style={s.storeMinSmall}>{item.delivery_min || 15}m</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />

        {/* Service Marketplace Section */}
        <SectionTitle title="Services" subtitle="Book local services" />
        <FlatList
          horizontal
          data={[
            { id: "holiday", title: "Holiday", sub: "Holiday packages", icon: "airplane-takeoff", path: "/holiday" },
            { id: "car_rental", title: "Car Rental", sub: "Cars & trips", icon: "car", path: "/car-rental" },
            { id: "daily_service", title: "Daily Services", sub: "Repair & local work", icon: "tools", path: "/daily-services" },
          ]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 10, paddingVertical: 4 }}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: 165, height: 132, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 }}
              onPress={() => router.push(item.path as any)}
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={THEME.skyHeader} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: THEME.black, marginTop: 10 }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: THEME.blackMuted, marginTop: 3 }} numberOfLines={1}>{item.sub}</Text>
            </Pressable>
          )}
        />

        {/* Trending Products Section */}
        <SectionTitle title="Trending Products" subtitle="Best sellers this week" />
        <View style={s.trendingGrid}>
          {trending.map((item) => (
            <View key={item.id} style={s.productTileCard}>
              <Animated.View style={[s.productFlashBorder, animatedFlashStyle]} />
              <ProductCard p={item} />
            </View>
          ))}
        </View>
        
        <View style={{ height: 20 }} />
        
        {/* Sky & Orange Promise Strip */}
        <View style={s.brandStrip}>
          <LinearGradient 
            colors={[THEME.skyHeader, THEME.skyHeaderDark]} 
            style={s.brandStripGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={s.brandIconCircle}>
              <MaterialCommunityIcons name="shield-check" size={22} color={THEME.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandStripTitle}>KMT Bazaar Promise</Text>
              <Text style={s.brandStripSub}>Fast delivery · Trusted shops · Easy returns</Text>
            </View>
          </LinearGradient>
        </View>
        <BrandingFooter caption="Trusted Shopping · Fast Delivery" />
      </ScrollView>

      {/* Floating Checkout Bar */}
      <CheckoutBar />

      {homeSearchOpen && (
        <View style={s.homeSearchOverlay} testID="home-search-overlay">
          <BlurView
            intensity={42}
            tint="dark"
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={s.homeSearchScrim} />

          <SafeAreaView edges={["top", "bottom"]} style={s.homeSearchOverlayContent}>
            <View style={s.homeSearchHeaderRow}>
              <View style={s.homeSearchInputWrap}>
                <MaterialCommunityIcons name="magnify" size={21} color={THEME.skyHeader} />
                <TextInput
                  testID="home-search-input"
                  value={homeSearchQuery}
                  onChangeText={setHomeSearchQuery}
                  placeholder="Search products..."
                  placeholderTextColor="#64748B"
                  autoFocus={homeSearchFocusInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={s.homeSearchInput}
                  onSubmitEditing={handleHomeSearchSubmit}
                />
                {homeSearchQuery.length > 0 && (
                  <Pressable
                    testID="home-search-clear"
                    onPress={() => setHomeSearchQuery("")}
                    hitSlop={8}
                    style={s.homeSearchClear}
                  >
                    <MaterialCommunityIcons name="close-circle" size={19} color="#64748B" />
                  </Pressable>
                )}
                <Pressable
                  testID="home-search-mic"
                  accessibilityRole="button"
                  accessibilityLabel={voiceListening ? "Stop voice search" : "Start voice search"}
                  onPress={handleHomeOverlayVoicePress}
                  hitSlop={8}
                  style={s.homeSearchMic}
                >
                  <MaterialCommunityIcons
                    name={voiceListening ? "microphone" : "microphone-outline"}
                    size={19}
                    color={voiceListening ? THEME.orange : THEME.skyHeader}
                  />
                </Pressable>
              </View>
              <Pressable
                testID="home-search-back"
                accessibilityRole="button"
                accessibilityLabel="Back to home"
                onPress={closeHomeSearch}
                hitSlop={8}
                style={s.homeSearchClose}
              >
                <MaterialCommunityIcons name="arrow-left" size={23} color={THEME.black} />
              </Pressable>
            </View>

            <View style={s.homeSearchSummaryRow}>
              <Text style={s.homeSearchSummary}>
                {homeSearchQuery.trim()
                  ? homeSearchResults.length + " products found"
                  : homeSearchProducts.length + " products available"}
              </Text>
            </View>

            {homeSearchLoading ? (
              <View style={s.homeSearchState}>
                <ActivityIndicator size="large" color={THEME.orange} />
                <Text style={s.homeSearchStateText}>Loading products...</Text>
              </View>
            ) : homeSearchError ? (
              <View style={s.homeSearchState}>
                <Text style={s.homeSearchStateText}>{homeSearchError}</Text>
                <Pressable onPress={retryHomeSearch} style={s.homeSearchRetry}>
                  <Text style={s.homeSearchRetryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                testID="home-search-product-list"
                style={s.homeSearchResultsScroll}
                contentContainerStyle={s.homeSearchResultsGrid}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {homeSearchQuery.trim().length === 0 && recentSearches.length > 0 && (
                  <View style={s.homeSearchRecentSection} testID="home-search-recent-history">
                    <View style={s.homeSearchRecentHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MaterialCommunityIcons name="history" size={17} color={THEME.skyHeader} />
                        <Text style={s.homeSearchRecentTitle}>Recent searches</Text>
                      </View>
                      <Text style={s.homeSearchRecentCount}>{recentSearches.length}/5</Text>
                    </View>
                    <View style={s.homeSearchRecentChips}>
                      {recentSearches.map((item) => (
                        <View key={item} style={s.homeSearchRecentChip}>
                          <Pressable
                            onPress={() => setHomeSearchQuery(item)}
                            hitSlop={6}
                            style={s.homeSearchRecentChipMain}
                          >
                            <MaterialCommunityIcons name="history" size={14} color={THEME.skyHeader} />
                            <Text style={s.homeSearchRecentChipText} numberOfLines={1}>{item}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void deleteHomeRecentSearch(item)}
                            hitSlop={6}
                            style={s.homeSearchRecentChipDelete}
                          >
                            <MaterialCommunityIcons name="close" size={13} color="#64748B" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {homeSearchRows.length > 0 ? (
                  homeSearchRows.map((row, rowIndex) => (
                    <View key={"home-search-row-" + rowIndex} style={s.homeSearchProductRow}>
                      {row.map((item: any) => (
                        <View key={String(item.id)} style={s.homeSearchProductCell}>
                          <ProductCard p={item} compact />
                        </View>
                      ))}
                      {row.length === 1 && <View style={s.homeSearchProductCell} pointerEvents="none" />}
                    </View>
                  ))
                ) : (
                  <View style={s.homeSearchState}>
                    <MaterialCommunityIcons name="magnify-close" size={42} color={THEME.white} />
                    <Text style={s.homeSearchStateText}>
                      {homeSearchQuery.trim()
                        ? "No matching products found. Try another product name."
                        : homeSearchProducts.length === 0
                          ? "No products are currently available."
                          : "No products match this search."}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

function BannerDot({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0.35, { duration: 320 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scaleX: progress.value }],
  }));

  return <Animated.View style={[s.bannerDot, animatedStyle]} />;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={s.sectionIndicator} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  serviceCardSmall: { width: width > 768 ? 240 : Math.max(150, (width - (SPACING.lg * 2) - 10) / 2), height: 150, backgroundColor: THEME.white, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: THEME.borderSoft },
  serviceImgSmall: { width: "100%", height: 105 },
  servicePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  serviceNameSmall: { fontWeight: "800", color: THEME.black, fontSize: 12 },
  serviceVendorSmall: { fontSize: 10, color: THEME.blackMuted, fontWeight: "600", marginTop: 3 },
  locationGate: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 40, backgroundColor: THEME.whiteBg },
  locationGateCard: { width: "100%", maxWidth: 460, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: THEME.borderSoft },
  locationGateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1E8", marginBottom: 14 },
  locationGateTitle: { fontSize: 22, fontWeight: "900", color: THEME.black, textAlign: "center" },
  locationGateText: { marginTop: 8, color: THEME.blackMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  locationGateButton: { marginTop: 20, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: THEME.orange, paddingVertical: 14, borderRadius: 14 },
  locationGateButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  locationGateError: { marginTop: 10, color: "#B91C1C", fontSize: 11, lineHeight: 16, textAlign: "center" },
  locationGatePrivacy: { marginTop: 12, color: THEME.blackMuted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  root: { flex: 1, backgroundColor: THEME.whiteBg },
  /* Realistic 3D-style sky layers stay behind the existing header/search only */
  heroHeaderShell: { position: "relative", width: "100%", overflow: "visible" },
  nightSky: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, overflow: "hidden", zIndex: 0, pointerEvents: "none" },
  nightGradientLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  nightGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cloud: { position: "absolute", width: 164, height: 70, opacity: 0.58 },
  cloudOne: { top: 60, left: -42 },
  cloudTwo: { top: 92, right: -62 },
  cloudPuff: { position: "absolute", borderRadius: 40, shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  horizonGlow: { position: "absolute", left: "12%", right: "12%", bottom: 4, height: 68, borderTopLeftRadius: 170, borderTopRightRadius: 170, backgroundColor: "rgba(255,190,130,0.10)" },
  horizonSilhouette: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, backgroundColor: "rgba(13,28,38,0.58)" },
  house: { position: "absolute", bottom: 1, height: 22, zIndex: 3 },
  houseLeft: { left: "8%", width: 34, height: 20 },
  houseCenter: { left: "25%", width: 66, height: 34 },
  houseMainRoof: { left: 1, bottom: 13, borderLeftWidth: 32, borderRightWidth: 32, borderBottomWidth: 18 },
  houseMainBody: { left: 5, right: 5, bottom: 0, height: 18 },
  houseMainWindow: { bottom: 5, width: 6, height: 7 },
  houseRight: { right: "28%", width: 40, height: 19 },
  houseFarRight: { right: "5%", width: 30, height: 17 },
  houseRoof: { position: "absolute", left: 0, bottom: 10, width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent" },
  houseBody: { position: "absolute", left: 4, right: 4, bottom: 0, height: 12, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  houseWindow: { position: "absolute", bottom: 3, width: 4, height: 5, borderRadius: 1 },
  smokeColumn: { position: "absolute", left: "20%", bottom: 20, width: 94, height: 118 },
  smokePuff: { position: "absolute", borderRadius: 50, backgroundColor: "rgba(206,218,226,0.50)", shadowColor: "#CBD5E1", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.34, shadowRadius: 14, elevation: 1 },
  smokeStack: { position: "absolute", bottom: 20, left: "32.5%", width: 8, height: 14, backgroundColor: "#263442", borderTopWidth: 2, borderTopColor: "#526170" },
  heroTree: { position: "absolute", bottom: 0, width: 62, height: 82, zIndex: 2, transformOrigin: "bottom" } as any,
  heroTreeLeft: { left: "1%" },
  heroTreeRight: { right: "2%", width: 58, height: 72 },
  heroTreeTrunk: { position: "absolute", bottom: 0, left: "44%", width: 8, height: 34, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  heroTreeCanopy: { position: "absolute", borderRadius: 50 },
  heroTreeCanopyLeft: { left: 2, top: 25, width: 39, height: 36 },
  heroTreeCanopyTop: { left: 16, top: 2, width: 37, height: 39 },
  heroTreeCanopyRight: { right: 0, top: 25, width: 36, height: 33 },
  heroTreeCanopyLower: { left: 9, top: 39, width: 45, height: 31 },
  starLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 92 },
  star: { position: "absolute", backgroundColor: "#FFFFFF", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 5, elevation: 3 },
  sunGlow: { position: "absolute", top: 10, right: "12%", width: 90, height: 90, alignItems: "center", justifyContent: "center" },
  sunHaloOuter: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.14)" },
  sunHalo: { position: "absolute", width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,248,220,0.25)" },
  sunCore: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFF7CC", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 6 },
  sunsetGlow: { position: "absolute", left: "28%", right: "28%", bottom: 0, height: 78, alignItems: "center", justifyContent: "flex-end" },
  sunsetHalo: { width: "100%", height: 78, borderTopLeftRadius: 140, borderTopRightRadius: 140, backgroundColor: "rgba(255,190,120,0.16)" },
  moon: { position: "absolute", top: 12, right: "15%", width: 78, height: 78, alignItems: "center", justifyContent: "center" },
  moonHalo: { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(226,232,240,0.10)" },
  moonBody: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#F8FAFC", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 18, elevation: 5, overflow: "hidden" },
  moonCut: { position: "absolute", top: -3, left: 13, width: 40, height: 40, borderRadius: 20, backgroundColor: "#0B1120" },
  airplane: { position: "absolute", top: 0, left: -20, width: 46, height: 24, alignItems: "center", justifyContent: "center" },
  airplaneTrail: { position: "absolute", width: 26, height: 2, left: -23, top: 13, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  cloud: { position: "absolute", width: 164, height: 70, opacity: 0.58 },
  cloudOne: { top: 60, left: -42 },
  cloudTwo: { top: 92, right: -62 },
  cloudPuff: { position: "absolute", borderRadius: 40, shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  cloudShade: { position: "absolute", left: 4, right: 4, bottom: 2, height: 28, borderRadius: 20, opacity: 0.34 },
  cloudHighlightOne: { position: "absolute", left: 42, top: 8, width: 38, height: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.22)" },
  cloudHighlightTwo: { position: "absolute", left: 38, top: 7, width: 32, height: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" },
  cloudBase: { position: "absolute", left: 2, right: 2, bottom: 4, height: 24, borderRadius: 18, backgroundColor: "rgba(100,116,139,0.12)" },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "transparent", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 7 },
  skyClearSpace: { height: Platform.OS === "web" ? 90 : 56, alignItems: "center", justifyContent: "center" },
  skyClearSpaceCollapsed: { height: 0 },
  searchBarSafeArea: { backgroundColor: "transparent", zIndex: 20, elevation: 0 },
  searchBarSafeAreaCollapsed: { borderBottomWidth: 1, borderBottomColor: "rgba(226,232,240,0.9)" },
  searchBarOuter: { paddingHorizontal: SPACING.lg, marginTop: 0 },
  searchBarOuterCollapsed: { marginTop: 0, paddingBottom: 8 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  locationErrorText: { color: "#FEF3C7", fontSize: 9, fontWeight: "700", marginTop: 2, maxWidth: 260 },
  heroBrandNeon: { color: "#FFF7D6", fontSize: 18, fontWeight: "900", letterSpacing: 3, textAlign: "center", transform: [{ translateY: -26 }], textShadowColor: "#FFC928", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(22,163,74,0.22)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14, height: 44, borderWidth: 1, borderColor: "rgba(134,239,172,0.72)", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  searchPlaceholderText: { fontSize: 16, color: "#FFFFFF", fontWeight: "500", textShadowColor: "rgba(0,0,0,0.38)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  searchMicBg: { width: 32, height: 32, backgroundColor: THEME.orange, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchMicListening: { transform: [{ scale: 1.08 }], backgroundColor: THEME.orangeBright },

  /* Clean Banner Styling */
  banner: { width: BANNER_W, height: 145, borderRadius: 20, overflow: "hidden", backgroundColor: THEME.white, position: "relative", borderWidth: 1, borderColor: "rgba(255,107,0,0.22)", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6 },
  bannerImg: { width: "100%", height: "100%" },
  bannerFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg, borderWidth: 2.5, borderColor: THEME.orangeBright, pointerEvents: "none" },
  bannerCarouselShell: { position: "relative" },
  bannerItemWrap: { width: BANNER_W, position: "relative" },
  bannerRopeConnector: { position: "absolute", right: -1, top: "50%", width: 10, height: 52, transform: [{ translateY: -26 }], alignItems: "center", justifyContent: "center", zIndex: 5 },
  bannerRopeLine: { width: 3, height: 44, borderRadius: 3, backgroundColor: "#8B6B45", opacity: 0.95 },
  bannerRopeKnot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#6B4F32", top: 2 },

  bannerDotsOverlay: { position: "absolute", left: 0, right: 0, bottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  bannerDot: { width: 18, height: 5, borderRadius: 3, backgroundColor: THEME.orange },
  bannerText: { position: "absolute", left: 14, bottom: 12, right: 16, alignItems: "flex-start" },
  bannerSubtitle: { color: THEME.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bannerTitle: { color: THEME.white, fontSize: 18, fontWeight: "900", marginTop: 4, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 },
  bannerCta: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, alignSelf: "flex-start", backgroundColor: THEME.orange },
  bannerCtaText: { color: THEME.white, fontWeight: "800", fontSize: 12 },
  
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
  sectionIndicator: { width: 4, height: 16, backgroundColor: THEME.orange, borderRadius: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: THEME.black },
  sectionSub: { fontSize: 12, color: THEME.blackMuted, marginTop: 2, marginLeft: 12 },
  nearbySectionLift: { marginTop: -8 },
  
  catsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.sm },
  catItemWrap: { width: "20%", alignItems: "center", marginBottom: SPACING.md },
  catItem: { alignItems: "center" },
  catCircleWrap: { position: "relative", width: 60, height: 60 },
  catFlashBorder: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 32, borderWidth: 2, borderColor: THEME.orange, zIndex: 1, pointerEvents: "none" },
  catCircle: { width: 60, height: 60, borderRadius: 30, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: THEME.white, ...shadow.soft, borderWidth: 1, borderColor: THEME.borderSoft },
  catImg: { width: "100%", height: "100%" },
  catName: { fontSize: 11, fontWeight: "700", color: THEME.black, marginTop: 6, textAlign: "center" },
  
  /* Compact Store Tile Styling */
  storeCardSmall: { width: Math.min((width - SPACING.lg * 2 - 10) / 2, 190), height: 112, backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 16, overflow: "hidden", position: "relative", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 5, borderWidth: 1, borderColor: "rgba(255,107,0,0.15)" },
  storeFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.orangeGlow, pointerEvents: "none", zIndex: 2 },
  storeImgSmall: { width: "100%", height: 64 },
  storeNameSmall: { fontWeight: "800", color: THEME.black, fontSize: 12 },
  ratePillSmall: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.orange, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, gap: 2 },
  rateTextSmall: { color: THEME.white, fontSize: 10, fontWeight: "800" },
  storeMinSmall: { fontSize: 10, color: THEME.blackMuted, fontWeight: "700" },

  offlineOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", justifyContent: "center", alignItems: "center" },
  offlineText: { color: THEME.white, backgroundColor: "#E11D48", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 9, fontWeight: "900" },

  trendingGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, justifyContent: "space-between" },
  productTileCard: { width: width > 768 ? "23%" : "48%", marginBottom: 12, position: "relative" },
  productFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.orange, pointerEvents: "none", zIndex: 2 },

  brandStrip: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: "hidden", ...shadow.card },
  brandStripGradient: { flexDirection: "row", gap: SPACING.md, alignItems: "center", padding: SPACING.md },
  brandIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center" },
  brandStripTitle: { color: THEME.white, fontWeight: "900", fontSize: 14 },
  brandStripSub: { color: "#E0F2FE", marginTop: 2, fontSize: 12, fontWeight: "600" },

  homeSearchOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100, backgroundColor: "rgba(2,6,23,0.16)" },
  homeSearchScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.16)" },
  homeSearchOverlayContent: { flex: 1, paddingHorizontal: SPACING.lg },
  homeSearchHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: 10 },
  homeSearchInputWrap: { flex: 1, minWidth: 0, height: 50, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.97)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  homeSearchInput: { flex: 1, minWidth: 0, height: 46, padding: 0, fontSize: 15, color: THEME.black, backgroundColor: "transparent", ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  homeSearchClear: { width: 28, height: 34, alignItems: "center", justifyContent: "center" },
  homeSearchMic: { width: 30, height: 34, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: "#E2E8F0" },
  homeSearchClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.97)" },
  homeSearchSummaryRow: { paddingBottom: 9 },
  homeSearchSummary: { color: THEME.white, fontSize: 13, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  homeSearchResultsScroll: { flex: 1, minHeight: 0, width: "100%" },
  homeSearchResultsGrid: { flexGrow: 1, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 120 },
  homeSearchProductRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  homeSearchProductCell: { width: "48.5%", minWidth: 0, flexGrow: 0, flexShrink: 0 },
  homeSearchRecentSection: { marginHorizontal: 4, marginBottom: 12, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  homeSearchRecentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  homeSearchRecentTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  homeSearchRecentCount: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  homeSearchRecentChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  homeSearchRecentChip: { maxWidth: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 99, borderWidth: 1, borderColor: "#E2E8F0", paddingLeft: 10, minHeight: 34 },
  homeSearchRecentChipMain: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingRight: 7, maxWidth: 190 },
  homeSearchRecentChipText: { flexShrink: 1, color: "#334155", fontSize: 12, fontWeight: "700" },
  homeSearchRecentChipDelete: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 3, backgroundColor: "#FFFFFF" },
  homeSearchState: { flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 10 },
  homeSearchStateText: { color: THEME.white, fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center", textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  homeSearchRetry: { marginTop: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: THEME.orange },
  homeSearchRetryText: { color: THEME.white, fontSize: 12, fontWeight: "900" },
});