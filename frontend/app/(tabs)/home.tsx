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
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += noise(p) * a;
            p = p * 2.02 + vec2(17.1, 9.2);
            a *= 0.5;
          }
          return v;
        }

        float boxMask(vec2 p, vec2 center, vec2 halfSize, float softness) {
          float d = max(abs(p.x - center.x) - halfSize.x, abs(p.y - center.y) - halfSize.y);
          return 1.0 - smoothstep(0.0, softness, d);
        }

        float roofMask(vec2 p, float centerX, float baseY, float peakY, float halfWidth) {
          float rise = clamp((p.y - baseY) / max(peakY - baseY, 0.001), 0.0, 1.0);
          float allowedHalfWidth = halfWidth * (1.0 - rise);
          float roofX = 1.0 - smoothstep(max(allowedHalfWidth - 0.002, 0.0), allowedHalfWidth + 0.002, abs(p.x - centerX));
          float roofY = step(baseY, p.y) * (1.0 - step(peakY + 0.001, p.y));
          return roofX * roofY;
        }

        void main() {
          vec2 uv = v_uv;
          float aspect = u_resolution.x / max(u_resolution.y, 1.0);
          float clock = mod(u_hour + 24.0, 24.0);
          float t = u_time * 0.00016;

          // Smooth, local-time lighting transitions: sunrise, clear daytime, sunset and deep night.
          float day = smoothstep(5.1, 7.8, clock) * (1.0 - smoothstep(16.7, 19.6, clock));
          float dawn = smoothstep(4.2, 5.8, clock) * (1.0 - smoothstep(7.1, 8.5, clock));
          float dusk = smoothstep(16.0, 18.25, clock) * (1.0 - smoothstep(19.3, 21.0, clock));
          float night = clamp(1.0 - max(day, max(dawn * 0.84, dusk)), 0.0, 1.0);
          float twilight = clamp(max(dawn, dusk), 0.0, 1.0);
          float vertical = smoothstep(0.015, 0.99, uv.y);
          float horizonGlow = exp(-pow((uv.y - 0.12) * 5.0, 2.0));

          vec3 dayTop = vec3(0.035, 0.23, 0.49);
          vec3 dayMid = vec3(0.13, 0.48, 0.76);
          vec3 dayHorizon = vec3(0.76, 0.88, 0.95);
          vec3 dawnTop = vec3(0.11, 0.12, 0.30);
          vec3 dawnMid = vec3(0.37, 0.31, 0.53);
          vec3 dawnHorizon = vec3(1.00, 0.53, 0.32);
          vec3 duskTop = vec3(0.055, 0.045, 0.21);
          vec3 duskMid = vec3(0.37, 0.12, 0.32);
          vec3 duskHorizon = vec3(1.00, 0.34, 0.13);
          vec3 nightTop = vec3(0.003, 0.009, 0.035);
          vec3 nightMid = vec3(0.015, 0.045, 0.115);
          vec3 nightHorizon = vec3(0.055, 0.105, 0.17);

          vec3 daySky = mix(dayHorizon, dayTop, vertical);
          daySky = mix(daySky, dayMid, 0.33 + horizonGlow * 0.12);
          vec3 dawnSky = mix(dawnHorizon, dawnTop, vertical);
          dawnSky = mix(dawnSky, dawnMid, 0.40 + horizonGlow * 0.14);
          vec3 duskSky = mix(duskHorizon, duskTop, vertical);
          duskSky = mix(duskSky, duskMid, 0.42 + horizonGlow * 0.16);
          vec3 nightSky = mix(nightHorizon, nightTop, vertical);
          nightSky = mix(nightSky, nightMid, 0.36 + horizonGlow * 0.12);

          vec3 sky = mix(nightSky, daySky, day);
          sky = mix(sky, dawnSky, dawn * 0.96);
          sky = mix(sky, duskSky, dusk);
          sky += vec3(0.22, 0.31, 0.43) * horizonGlow * night * 0.15;

          // A slow sun arc, atmospheric scattering and a soft warm rim at the horizon.
          float sunPhase = clamp((clock - 5.1) / 14.2, 0.0, 1.0);
          float sunX = mix(0.08, 0.92, sunPhase);
          float sunY = 0.115 + 0.62 * sin(sunPhase * 3.1415926);
          vec2 sunDelta = vec2((uv.x - sunX) * aspect, uv.y - sunY);
          float sunDist = length(sunDelta);
          float sunVisible = clamp(day + max(dawn, dusk) * 0.93, 0.0, 1.0);
          float sunHalo = exp(-sunDist * 7.5);
          float sunBloom = exp(-sunDist * 24.0);
          float sunDisk = 1.0 - smoothstep(0.029, 0.039, sunDist);
          sky += vec3(1.0, 0.53, 0.25) * sunHalo * sunVisible * (0.13 + twilight * 0.28);
          sky += vec3(1.0, 0.42, 0.18) * sunBloom * dusk * 0.20;
          sky += vec3(1.0, 0.88, 0.65) * sunDisk * sunVisible * 0.72;

          // Stars emerge gradually at twilight and softly twinkle at night.
          float starNight = max(1.0 - smoothstep(5.0, 6.7, clock), smoothstep(18.2, 20.1, clock));
          vec2 starGrid = floor(vec2(uv.x * 230.0, uv.y * 132.0));
          float starSeed = hash(starGrid);
          float stars = step(0.9915, starSeed) * smoothstep(0.19, 0.55, uv.y);
          float twinkle = 0.76 + 0.24 * sin(u_time * 0.001 + starSeed * 41.0);
          sky += vec3(0.63, 0.78, 1.0) * stars * twinkle * starNight * 0.83;

          vec2 brightGrid = floor(vec2(uv.x * 88.0 + 7.0, uv.y * 51.0 + 3.0));
          float brightSeed = hash(brightGrid);
          float brightStar = step(0.987, brightSeed) * smoothstep(0.26, 0.72, uv.y);
          sky += vec3(0.86, 0.92, 1.0) * brightStar * starNight * 0.48;

          // Moonlight, subtle crater detail and a soft halo.
          float moonProgress = clamp(mod(clock - 19.0 + 24.0, 24.0) / 10.0, 0.0, 1.0);
          vec2 moonPos = vec2(mix(0.89, 0.11, moonProgress), 0.23 + 0.49 * sin(moonProgress * 3.1415926));
          vec2 moonDelta = vec2((uv.x - moonPos.x) * aspect, uv.y - moonPos.y);
          float moonDist = length(moonDelta);
          float moonVisible = max(1.0 - smoothstep(4.8, 6.5, clock), smoothstep(18.0, 20.0, clock));
          float moonMask = 1.0 - smoothstep(0.050, 0.059, moonDist);
          float moonHalo = exp(-moonDist * 8.0);
          float craterA = exp(-length(moonDelta - vec2(-0.010, 0.008)) * 52.0);
          float craterB = exp(-length(moonDelta - vec2(0.012, -0.012)) * 62.0);
          float craterC = exp(-length(moonDelta - vec2(0.004, 0.016)) * 74.0);
          float moonSurface = 0.95 - craterA * 0.12 - craterB * 0.08 - craterC * 0.045;
          sky += vec3(0.43, 0.58, 0.90) * moonHalo * moonVisible * 0.22;
          sky += vec3(0.89, 0.93, 1.0) * moonMask * moonSurface * moonVisible * (0.80 - night * 0.04);

          // Large, layered cloud banks with drifting turbulence and silver lining.
          float warp = fbm(vec2(uv.x * 1.75 + t * 0.42, uv.y * 3.0 + 4.8));
          float lowA = fbm(vec2(uv.x * 3.0 + t * 0.72, uv.y * 8.0 + warp * 1.15));
          float lowB = fbm(vec2(uv.x * 7.2 - t * 0.46, uv.y * 13.5 + warp * 0.85 + 8.0));
          float cloudField = lowA * 0.65 + lowB * 0.35;
          float lowCloud = smoothstep(0.46, 0.70, cloudField + (0.40 - uv.y) * 0.12);
          lowCloud *= smoothstep(0.08, 0.21, uv.y) * (1.0 - smoothstep(0.42, 0.64, uv.y));

          float highField = fbm(vec2(uv.x * 2.6 - t * 0.25, uv.y * 5.6 + 15.0));
          float highCloud = smoothstep(0.59, 0.76, highField);
          highCloud *= smoothstep(0.38, 0.57, uv.y) * (1.0 - smoothstep(0.82, 0.97, uv.y)) * 0.34;

          vec3 dayCloudShadow = vec3(0.30, 0.43, 0.55);
          vec3 dayCloudLight = vec3(0.97, 0.985, 1.0);
          vec3 duskCloudShadow = vec3(0.22, 0.16, 0.32);
          vec3 duskCloudLight = vec3(1.0, 0.60, 0.40);
          vec3 nightCloudShadow = vec3(0.035, 0.07, 0.13);
          vec3 nightCloudLight = vec3(0.22, 0.30, 0.43);
          float cloudLight = smoothstep(0.40, 0.75, cloudField + uv.y * 0.32);
          vec3 dayCloud = mix(dayCloudShadow, dayCloudLight, cloudLight);
          vec3 duskCloud = mix(duskCloudShadow, duskCloudLight, cloudLight);
          vec3 nightCloud = mix(nightCloudShadow, nightCloudLight, cloudLight);
          vec3 cloudColor = mix(nightCloud, dayCloud, day);
          cloudColor = mix(cloudColor, duskCloud, max(dawn, dusk * 0.96));
          sky = mix(sky, cloudColor, lowCloud * (0.36 + day * 0.32 + twilight * 0.30 + night * 0.18));

          vec3 wisps = mix(vec3(0.18, 0.30, 0.44), vec3(0.91, 0.94, 0.98), day);
          wisps = mix(wisps, vec3(0.66, 0.36, 0.44), twilight * 0.78);
          sky = mix(sky, wisps, highCloud * (0.22 + day * 0.15));

          // Atmospheric mist gives the horizon depth without covering the search bar.
          float mistBand = exp(-pow((uv.y - 0.10) * 15.0, 2.0));
          vec3 mistColor = mix(vec3(0.43, 0.54, 0.68), vec3(0.95, 0.67, 0.50), twilight * 0.75);
          mistColor = mix(mistColor, vec3(0.10, 0.16, 0.25), night * 0.60);
          sky = mix(sky, mistColor, mistBand * (0.15 + twilight * 0.16));

          // Wind-torn smoke plume: billows widen, curl, drift, and fade into the upper cloud layer.
          float smokeY = smoothstep(0.075, 0.145, uv.y) * (1.0 - smoothstep(0.47, 0.66, uv.y));
          float smokeCenter = 0.335
            + 0.034 * sin(uv.y * 14.0 - t * 2.2)
            + 0.016 * sin(uv.y * 38.0 + t * 1.55)
            + 0.008 * sin(uv.y * 72.0 - t * 1.9);
          float smokeWidth = 0.008 + uv.y * 0.060;
          float smokeDistance = abs(uv.x - smokeCenter) / max(smokeWidth, 0.006);
          float smokeNoise = fbm(vec2(uv.x * 13.0 + t * 0.28, uv.y * 10.0 - t * 1.18));
          float smokeRimNoise = fbm(vec2(uv.x * 18.0 - t * 0.22, uv.y * 15.0 + t * 0.76));
          float smokeCore = (1.0 - smoothstep(0.20, 1.17, smokeDistance)) * smoothstep(0.27, 0.70, smokeNoise) * smokeY;
          float smokeRim = (1.0 - smoothstep(0.55, 1.62, smokeDistance)) * smoothstep(0.35, 0.74, smokeRimNoise) * smokeY;
          vec3 smokeColor = mix(vec3(0.48, 0.54, 0.60), vec3(0.79, 0.81, 0.83), day);
          smokeColor = mix(smokeColor, vec3(0.83, 0.52, 0.43), twilight * 0.72);
          smokeColor = mix(smokeColor, vec3(0.16, 0.21, 0.30), night * 0.72);
          sky = mix(sky, smokeColor, smokeRim * 0.25);
          sky = mix(sky, smokeColor * 0.80, smokeCore * (0.22 + night * 0.10));

          // Rolling landscape and a small distant exhaust stack anchor the plume in the scene.
          float hillA = fbm(vec2(uv.x * 2.1 + 3.0, 6.0));
          float hillB = fbm(vec2(uv.x * 4.2 - 1.0, 9.0));
          float hillLine = 0.047 + hillA * 0.033 + 0.008 * sin(uv.x * 11.0 + t * 0.12);
          float farHill = 1.0 - smoothstep(hillLine, hillLine + 0.012, uv.y);
          float nearLine = 0.024 + hillB * 0.022;
          float nearHill = 1.0 - smoothstep(nearLine, nearLine + 0.009, uv.y);
          vec3 farLand = mix(vec3(0.12, 0.22, 0.28), vec3(0.018, 0.034, 0.058), night * 0.92);
          vec3 nearLand = mix(vec3(0.065, 0.15, 0.16), vec3(0.008, 0.017, 0.030), night);
          sky = mix(sky, farLand, farHill * 0.92);
          sky = mix(sky, nearLand, nearHill * 0.96);

          // Tiny village houses sit along the horizon; the center roof anchors the moving chimney smoke.
          float houseLeftBody = boxMask(uv, vec2(0.12, 0.050), vec2(0.040, 0.028), 0.002);
          float houseMainBody = boxMask(uv, vec2(0.335, 0.052), vec2(0.062, 0.031), 0.002);
          float houseRightBody = boxMask(uv, vec2(0.66, 0.045), vec2(0.045, 0.027), 0.002);
          float houseFarRightBody = boxMask(uv, vec2(0.855, 0.035), vec2(0.034, 0.019), 0.002);
          float houseBodies = max(max(houseLeftBody, houseMainBody), max(houseRightBody, houseFarRightBody));
          vec3 houseColor = mix(vec3(0.15, 0.23, 0.28), vec3(0.012, 0.022, 0.039), night * 0.94);
          sky = mix(sky, houseColor, houseBodies * 0.98);

          float roofLeft = roofMask(uv, 0.12, 0.076, 0.122, 0.052);
          float roofMain = roofMask(uv, 0.335, 0.081, 0.139, 0.071);
          float roofRight = roofMask(uv, 0.66, 0.070, 0.119, 0.057);
          float roofFarRight = roofMask(uv, 0.855, 0.052, 0.090, 0.041);
          float houseRoofs = max(max(roofLeft, roofMain), max(roofRight, roofFarRight));
          vec3 roofColor = mix(vec3(0.085, 0.14, 0.18), vec3(0.006, 0.012, 0.025), night * 0.92);
          roofColor = mix(roofColor, vec3(0.18, 0.075, 0.075), dusk * 0.40);
          sky = mix(sky, roofColor, houseRoofs * 0.98);

          float houseWindows = max(
            max(boxMask(uv, vec2(0.106, 0.046), vec2(0.007, 0.009), 0.001),
                boxMask(uv, vec2(0.306, 0.048), vec2(0.007, 0.009), 0.001)),
            max(max(boxMask(uv, vec2(0.365, 0.048), vec2(0.007, 0.009), 0.001),
                    boxMask(uv, vec2(0.645, 0.041), vec2(0.007, 0.008), 0.001)),
                boxMask(uv, vec2(0.672, 0.041), vec2(0.007, 0.008), 0.001))
          );
          vec3 windowColor = mix(vec3(0.84, 0.74, 0.53), vec3(1.0, 0.52, 0.16), night);
          sky = mix(sky, windowColor, houseWindows * (0.10 + night * 0.76));

          float stackBody = boxMask(uv, vec2(0.335, 0.152), vec2(0.008, 0.021), 0.002);
          float stackCap = boxMask(uv, vec2(0.335, 0.174), vec2(0.012, 0.003), 0.001);
          sky = mix(sky, vec3(0.028, 0.037, 0.047), max(stackBody, stackCap));

          // Gentle cinematic vignette; keep the whole scene readable behind the search controls.
          vec2 centered = uv - 0.5;
          float vignette = 1.0 - smoothstep(0.32, 0.82, length(vec2(centered.x * 0.9, centered.y)));
          sky *= 0.91 + vignette * 0.09;

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
        const heightPx = Math.max(1, Math.floor(100 * Math.min(window.devicePixelRatio, 2)));
        canvas.width = widthPx;
        canvas.height = heightPx;
        canvas.style.width = "100%";
        canvas.style.height = "100px";
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
        gl.uniform1f(hourUniform, hourRef.current);
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

    smokeRise.value = withRepeat(withTiming(1, { duration: 6000 }), -1, false);
    smokeSway.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 3700 }),
        withTiming(-8, { duration: 4300 })
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
        {React.createElement("canvas" as any, { ref: canvasRef, style: { width: "100%", height: "100px", display: "block" } })}
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

  const sunProgress = Math.max(0, Math.min(1, (hour - 5.1) / 14.2));
  const sunLeft = 8 + sunProgress * 84;
  const moonProgress = Math.max(0, Math.min(1, ((hour - 19 + 24) % 24) / 10));
  const moonLeft = 89 - moonProgress * 78;
  const moonTop = 18 + Math.sin(moonProgress * Math.PI) * 30;
  const isDawn = hour >= 4.4 && hour < 7.4;
  const houseBodyColor = isNight ? "#0B1727" : isSunset ? "#26313F" : "#284653";
  const houseRoofColor = isNight ? "#070F1D" : isSunset ? "#342737" : "#203743";
  const houseWindowColor = isNight ? "#FFC66D" : "rgba(255,226,158,0.50)";

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
              transform: [{ translateX: -45 }],
            },
          ]}
        >
          <View style={s.sunHaloOuter} />
          <View style={s.sunHalo} />
          <View style={s.sunCore} />
        </Animated.View>
      ) : (
        <View
          style={[
            s.moon,
            {
              left: `${moonLeft}%`,
              right: undefined,
              top: moonTop,
              transform: [{ translateX: -39 }],
            },
          ]}
        >
          <View style={s.moonHalo} />
          <View style={s.moonBody}>
            <View style={s.moonCut} />
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

      <View style={[s.house, s.houseLeft]}>
        <View style={[s.houseRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, { backgroundColor: houseBodyColor }]} />
        <View style={[s.houseWindow, { left: 9, backgroundColor: houseWindowColor }]} />
      </View>
      <View style={[s.house, s.houseCenter]}>
        <View style={[s.houseRoof, { borderBottomColor: houseRoofColor }]} />
        <View style={[s.houseBody, { backgroundColor: houseBodyColor }]} />
        <View style={[s.houseWindow, { left: 11, backgroundColor: houseWindowColor }]} />
        <View style={[s.houseWindow, { right: 11, backgroundColor: houseWindowColor }]} />
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

      <Animated.View
        style={[
          s.smokeColumn,
          smokeAnimatedStyle,
          {
            opacity: isNight ? 0.58 : isSunset ? 0.80 : 0.64,
          },
        ]}
      >
        <View style={[s.smokePuff, { width: 27, height: 25, left: 39, top: 91, opacity: 0.68 }]} />
        <View style={[s.smokePuff, { width: 37, height: 32, left: 30, top: 68, opacity: 0.56 }]} />
        <View style={[s.smokePuff, { width: 47, height: 42, left: 23, top: 43, opacity: 0.43 }]} />
        <View style={[s.smokePuff, { width: 56, height: 49, left: 19, top: 19, opacity: 0.28 }]} />
      </Animated.View>
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

  // Marketplace content loads only after a delivery location is ready.
  const load = useCallback(async () => {
    if (!locationReady) return;

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
  }, [locationReady]);

  useEffect(() => {
    if (locationReady) load();
  }, [locationReady, load]);

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


      {!locationReady ? (
        <View style={s.locationGate}>
          <View style={s.locationGateCard}>
            <View style={s.locationGateIcon}>
              <MaterialCommunityIcons name="map-marker-radius" size={34} color={THEME.orange} />
            </View>
            <Text style={s.locationGateTitle}>Set your delivery location</Text>
            <Text style={s.locationGateText}>
              Choose your delivery point on the map. You can use live GPS to find yourself automatically, or move the map pin to your home.
            </Text>
            <Pressable
              onPress={captureInitialLocation}
              disabled={initialLocationLoading}
              style={[s.locationGateButton, initialLocationLoading && { opacity: 0.7 }]}
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
      ) : (
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
      )}

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
  /* Realistic 3D-style sky layers stay behind the existing header/search only */
  heroHeaderShell: { position: "relative", width: "100%", overflow: "hidden" },
  nightSky: { position: "absolute", top: 0, left: 0, right: 0, height: 100, overflow: "hidden", zIndex: 0, pointerEvents: "none" },
  nightGradientLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  nightGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  horizonGlow: { position: "absolute", left: "12%", right: "12%", bottom: 4, height: 68, borderTopLeftRadius: 170, borderTopRightRadius: 170, backgroundColor: "rgba(255,190,130,0.10)" },
  horizonSilhouette: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, backgroundColor: "rgba(13,28,38,0.58)" },
  house: { position: "absolute", bottom: 1, height: 22, zIndex: 3 },
  houseLeft: { left: "8%", width: 34, height: 20 },
  houseCenter: { left: "28%", width: 44, height: 22 },
  houseRight: { right: "28%", width: 40, height: 19 },
  houseFarRight: { right: "5%", width: 30, height: 17 },
  houseRoof: { position: "absolute", left: 0, bottom: 10, width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent" },
  houseBody: { position: "absolute", left: 4, right: 4, bottom: 0, height: 12, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  houseWindow: { position: "absolute", bottom: 3, width: 4, height: 5, borderRadius: 1 },
  smokeColumn: { position: "absolute", left: "21%", bottom: 20, width: 94, height: 118 },
  smokePuff: { position: "absolute", borderRadius: 50, backgroundColor: "rgba(206,218,226,0.35)", shadowColor: "#CBD5E1", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 1 },
  smokeStack: { position: "absolute", bottom: 12, left: "32.5%", width: 7, height: 12, backgroundColor: "#263442", borderTopWidth: 2, borderTopColor: "#526170" },
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