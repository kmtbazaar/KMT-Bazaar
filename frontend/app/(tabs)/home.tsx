import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform, ActivityIndicator, Animated as RNAnimated } from "react-native";
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
  "Search 'medicines'...",
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

const SKY_STARS = Array.from({ length: 26 }, (_, index) => ({
  left: `${(index * 37 + 11) % 96}%`,
  top: 7 + ((index * 19 + 13) % 68),
  size: index % 5 === 0 ? 2 : 1.4,
}));


function NightSky() {
  const canvasRef = useRef<any>(null);
  const [hour, setHour] = useState(new Date().getHours() + new Date().getMinutes() / 60);
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const cloudOne = useSharedValue(-45);
  const cloudTwo = useSharedValue(0);
  const cloudDepth = useSharedValue(0);
  const smokeRise = useSharedValue(0);
  const smokeSway = useSharedValue(0);
  const treeSway = useSharedValue(0);
  const treeFarSway = useSharedValue(0);

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

        precision mediump float;
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

        float ellipse(vec2 p, vec2 center, vec2 radii, float softness, float aspect) {
          vec2 d = vec2((p.x - center.x) * aspect, p.y - center.y);
          float radius = length(d / radii);
          return 1.0 - smoothstep(1.0 - softness, 1.0 + softness, radius);
        }

        float box(vec2 p, vec2 center, vec2 halfSize, float softness, float aspect) {
          vec2 d = vec2((p.x - center.x) * aspect, p.y - center.y);
          float edge = max(abs(d.x) - halfSize.x, abs(d.y) - halfSize.y);
          return 1.0 - smoothstep(0.0, softness, edge);
        }

        float lineMask(vec2 p, vec2 a, vec2 b, float thickness, float aspect) {
          vec2 pa = vec2((p.x - a.x) * aspect, p.y - a.y);
          vec2 ba = vec2((b.x - a.x) * aspect, b.y - a.y);
          float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
          float d = length(pa - ba * h);
          return 1.0 - smoothstep(thickness * 0.65, thickness * 1.35, d);
        }

        void main() {
          vec2 uv = v_uv;
          float aspect = u_resolution.x / max(u_resolution.y, 1.0);
          float clock = mod(u_hour + 24.0, 24.0);
          float t = u_time * 0.000018;

          // A cinematic day-to-night color grade with soft dawn and sunset bands.
          float day = smoothstep(5.6, 7.4, clock) * (1.0 - smoothstep(17.0, 19.1, clock));
          float dawn = smoothstep(4.4, 6.0, clock) * (1.0 - smoothstep(7.2, 8.4, clock));
          float dusk = smoothstep(16.2, 18.25, clock) * (1.0 - smoothstep(19.2, 20.7, clock));
          float twilight = clamp(max(dawn, dusk), 0.0, 1.0);
          float night = clamp(1.0 - max(day, twilight * 0.84), 0.0, 1.0);

          vec3 dayTop = vec3(0.025, 0.17, 0.34);
          vec3 dayMid = vec3(0.10, 0.42, 0.66);
          vec3 dayHorizon = vec3(0.77, 0.86, 0.90);
          vec3 dawnTop = vec3(0.055, 0.07, 0.17);
          vec3 dawnMid = vec3(0.32, 0.22, 0.35);
          vec3 dawnHorizon = vec3(1.00, 0.56, 0.34);
          vec3 duskTop = vec3(0.018, 0.024, 0.085);
          vec3 duskMid = vec3(0.25, 0.095, 0.19);
          vec3 duskHorizon = vec3(1.00, 0.36, 0.17);
          vec3 nightTop = vec3(0.002, 0.006, 0.022);
          vec3 nightMid = vec3(0.008, 0.027, 0.068);
          vec3 nightHorizon = vec3(0.035, 0.070, 0.11);

          vec3 topColor = mix(nightTop, dayTop, day);
          topColor = mix(topColor, dawnTop, dawn * 0.96);
          topColor = mix(topColor, duskTop, dusk);
          vec3 midColor = mix(nightMid, dayMid, day);
          midColor = mix(midColor, dawnMid, dawn * 0.96);
          midColor = mix(midColor, duskMid, dusk);
          vec3 horizonColor = mix(nightHorizon, dayHorizon, day);
          horizonColor = mix(horizonColor, dawnHorizon, dawn * 0.98);
          horizonColor = mix(horizonColor, duskHorizon, dusk);

          vec3 sky = mix(horizonColor, midColor, smoothstep(0.10, 0.49, uv.y));
          sky = mix(sky, topColor, smoothstep(0.40, 0.98, uv.y));
          float horizonGlow = exp(-abs(uv.y - 0.19) * 11.0);
          sky += vec3(0.24, 0.17, 0.15) * horizonGlow * twilight * 0.12;

          // Sun and moon keep the same daily cycle, with very inexpensive soft halos.
          float sunPhase = clamp((clock - 5.0) / 14.2, 0.0, 1.0);
          vec2 sunPos = vec2(mix(-0.025, 1.025, sunPhase), 0.14 + 0.61 * sin(sunPhase * 3.1415926));
          vec2 sunDelta = vec2((uv.x - sunPos.x) * aspect, uv.y - sunPos.y);
          float sunDistance = length(sunDelta);
          float sunVisible = clamp(max(day, twilight), 0.0, 1.0);
          sky += vec3(1.00, 0.40, 0.15) * exp(-sunDistance * 6.0) * sunVisible * (0.13 + twilight * 0.20);
          float sunDisk = 1.0 - smoothstep(0.054, 0.063, sunDistance);
          float sunRim = 0.82 + 0.18 * sqrt(max(0.0, 1.0 - pow(clamp(sunDistance / 0.063, 0.0, 1.0), 2.0)));
          sky += vec3(1.00, 0.86, 0.62) * sunDisk * sunRim * sunVisible * 0.9;

          float moonPhase = clamp(mod(clock - 18.3 + 24.0, 24.0) / 11.8, 0.0, 1.0);
          vec2 moonPos = vec2(mix(0.93, 0.07, moonPhase), 0.22 + 0.47 * sin(moonPhase * 3.1415926));
          vec2 moonDelta = vec2((uv.x - moonPos.x) * aspect, uv.y - moonPos.y);
          float moonDistance = length(moonDelta);
          float moonVisible = max(1.0 - smoothstep(5.0, 6.5, clock), smoothstep(18.1, 20.0, clock));
          vec2 moonLocal = moonDelta / 0.076;
          float moonRadius = length(moonLocal);
          float moonDisk = 1.0 - smoothstep(0.93, 1.0, moonRadius);
          float moonSphere = sqrt(max(0.0, 1.0 - dot(moonLocal, moonLocal)));
          float craterOne = ellipse(uv, moonPos + vec2(-0.022 / aspect, 0.017), vec2(0.014, 0.012), 0.12, aspect);
          float craterTwo = ellipse(uv, moonPos + vec2(0.022 / aspect, -0.019), vec2(0.010, 0.009), 0.12, aspect);
          float moonSurface = (0.91 + 0.09 * moonSphere - craterOne * 0.12 - craterTwo * 0.08) * moonDisk;
          sky += vec3(0.28, 0.42, 0.72) * exp(-moonDistance * 6.2) * moonVisible * 0.22;
          sky += vec3(0.84, 0.89, 0.98) * moonSurface * moonVisible;

          // Two drifting cloud banks: layered silhouettes instead of expensive multi-octave noise.
          float cloudX1 = mod(0.08 + t * 0.075, 1.32) - 0.16;
          float cloudX2 = mod(0.91 - t * 0.055, 1.30) - 0.15;
          float cloudOne = max(
            max(ellipse(uv, vec2(cloudX1, 0.66), vec2(0.25, 0.040), 0.18, aspect),
                ellipse(uv, vec2(cloudX1 + 0.16 / aspect, 0.682), vec2(0.19, 0.052), 0.18, aspect)),
            ellipse(uv, vec2(cloudX1 - 0.16 / aspect, 0.657), vec2(0.17, 0.033), 0.18, aspect)
          );
          float cloudTwo = max(
            max(ellipse(uv, vec2(cloudX2, 0.50), vec2(0.24, 0.030), 0.18, aspect),
                ellipse(uv, vec2(cloudX2 - 0.15 / aspect, 0.519), vec2(0.16, 0.041), 0.18, aspect)),
            ellipse(uv, vec2(cloudX2 + 0.16 / aspect, 0.499), vec2(0.16, 0.027), 0.18, aspect)
          );
          vec3 dayCloud = mix(vec3(0.25, 0.36, 0.47), vec3(0.94, 0.96, 0.97), day * 0.86 + 0.08);
          vec3 nightCloud = vec3(0.025, 0.050, 0.093);
          vec3 duskCloud = mix(vec3(0.21, 0.11, 0.20), vec3(0.98, 0.51, 0.34), twilight * 0.85);
          vec3 cloudColor = mix(nightCloud, dayCloud, day);
          cloudColor = mix(cloudColor, duskCloud, twilight * 0.95);
          sky = mix(sky, cloudColor, cloudOne * (0.21 + day * 0.21 + twilight * 0.15 + night * 0.08));
          sky = mix(sky, cloudColor * 0.88, cloudTwo * (0.14 + day * 0.12 + twilight * 0.12 + night * 0.07));

          // Sparse stars gently twinkle only after dusk.
          vec2 starCell = floor(vec2(uv.x * 160.0, uv.y * 72.0));
          float starSeed = hash(starCell);
          float stars = step(0.991, starSeed) * smoothstep(0.22, 0.57, uv.y);
          float twinkle = 0.82 + 0.18 * sin(u_time * 0.0012 + starSeed * 53.0);
          sky += vec3(0.66, 0.79, 1.0) * stars * twinkle * moonVisible * 0.76;

          // Distant ridges and foreground grass add depth with only a few noise samples.
          float ridge = 0.177 + noise(vec2(uv.x * 4.6 + 2.0, 5.0)) * 0.043 + 0.008 * sin(uv.x * 8.0);
          float ridgeMask = 1.0 - smoothstep(ridge - 0.006, ridge + 0.009, uv.y);
          vec3 ridgeColor = mix(vec3(0.24, 0.32, 0.36), vec3(0.014, 0.025, 0.042), night * 0.92);
          sky = mix(sky, ridgeColor, ridgeMask * 0.74);

          float farHill = 0.096 + noise(vec2(uv.x * 3.4 + 12.0, 3.0)) * 0.027;
          float farHillMask = 1.0 - smoothstep(farHill - 0.005, farHill + 0.009, uv.y);
          vec3 hillColor = mix(vec3(0.11, 0.19, 0.13), vec3(0.010, 0.025, 0.031), night * 0.96);
          sky = mix(sky, hillColor, farHillMask * 0.93);

          float groundEdge = 0.041 + noise(vec2(uv.x * 8.0 + 1.0, 5.0)) * 0.012;
          float groundMask = 1.0 - smoothstep(groundEdge - 0.004, groundEdge + 0.006, uv.y);
          float grassGrain = noise(vec2(uv.x * 68.0, uv.y * 34.0));
          vec3 groundColor = mix(vec3(0.060, 0.13, 0.060), vec3(0.006, 0.016, 0.019), night);
          groundColor *= 0.88 + grassGrain * 0.22;
          sky = mix(sky, groundColor, groundMask * 0.98);

          // A tiny warm path visually connects the hut to the foreground.
          float pathHalfWidth = mix(0.008, 0.045, 1.0 - smoothstep(0.022, 0.125, uv.y));
          float pathCenter = 0.345 - (0.10 - uv.y) * 0.20;
          float path = (1.0 - smoothstep(pathHalfWidth - 0.004, pathHalfWidth + 0.004, abs((uv.x - pathCenter) * aspect)));
          path *= 1.0 - smoothstep(0.08, 0.13, uv.y);
          vec3 pathColor = mix(vec3(0.19, 0.15, 0.095), vec3(0.035, 0.034, 0.032), night);
          sky = mix(sky, pathColor, path * 0.52);

          // Mature trees frame the scene. Canopies sway by a few pixels in the breeze.
          float wind = sin(t * 0.86) * 0.0045;
          float leftX = 0.074 + wind / aspect;
          float rightX = 0.835 - wind * 0.78 / aspect;
          float leftCrown = max(
            max(ellipse(uv, vec2(leftX - 0.20 / aspect, 0.385), vec2(0.25, 0.088), 0.14, aspect),
                ellipse(uv, vec2(leftX + 0.005 / aspect, 0.430), vec2(0.29, 0.123), 0.14, aspect)),
            max(ellipse(uv, vec2(leftX + 0.205 / aspect, 0.385), vec2(0.24, 0.083), 0.14, aspect),
                ellipse(uv, vec2(leftX - 0.055 / aspect, 0.330), vec2(0.23, 0.070), 0.14, aspect))
          );
          float rightCrown = max(
            max(ellipse(uv, vec2(rightX - 0.18 / aspect, 0.385), vec2(0.23, 0.082), 0.14, aspect),
                ellipse(uv, vec2(rightX + 0.005 / aspect, 0.426), vec2(0.27, 0.115), 0.14, aspect)),
            max(ellipse(uv, vec2(rightX + 0.18 / aspect, 0.386), vec2(0.22, 0.080), 0.14, aspect),
                ellipse(uv, vec2(rightX - 0.04 / aspect, 0.332), vec2(0.22, 0.067), 0.14, aspect))
          );
          float treeTrunks = max(
            box(uv, vec2(leftX, 0.135), vec2(0.030, 0.112), 0.006, aspect),
            box(uv, vec2(rightX, 0.137), vec2(0.027, 0.109), 0.006, aspect)
          );
          float branches = max(
            max(lineMask(uv, vec2(leftX, 0.205), vec2(leftX - 0.22 / aspect, 0.345), 0.009, aspect),
                lineMask(uv, vec2(leftX, 0.228), vec2(leftX + 0.23 / aspect, 0.350), 0.009, aspect)),
            max(lineMask(uv, vec2(rightX, 0.208), vec2(rightX - 0.19 / aspect, 0.342), 0.008, aspect),
                lineMask(uv, vec2(rightX, 0.228), vec2(rightX + 0.19 / aspect, 0.346), 0.008, aspect))
          );
          vec3 bark = mix(vec3(0.20, 0.10, 0.046), vec3(0.012, 0.020, 0.026), night * 0.93);
          vec3 leavesBase = mix(vec3(0.018, 0.095, 0.038), vec3(0.006, 0.022, 0.026), night * 0.94);
          leavesBase = mix(leavesBase, vec3(0.20, 0.075, 0.040), twilight * 0.30);
          float leafGrain = noise(vec2(uv.x * 92.0, uv.y * 86.0));
          vec3 leafHighlight = mix(vec3(0.095, 0.22, 0.075), vec3(0.020, 0.052, 0.055), night * 0.91);
          vec3 leaves = mix(leavesBase, leafHighlight, smoothstep(0.26, 0.76, leafGrain) * 0.72);
          sky = mix(sky, bark, treeTrunks * 0.99);
          sky = mix(sky, bark * 0.82, branches * 0.80);
          sky = mix(sky, leaves, max(leftCrown, rightCrown) * 0.99);

          // The thatched hut keeps its detail; windows switch on automatically at night.
          float hutX = 0.345;
          float hutShadow = ellipse(uv, vec2(hutX, 0.058), vec2(0.18, 0.014), 0.14, aspect);
          sky = mix(sky, mix(vec3(0.045, 0.052, 0.035), vec3(0.004, 0.009, 0.012), night), hutShadow * 0.62);

          float hutBody = box(uv, vec2(hutX, 0.126), vec2(0.108, 0.073), 0.005, aspect);
          vec3 plaster = mix(vec3(0.32, 0.21, 0.125), vec3(0.021, 0.025, 0.031), night * 0.92);
          plaster = mix(plaster, vec3(0.27, 0.105, 0.060), twilight * 0.40);
          sky = mix(sky, plaster, hutBody * 0.99);

          float roofRise = clamp((uv.y - 0.190) / 0.215, 0.0, 1.0);
          float roofHalfWidth = 0.155 * (1.0 - roofRise);
          float roofAcross = abs((uv.x - hutX) * aspect);
          float hutRoof = (1.0 - smoothstep(max(roofHalfWidth - 0.007, 0.0), roofHalfWidth + 0.007, roofAcross));
          hutRoof *= step(0.190, uv.y) * (1.0 - step(0.407, uv.y));
          float strawTexture = noise(vec2(uv.x * 95.0, uv.y * 110.0));
          float strawLines = 0.5 + 0.5 * sin((uv.x * aspect - uv.y * 0.65) * 150.0 + strawTexture * 3.0);
          vec3 thatch = mix(vec3(0.32, 0.19, 0.08), vec3(0.014, 0.018, 0.024), night * 0.92);
          thatch = mix(thatch, vec3(0.31, 0.092, 0.042), twilight * 0.38);
          vec3 roofColor = thatch * (0.78 + strawLines * 0.14 + strawTexture * 0.16);
          sky = mix(sky, roofColor, hutRoof * 0.99);
          float eave = box(uv, vec2(hutX, 0.190), vec2(0.164, 0.005), 0.002, aspect);
          sky = mix(sky, thatch * 0.68, eave * 0.92);

          float hutDoor = box(uv, vec2(hutX, 0.105), vec2(0.022, 0.043), 0.003, aspect);
          sky = mix(sky, mix(vec3(0.060, 0.034, 0.018), vec3(0.004, 0.007, 0.011), night * 0.92), hutDoor * 0.98);

          vec2 windowLeft = vec2(hutX - 0.062 / aspect, 0.143);
          vec2 windowRight = vec2(hutX + 0.062 / aspect, 0.143);
          float windowFrames = max(
            box(uv, windowLeft, vec2(0.021, 0.023), 0.003, aspect),
            box(uv, windowRight, vec2(0.021, 0.023), 0.003, aspect)
          );
          float windowGlass = max(
            box(uv, windowLeft, vec2(0.015, 0.017), 0.002, aspect),
            box(uv, windowRight, vec2(0.015, 0.017), 0.002, aspect)
          );
          float windowGlow = max(
            exp(-length(vec2((uv.x - windowLeft.x) * aspect, uv.y - windowLeft.y)) * 65.0),
            exp(-length(vec2((uv.x - windowRight.x) * aspect, uv.y - windowRight.y)) * 65.0)
          );
          vec3 frameColor = mix(vec3(0.11, 0.070, 0.036), vec3(0.008, 0.014, 0.019), night);
          sky = mix(sky, frameColor, windowFrames * 0.98);
          sky += vec3(1.0, 0.35, 0.055) * windowGlow * night * 0.23;
          vec3 glassColor = mix(vec3(0.045, 0.085, 0.10), vec3(1.0, 0.53, 0.16), night);
          sky = mix(sky, glassColor, windowGlass * (0.72 + night * 0.27));

          // Chimney smoke drifts upward at night; three soft puffs are deliberately inexpensive.
          float chimneyX = hutX + 0.105 / aspect;
          float chimney = box(uv, vec2(chimneyX, 0.251), vec2(0.015, 0.043), 0.003, aspect);
          sky = mix(sky, mix(vec3(0.18, 0.10, 0.055), vec3(0.035, 0.040, 0.048), night), chimney);
          float smokeCycle = fract(t * 0.18);
          float smokeSway = sin(t * 1.1) * 0.018 / aspect;
          float smokeOne = ellipse(uv, vec2(chimneyX + smokeSway, 0.309 + smokeCycle * 0.035), vec2(0.024, 0.023), 0.25, aspect);
          float smokeTwo = ellipse(uv, vec2(chimneyX - smokeSway * 0.55, 0.374 + fract(smokeCycle + 0.34) * 0.032), vec2(0.033, 0.029), 0.25, aspect);
          float smokeThree = ellipse(uv, vec2(chimneyX + smokeSway, 0.444 + fract(smokeCycle + 0.67) * 0.027), vec2(0.044, 0.034), 0.25, aspect);
          float smokeMask = max(max(smokeOne * 0.68, smokeTwo * 0.53), smokeThree * 0.38) * night;
          sky = mix(sky, vec3(0.49, 0.56, 0.64), smokeMask * 0.42);

          // Clock tower: stone silhouette, copper roof, glowing windows and a readable moving clock face.
          float towerX = 0.565;
          vec3 stone = mix(vec3(0.36, 0.35, 0.30), vec3(0.025, 0.036, 0.047), night * 0.92);
          float towerBody = box(uv, vec2(towerX, 0.137), vec2(0.050, 0.083), 0.004, aspect);
          sky = mix(sky, stone, towerBody * 0.99);
          float towerUpper = box(uv, vec2(towerX, 0.242), vec2(0.059, 0.066), 0.004, aspect);
          sky = mix(sky, stone * 0.90, towerUpper * 0.99);
          float towerRoofRise = clamp((uv.y - 0.296) / 0.105, 0.0, 1.0);
          float towerRoofHalfWidth = 0.066 * (1.0 - towerRoofRise);
          float towerRoof = (1.0 - smoothstep(max(towerRoofHalfWidth - 0.005, 0.0), towerRoofHalfWidth + 0.005, abs((uv.x - towerX) * aspect)));
          towerRoof *= step(0.296, uv.y) * (1.0 - step(0.403, uv.y));
          vec3 roofTint = mix(vec3(0.22, 0.095, 0.055), vec3(0.026, 0.030, 0.043), night);
          sky = mix(sky, roofTint, towerRoof * 0.98);

          float towerWindow = max(
            box(uv, vec2(towerX, 0.197), vec2(0.014, 0.018), 0.003, aspect),
            box(uv, vec2(towerX, 0.087), vec2(0.013, 0.016), 0.003, aspect)
          );
          sky = mix(sky, mix(vec3(0.055, 0.11, 0.14), vec3(1.0, 0.65, 0.26), night), towerWindow);

          vec2 faceCenter = vec2(towerX, 0.265);
          float faceOuter = ellipse(uv, faceCenter, vec2(0.050, 0.050), 0.06, aspect);
          float faceInner = ellipse(uv, faceCenter, vec2(0.043, 0.043), 0.05, aspect);
          sky = mix(sky, mix(vec3(0.46, 0.34, 0.18), vec3(0.69, 0.59, 0.40), night), faceOuter);
          sky = mix(sky, vec3(0.94, 0.89, 0.76), faceInner);

          float tickTop = lineMask(uv, faceCenter + vec2(0.0, 0.030), faceCenter + vec2(0.0, 0.037), 0.0020, aspect);
          float tickBottom = lineMask(uv, faceCenter - vec2(0.0, 0.030), faceCenter - vec2(0.0, 0.037), 0.0020, aspect);
          float tickLeft = lineMask(uv, faceCenter - vec2(0.030 / aspect, 0.0), faceCenter - vec2(0.037 / aspect, 0.0), 0.0020, aspect);
          float tickRight = lineMask(uv, faceCenter + vec2(0.030 / aspect, 0.0), faceCenter + vec2(0.037 / aspect, 0.0), 0.0020, aspect);
          float ticks = max(max(tickTop, tickBottom), max(tickLeft, tickRight));
          ticks = max(ticks, lineMask(uv, faceCenter + vec2(0.022 / aspect, 0.022), faceCenter + vec2(0.027 / aspect, 0.027), 0.0017, aspect));
          ticks = max(ticks, lineMask(uv, faceCenter - vec2(0.022 / aspect, 0.022), faceCenter - vec2(0.027 / aspect, 0.027), 0.0017, aspect));
          ticks = max(ticks, lineMask(uv, faceCenter + vec2(0.022 / aspect, -0.022), faceCenter + vec2(0.027 / aspect, -0.027), 0.0017, aspect));
          ticks = max(ticks, lineMask(uv, faceCenter + vec2(-0.022 / aspect, 0.022), faceCenter + vec2(-0.027 / aspect, 0.027), 0.0017, aspect));

          float minuteAngle = fract(clock) * 6.2831853;
          float hourAngle = mod(clock, 12.0) / 12.0 * 6.2831853;
          vec2 minuteEnd = faceCenter + vec2(sin(minuteAngle) * 0.028 / aspect, cos(minuteAngle) * 0.028);
          vec2 hourEnd = faceCenter + vec2(sin(hourAngle) * 0.021 / aspect, cos(hourAngle) * 0.021);
          float minuteHand = lineMask(uv, faceCenter, minuteEnd, 0.0022, aspect);
          float hourHand = lineMask(uv, faceCenter, hourEnd, 0.0031, aspect);
          sky = mix(sky, vec3(0.15, 0.18, 0.19), ticks * 0.96);
          sky = mix(sky, vec3(0.14, 0.16, 0.17), minuteHand * 0.98);
          sky = mix(sky, vec3(0.10, 0.12, 0.13), hourHand * 0.98);
          float handPivot = ellipse(uv, faceCenter, vec2(0.004, 0.004), 0.1, aspect);
          sky = mix(sky, vec3(0.72, 0.22, 0.10), handPivot);

          // A subtle vignette adds a finished editorial look without textures or assets.
          vec2 center = uv - 0.5;
          float vignette = 1.0 - smoothstep(0.34, 0.88, length(vec2(center.x * 0.9, center.y)));
          sky *= 0.94 + vignette * 0.06;
          gl_FragColor = vec4(clamp(sky, 0.0, 1.0), 1.0);
        }

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
        // This decorative panorama needs far fewer pixels than a full-screen canvas.
        const renderScale = Math.min(window.devicePixelRatio || 1, 1.25);
        const widthPx = Math.max(1, Math.floor(window.innerWidth * renderScale));
        const heightPx = Math.max(1, Math.floor(140 * renderScale));
        canvas.width = widthPx;
        canvas.height = heightPx;
        canvas.style.width = "100%";
        canvas.style.height = "140px";
        gl.viewport(0, 0, widthPx, heightPx);
      };

      resize();
      window.addEventListener("resize", resize);

      let frame = 0;
      let lastDrawTime = 0;
      const render = (time: number) => {
        // Draw at most 30 frames a second; clouds and smoke move slowly by design.
        if (time - lastDrawTime >= 1000 / 30 || lastDrawTime === 0) {
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(timeUniform, time);
        gl.uniform1f(hourUniform, hourRef.current);
        gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        lastDrawTime = time;
        }
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

    smokeRise.value = withRepeat(withTiming(1, { duration: 6000 }), -1, false);
    smokeSway.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 3700 }),
        withTiming(-8, { duration: 4300 })
      ),
      -1,
      true
    );

    treeSway.value = withRepeat(
      withSequence(
        withTiming(-1.1, { duration: 2900 }),
        withTiming(1.0, { duration: 3300 })
      ),
      -1,
      true
    );
    treeFarSway.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 3700 }),
        withTiming(-0.9, { duration: 4100 })
      ),
      -1,
      true
    );
  }, []);

  const isNight = hour >= 19 || hour < 6;
  const isSunset = hour >= 17 && hour < 19;

  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={s.nightSky}>
        {React.createElement("canvas" as any, { ref: canvasRef, style: { width: "100%", height: "140px", display: "block" } })}
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

  const smokeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: smokeSway.value },
      { translateY: -smokeRise.value * 22 },
      { scale: 0.82 + smokeRise.value * 0.32 },
    ],
    opacity: 0.56 - smokeRise.value * 0.22,
  }));

  const treeSwayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${treeSway.value}deg` }],
  }));
  const treeFarSwayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${treeFarSway.value}deg` }],
  }));

  const sunProgress = Math.max(0, Math.min(1, (hour - 5.1) / 14.2));
  const sunLeft = 8 + sunProgress * 84;
  const moonProgress = Math.max(0, Math.min(1, ((hour - 19 + 24) % 24) / 10));
  const moonLeft = 89 - moonProgress * 78;
  const moonTop = 18 + Math.sin(moonProgress * Math.PI) * 30;
  const isDawn = hour >= 4.4 && hour < 7.4;
  const houseBodyColor = isNight ? "#0B1727" : isSunset ? "#26313F" : "#284653";
  const houseRoofColor = isNight ? "#070F1D" : isSunset ? "#342737" : "#203743";
  const houseWindowColor = isNight ? "#FFD079" : isSunset ? "#5A4740" : "#28434D";
  const clockMinuteAngle = (hour % 1) * 360;
  const clockHourAngle = ((hour % 12) / 12) * 360;
  const clockTowerStoneColor = isNight ? "#27313D" : isSunset ? "#62504A" : "#83877D";
  const clockTowerRoofColor = isNight ? "#171C29" : isSunset ? "#332A31" : "#4B4E4A";
  const clockTowerWindowColor = isNight ? "#FFD28B" : isSunset ? "#6F5147" : "#365766";

  return (
    <View pointerEvents="none" style={s.nightSky}>
      <LinearGradient
        colors={
          isNight
            ? ["#020713", "#07162D", "#152B4A", "#283B50"]
            : isSunset
              ? ["#171436", "#4D2450", "#B34F44", "#FFB06C"]
              : isDawn
                ? ["#1C2A4D", "#596786", "#D88C78", "#FFE0B3"]
                : ["#13558D", "#398CC2", "#8FC9E6", "#E4F0F4"]
        }
        locations={[0, 0.30, 0.68, 1]}
        style={s.nightGradient}
      />

      {!isNight ? (
        <Animated.View
          style={[
            s.sunGlow,
            {
              left: `${sunLeft}%`,
              right: undefined,
              top: isSunset || isDawn ? 106 : 14,
              transform: [{ translateX: -52 }],
            },
          ]}
        >
          <View style={s.sunHaloOuter} />
          <View style={s.sunHalo} />
          <View style={s.sunCore}>
            <View style={s.sunCoreInner} />
          </View>
        </Animated.View>
      ) : (
        <View
          style={[
            s.moon,
            {
              left: `${moonLeft}%`,
              right: undefined,
              top: moonTop,
              transform: [{ translateX: -47 }],
            },
          ]}
        >
          <View style={s.moonHalo} />
          <View style={s.moonBody}>
            <View style={s.moonCraterOne} />
            <View style={s.moonCraterTwo} />
            <View style={s.moonCraterThree} />
            <View style={s.moonCraterFour} />
          </View>
        </View>
      )}

      <View style={s.starLayer}>
        {SKY_STARS.map((star, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              backgroundColor: "#FFFFFF",
              opacity: isNight ? (index % 4 === 0 ? 0.95 : 0.62) : isDawn || isSunset ? 0.12 : 0,
            }}
          />
        ))}
      </View>

      <View style={s.horizonGlow} />

      <Animated.View style={[s.cloud, s.cloudOne, cloudOneStyle]}>
        <View style={[s.cloudBase, { backgroundColor: isNight ? "rgba(74,94,126,0.28)" : isSunset ? "rgba(182,107,103,0.22)" : "rgba(100,116,139,0.14)" }]} />
        <View style={[s.cloudPuff, { width: 58, height: 32, left: 14, top: 10, backgroundColor: isNight ? "rgba(160,180,209,0.20)" : isSunset ? "rgba(255,210,190,0.82)" : "rgba(255,255,255,0.84)" }]} />
        <View style={[s.cloudPuff, { width: 82, height: 44, left: 42, top: -1, backgroundColor: isNight ? "rgba(180,197,222,0.23)" : isSunset ? "rgba(255,225,207,0.88)" : "rgba(255,255,255,0.92)" }]} />
        <View style={[s.cloudPuff, { width: 54, height: 30, left: 102, top: 12, backgroundColor: isNight ? "rgba(116,139,174,0.20)" : isSunset ? "rgba(244,172,160,0.76)" : "rgba(255,255,255,0.78)" }]} />
        <View style={s.cloudHighlightOne} />
      </Animated.View>

      <Animated.View style={[s.cloud, s.cloudTwo, cloudTwoStyle]}>
        <View style={[s.cloudBase, { backgroundColor: isNight ? "rgba(74,94,126,0.26)" : isSunset ? "rgba(182,107,103,0.20)" : "rgba(100,116,139,0.12)" }]} />
        <View style={[s.cloudPuff, { width: 46, height: 26, left: 14, top: 11, backgroundColor: isNight ? "rgba(160,180,209,0.17)" : isSunset ? "rgba(255,210,190,0.70)" : "rgba(255,255,255,0.76)" }]} />
        <View style={[s.cloudPuff, { width: 72, height: 38, left: 40, top: 0, backgroundColor: isNight ? "rgba(180,197,222,0.21)" : isSunset ? "rgba(255,225,207,0.78)" : "rgba(255,255,255,0.84)" }]} />
        <View style={[s.cloudPuff, { width: 54, height: 29, left: 86, top: 10, backgroundColor: isNight ? "rgba(116,139,174,0.16)" : isSunset ? "rgba(244,172,160,0.63)" : "rgba(255,255,255,0.68)" }]} />
        <View style={s.cloudHighlightTwo} />
      </Animated.View>

      <View style={s.horizonSilhouette} />

      <Animated.View style={[s.heroTree, s.heroTreeLeft, treeSwayStyle]}>
        <View
          style={[
            s.heroTreeTrunk,
            { backgroundColor: isNight ? "#14231D" : "#493321" },
          ]}
        />
        <View style={[s.heroTreeBranch, s.heroTreeBranchLeft, { backgroundColor: isNight ? "#18251F" : "#493321" }]} />
        <View style={[s.heroTreeBranch, s.heroTreeBranchRight, { backgroundColor: isNight ? "#17231F" : "#493321" }]} />
        <View style={[s.heroTreeBranch, s.heroTreeBranchUpper, { backgroundColor: isNight ? "#17231F" : "#493321" }]} />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyLeft,
            { backgroundColor: isNight ? "#142C25" : isSunset ? "#2A4931" : "#2B6137" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyTop,
            { backgroundColor: isNight ? "#19372C" : isSunset ? "#36553A" : "#397642" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyRight,
            { backgroundColor: isNight ? "#102820" : isSunset ? "#25432D" : "#245632" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyLower,
            { backgroundColor: isNight ? "#112820" : isSunset ? "#29472F" : "#326B3A" },
          ]}
        />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintOne, { backgroundColor: isNight ? "rgba(77,111,93,0.26)" : "rgba(150,190,91,0.36)" }]} />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintTwo, { backgroundColor: isNight ? "rgba(77,111,93,0.22)" : "rgba(165,198,102,0.34)" }]} />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintThree, { backgroundColor: isNight ? "rgba(77,111,93,0.20)" : "rgba(132,176,78,0.32)" }]} />
      </Animated.View>

      <Animated.View style={[s.heroTree, s.heroTreeRight, treeFarSwayStyle]}>
        <View
          style={[
            s.heroTreeTrunk,
            { backgroundColor: isNight ? "#14231D" : "#493321" },
          ]}
        />
        <View style={[s.heroTreeBranch, s.heroTreeBranchLeft, { backgroundColor: isNight ? "#18251F" : "#493321" }]} />
        <View style={[s.heroTreeBranch, s.heroTreeBranchRight, { backgroundColor: isNight ? "#17231F" : "#493321" }]} />
        <View style={[s.heroTreeBranch, s.heroTreeBranchUpper, { backgroundColor: isNight ? "#17231F" : "#493321" }]} />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyLeft,
            { backgroundColor: isNight ? "#142C25" : isSunset ? "#2A4931" : "#2B6137" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyTop,
            { backgroundColor: isNight ? "#19372C" : isSunset ? "#36553A" : "#397642" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyRight,
            { backgroundColor: isNight ? "#102820" : isSunset ? "#25432D" : "#245632" },
          ]}
        />
        <View
          style={[
            s.heroTreeCanopy,
            s.heroTreeCanopyLower,
            { backgroundColor: isNight ? "#112820" : isSunset ? "#29472F" : "#326B3A" },
          ]}
        />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintOne, { backgroundColor: isNight ? "rgba(77,111,93,0.26)" : "rgba(150,190,91,0.36)" }]} />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintTwo, { backgroundColor: isNight ? "rgba(77,111,93,0.22)" : "rgba(165,198,102,0.34)" }]} />
        <View style={[s.heroTreeLeafGlint, s.heroTreeLeafGlintThree, { backgroundColor: isNight ? "rgba(77,111,93,0.20)" : "rgba(132,176,78,0.32)" }]} />
      </Animated.View>

      <View style={[s.house, s.houseLeft]}>
        <View style={[s.houseRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, { backgroundColor: houseBodyColor }]} />
        <View style={[s.houseWindow, { left: 9, backgroundColor: houseWindowColor }]} />
      </View>
      <View style={[s.house, s.houseCenter]}>
        <View style={[s.houseRoof, s.houseCenterRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, s.houseCenterBody, { backgroundColor: isNight ? "#18241F" : isSunset ? "#7A4330" : "#A66D43" }]} />
        <View style={[s.houseWindow, s.houseCenterWindow, { left: 16, backgroundColor: houseWindowColor, shadowColor: isNight ? "#FFB44D" : "transparent", shadowOpacity: isNight ? 0.95 : 0, shadowRadius: isNight ? 8 : 0, elevation: isNight ? 4 : 0 }]} />
        <View style={[s.houseWindow, s.houseCenterWindow, { right: 16, backgroundColor: houseWindowColor, shadowColor: isNight ? "#FFB44D" : "transparent", shadowOpacity: isNight ? 0.95 : 0, shadowRadius: isNight ? 8 : 0, elevation: isNight ? 4 : 0 }]} />
        <View style={[s.houseCenterDoor, { backgroundColor: isNight ? "#100E12" : "#49301E" }]} />
      </View>
      <View style={[s.house, s.houseRight]}>
        <View style={[s.houseRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, { backgroundColor: houseBodyColor }]} />
        <View style={[s.houseWindow, { left: 9, backgroundColor: houseWindowColor }]} />
        <View style={[s.houseWindow, { right: 9, backgroundColor: houseWindowColor }]} />
      </View>
      <View style={[s.house, s.houseFarRight]}>
        <View style={[s.houseRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, { backgroundColor: houseBodyColor }]} />
      </View>

      <View style={s.clockTower}>
        <View style={[s.clockTowerBody, { backgroundColor: clockTowerStoneColor, borderColor: isNight ? "#3B4652" : "#A9A99A" }]} />
        <View style={[s.clockTowerFrontEdge, { backgroundColor: isNight ? "rgba(125,143,154,0.12)" : "rgba(255,245,220,0.22)" }]} />
        <View style={[s.clockTowerSideEdge, { backgroundColor: isNight ? "#141D29" : "#646A65" }]} />
        <View style={[s.clockTowerUpper, { backgroundColor: clockTowerStoneColor, borderColor: isNight ? "#3B4652" : "#A9A99A" }]} />
        <View style={[s.clockTowerRoof, { borderBottomColor: clockTowerRoofColor }]} />
        <View style={[s.clockTowerWindow, s.clockTowerWindowUpper, { backgroundColor: clockTowerWindowColor, borderColor: isNight ? "#B5A88C" : "#C1B59A" }]} />
        <View style={[s.clockTowerWindow, s.clockTowerWindowLower, { backgroundColor: clockTowerWindowColor, borderColor: isNight ? "#B5A88C" : "#C1B59A" }]} />
        <View style={[s.clockFaceOuter, { borderColor: isNight ? "#B9B9B4" : "#B99B68" }]}>
          <View style={s.clockFaceInner}>
            {Array.from({ length: 12 }, (_, index) => (
              <View key={index} style={[s.clockTickWrapper, { transform: [{ rotate: `${index * 30}deg` }] }]}>
                <View style={s.clockTick} />
              </View>
            ))}
            <View style={[s.clockHandPivot, { transform: [{ rotate: `${clockMinuteAngle}deg` }] }]}>
              <View style={s.clockMinuteHand} />
            </View>
            <View style={[s.clockHandPivot, { transform: [{ rotate: `${clockHourAngle}deg` }] }]}>
              <View style={s.clockHourHand} />
            </View>
            <View style={s.clockHandCenter} />
          </View>
        </View>
      </View>

      {isNight && (
        <Animated.View
          style={[s.smokeColumn, smokeAnimatedStyle, { opacity: 0.66 }]}
        >
          <View style={[s.smokePuff, { width: 27, height: 25, left: 39, top: 91, opacity: 0.68 }]} />
          <View style={[s.smokePuff, { width: 37, height: 32, left: 30, top: 68, opacity: 0.56 }]} />
          <View style={[s.smokePuff, { width: 47, height: 42, left: 23, top: 43, opacity: 0.43 }]} />
          <View style={[s.smokePuff, { width: 56, height: 49, left: 19, top: 19, opacity: 0.28 }]} />
        </Animated.View>
      )}
      <View style={s.smokeStack} />
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

  const heroExpandedHeight = Platform.OS === "web" ? 100 : 106;
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
      return;
    }

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
          router.push({ pathname: "/search", params: { q: transcript } } as any);
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
  }, [router, voiceListening]);

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
      <View style={s.skyClearSpace} />
      </RNAnimated.View>

      {/* The search bar stays usable while the hero shell slides away after the banner scrolls off. */}
      <SafeAreaView
        edges={heroCollapsed ? ["top"] : []}
        style={[s.searchBarSafeArea, heroCollapsed && s.searchBarSafeAreaCollapsed]}
      >
        <View style={[s.searchBarOuter, heroCollapsed && s.searchBarOuterCollapsed]}>
        {/* Search Bar */}
        <Pressable
          testID="home-search-trigger"
          onPress={() => router.push("/search" as any)}
          style={[s.searchWrap, !heroCollapsed && { transform: [{ translateY: -12 }] }]}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={THEME.skyHeader} />
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
            onPress={startVoiceSearch}
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
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs, gap: 12 }}
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
                onPress={() => router.push({ pathname: "/(tabs)/categories", params: { categoryId: String(c.id) } } as any)}
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
      </ScrollView>

      {/* Floating Checkout Bar */}
      <CheckoutBar />
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
  /* Lightweight cinematic day/night countryside stays behind existing header/search; no video or 3D engine. */
  heroHeaderShell: { position: "relative", width: "100%", overflow: "hidden" },
  nightSky: { position: "absolute", top: 0, left: 0, right: 0, height: 140, overflow: "hidden", zIndex: 0, pointerEvents: "none" },
  nightGradientLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  nightGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  horizonGlow: { position: "absolute", left: "12%", right: "12%", bottom: 4, height: 68, borderTopLeftRadius: 170, borderTopRightRadius: 170, backgroundColor: "rgba(255,190,130,0.10)" },
  horizonSilhouette: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, backgroundColor: "rgba(13,28,38,0.58)" },
  house: { position: "absolute", bottom: 1, height: 22, zIndex: 3 },
  houseLeft: { left: "8%", width: 34, height: 20 },
  houseCenter: { left: "28%", width: 76, height: 46 },
  houseRight: { right: "28%", width: 40, height: 19 },
  houseFarRight: { right: "5%", width: 30, height: 17 },
  houseRoof: { position: "absolute", left: 0, bottom: 10, width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent" },
  houseBody: { position: "absolute", left: 4, right: 4, bottom: 0, height: 12, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  houseWindow: { position: "absolute", bottom: 3, width: 4, height: 5, borderRadius: 1 },
  houseCenterRoof: { bottom: 21, borderLeftWidth: 38, borderRightWidth: 38, borderBottomWidth: 24 } as any,
  houseCenterBody: { left: 8, right: 8, height: 26, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  houseCenterWindow: { bottom: 9, width: 6, height: 8, borderRadius: 1 },
  houseCenterDoor: { position: "absolute", bottom: 0, left: 33, width: 10, height: 18, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  smokeColumn: { position: "absolute", left: "21%", bottom: 36, width: 94, height: 110 },
  smokePuff: { position: "absolute", borderRadius: 50, backgroundColor: "rgba(206,218,226,0.35)", shadowColor: "#CBD5E1", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 1 },
  smokeStack: { position: "absolute", bottom: 39, left: "37.5%", width: 9, height: 14, backgroundColor: "#49372D", borderTopWidth: 2, borderTopColor: "#A18A72" },
  clockTower: { position: "absolute", bottom: 0, left: "51%", width: 38, height: 92, zIndex: 4, alignItems: "center" } as any,
  clockTowerBody: { position: "absolute", bottom: 0, left: 5, width: 28, height: 53, borderWidth: 1, borderBottomWidth: 0 },
  clockTowerFrontEdge: { position: "absolute", bottom: 0, left: 6, width: 4, height: 52 },
  clockTowerSideEdge: { position: "absolute", bottom: 0, right: 5, width: 5, height: 52 },
  clockTowerUpper: { position: "absolute", bottom: 47, left: 2, width: 34, height: 29, borderWidth: 1, borderBottomWidth: 0 },
  clockTowerRoof: { position: "absolute", bottom: 71, width: 0, height: 0, borderLeftWidth: 19, borderRightWidth: 19, borderBottomWidth: 20, borderLeftColor: "transparent", borderRightColor: "transparent" },
  clockTowerWindow: { position: "absolute", width: 7, height: 10, borderWidth: 1, borderRadius: 3 },
  clockTowerWindowUpper: { bottom: 32 },
  clockTowerWindowLower: { bottom: 14 },
  clockFaceOuter: { position: "absolute", bottom: 53, width: 25, height: 25, borderRadius: 13, borderWidth: 2, backgroundColor: "#B89D6D", alignItems: "center", justifyContent: "center", zIndex: 6 },
  clockFaceInner: { position: "absolute", width: 19, height: 19, borderRadius: 10, backgroundColor: "#F0E8D3", overflow: "hidden" },
  clockTickWrapper: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center" },
  clockTick: { position: "absolute", top: 1, width: 1.4, height: 2.5, backgroundColor: "#26313B", borderRadius: 1 },
  clockHandPivot: { position: "absolute", left: "50%", top: "50%", width: 0, height: 0 },
  clockMinuteHand: { position: "absolute", bottom: 0, left: -0.65, width: 1.3, height: 7.5, backgroundColor: "#27313B", borderRadius: 2 },
  clockHourHand: { position: "absolute", bottom: 0, left: -0.9, width: 1.8, height: 5.3, backgroundColor: "#27313B", borderRadius: 2 },
  clockHandCenter: { position: "absolute", left: 8, top: 8, width: 3, height: 3, borderRadius: 2, backgroundColor: "#A34A2E" },
  heroTree: { position: "absolute", bottom: 0, width: 62, height: 82, zIndex: 2, transformOrigin: "bottom" } as any,
  heroTreeLeft: { left: "1%" },
  heroTreeRight: { right: "2%", width: 58, height: 72 },
  heroTreeTrunk: { position: "absolute", bottom: 0, left: "44%", width: 8, height: 34, borderTopLeftRadius: 2, borderTopRightRadius: 2, zIndex: 2 },
  heroTreeBranch: { position: "absolute", height: 3, borderRadius: 4, opacity: 0.72, zIndex: 4 },
  heroTreeBranchLeft: { bottom: 28, left: 13, width: 25, transform: [{ rotate: "-34deg" }] },
  heroTreeBranchRight: { bottom: 31, left: 25, width: 27, transform: [{ rotate: "32deg" }] },
  heroTreeBranchUpper: { bottom: 39, left: 19, width: 21, height: 2.5, transform: [{ rotate: "-18deg" }] },
  heroTreeCanopy: { position: "absolute", borderRadius: 50, zIndex: 3 },
  heroTreeLeafGlint: { position: "absolute", height: 8, borderRadius: 8, zIndex: 5 },
  heroTreeLeafGlintOne: { left: 13, top: 18, width: 16, transform: [{ rotate: "-24deg" }] },
  heroTreeLeafGlintTwo: { left: 31, top: 32, width: 13, transform: [{ rotate: "21deg" }] },
  heroTreeLeafGlintThree: { left: 9, top: 43, width: 12, height: 6, transform: [{ rotate: "14deg" }] },
  heroTreeCanopyLeft: { left: 2, top: 25, width: 39, height: 36 },
  heroTreeCanopyTop: { left: 16, top: 2, width: 37, height: 39 },
  heroTreeCanopyRight: { right: 0, top: 25, width: 36, height: 33 },
  heroTreeCanopyLower: { left: 9, top: 39, width: 45, height: 31 },
  starLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 92 },
  star: { position: "absolute", backgroundColor: "#FFFFFF", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 5, elevation: 3 },
  sunGlow: { position: "absolute", top: 10, right: "12%", width: 104, height: 104, alignItems: "center", justifyContent: "center" },
  sunHaloOuter: { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(255,183,95,0.12)" },
  sunHalo: { position: "absolute", width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,222,155,0.19)" },
  sunCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#F4C16B", shadowColor: "#FFCB80", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 22, elevation: 6, alignItems: "center", justifyContent: "center" },
  sunCoreInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFF4C4", opacity: 0.92 },
  sunsetGlow: { position: "absolute", left: "28%", right: "28%", bottom: 0, height: 78, alignItems: "center", justifyContent: "flex-end" },
  sunsetHalo: { width: "100%", height: 78, borderTopLeftRadius: 140, borderTopRightRadius: 140, backgroundColor: "rgba(255,190,120,0.16)" },
  moon: { position: "absolute", top: 12, right: "15%", width: 94, height: 94, alignItems: "center", justifyContent: "center" },
  moonHalo: { position: "absolute", width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(204,220,246,0.13)" },
  moonBody: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#DCE4EF", shadowColor: "#DDE7F6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.82, shadowRadius: 20, elevation: 5, overflow: "hidden" },
  moonCraterOne: { position: "absolute", top: 13, left: 12, width: 13, height: 10, borderRadius: 7, backgroundColor: "rgba(105,121,145,0.22)" },
  moonCraterTwo: { position: "absolute", top: 28, left: 30, width: 8, height: 7, borderRadius: 5, backgroundColor: "rgba(105,121,145,0.24)" },
  moonCraterThree: { position: "absolute", top: 12, right: 11, width: 6, height: 6, borderRadius: 4, backgroundColor: "rgba(105,121,145,0.20)" },
  moonCraterFour: { position: "absolute", bottom: 11, left: 23, width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(105,121,145,0.18)" },
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
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 100, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "transparent", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 7 },
  skyClearSpace: { height: Platform.OS === "web" ? 90 : 56 },
  skyClearSpaceCollapsed: { height: 0 },
  searchBarSafeArea: { backgroundColor: THEME.whiteBg, zIndex: 20, elevation: 8 },
  searchBarSafeAreaCollapsed: { borderBottomWidth: 1, borderBottomColor: "rgba(226,232,240,0.9)" },
  searchBarOuter: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm },
  searchBarOuterCollapsed: { marginTop: 0, paddingBottom: 8 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  locationErrorText: { color: "#FEF3C7", fontSize: 9, fontWeight: "700", marginTop: 2, maxWidth: 260 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: THEME.white, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14, height: 44, borderWidth: 1, borderColor: "rgba(255,255,255,0.88)", shadowColor: "#000000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 6 },
  searchPlaceholderText: { fontSize: 14, color: THEME.blackMuted, fontWeight: "600" },
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
  storeCardSmall: { width: 145, height: 112, backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 16, overflow: "hidden", position: "relative", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 5, borderWidth: 1, borderColor: "rgba(255,107,0,0.15)" },
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
});