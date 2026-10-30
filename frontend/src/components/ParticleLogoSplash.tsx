import React, { useEffect, useRef } from "react";
import { Image as NativeImage, Platform, StyleSheet, View } from "react-native";
import { Asset } from "expo-asset";

const logoAsset = require("../../assets/images/splash-icon.png");
const CANVAS_SIZE = 360;
const SAMPLE_SIZE = 260;
const SAMPLE_STEP = 4;

type Particle = {
  tx: number;
  ty: number;
  tz: number;
  sx: number;
  sy: number;
  sz: number;
  delay: number;
  radius: number;
  color: string;
  phase: number;
};

export default function ParticleLogoSplash() {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const canvas = canvasRef.current as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let disposed = false;
    let frameId = 0;
    let particles: Particle[] = [];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);

    canvas.width = Math.round(CANVAS_SIZE * pixelRatio);
    canvas.height = Math.round(CANVAS_SIZE * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const source = Asset.fromModule(logoAsset);
    const image = document.createElement("img");
    image.decoding = "async";

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = SAMPLE_SIZE;
    sampleCanvas.height = SAMPLE_SIZE;
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });

    const drawFrame = (now: number, startedAt: number) => {
      if (disposed) return;
      const elapsed = now - startedAt;
      context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // A soft navy/blue glow replaces the solid black square in the source artwork.
      const ambient = context.createRadialGradient(
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.48, 8,
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.48, CANVAS_SIZE * 0.54
      );
      ambient.addColorStop(0, "rgba(13, 69, 125, 0.25)");
      ambient.addColorStop(0.48, "rgba(7, 41, 78, 0.12)");
      ambient.addColorStop(1, "rgba(6, 20, 38, 0)");
      context.fillStyle = ambient;
      context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const spin = Math.sin(elapsed * 0.00048) * 0.13;
      const pitch = 0.10 + Math.sin(elapsed * 0.00062) * 0.035;
      const cosineY = Math.cos(spin);
      const sineY = Math.sin(spin);
      const cosineX = Math.cos(pitch);
      const sineX = Math.sin(pitch);

      for (const particle of particles) {
        const progress = Math.max(0, Math.min(1, (elapsed - particle.delay * 420) / 1480));
        const eased = 1 - Math.pow(1 - progress, 3);
        let x = particle.sx + (particle.tx - particle.sx) * eased;
        let y = particle.sy + (particle.ty - particle.sy) * eased;
        let z = particle.sz + (particle.tz - particle.sz) * eased;

        const shimmer = Math.sin(elapsed * 0.0012 + particle.phase) * (0.65 * eased);
        x += shimmer;
        y += Math.cos(elapsed * 0.001 + particle.phase) * (0.5 * eased);

        // Lightweight 3D perspective projection: the whole particle logo gently turns in space.
        const rotatedX = x * cosineY + z * sineY;
        const rotatedZ = -x * sineY + z * cosineY;
        const rotatedY = y * cosineX - rotatedZ * sineX;
        const depth = y * sineX + rotatedZ * cosineX;
        const perspective = Math.max(0.55, Math.min(1.65, 470 / (470 + depth)));

        const screenX = CANVAS_SIZE * 0.5 + rotatedX * perspective;
        const screenY = CANVAS_SIZE * 0.5 + rotatedY * perspective;
        const radius = Math.max(0.65, particle.radius * perspective);
        const alpha = 0.24 + eased * 0.76;

        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        if (particle.phase > 5.2) {
          context.shadowColor = particle.color;
          context.shadowBlur = 4.5 * eased;
        } else {
          context.shadowBlur = 0;
        }
        context.beginPath();
        context.arc(screenX, screenY, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      frameId = window.requestAnimationFrame((nextTime) => drawFrame(nextTime, startedAt));
    };

    image.onload = () => {
      if (disposed || !sampleContext) return;

      sampleContext.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      sampleContext.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const pixelData = sampleContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      const nextParticles: Particle[] = [];

      for (let y = 0; y < SAMPLE_SIZE; y += SAMPLE_STEP) {
        for (let x = 0; x < SAMPLE_SIZE; x += SAMPLE_STEP) {
          const offset = (y * SAMPLE_SIZE + x) * 4;
          const red = pixelData[offset];
          const green = pixelData[offset + 1];
          const blue = pixelData[offset + 2];
          const alpha = pixelData[offset + 3];
          const darkest = Math.min(red, green, blue);
          const brightest = Math.max(red, green, blue);
          const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);

          // The original asset is a JPEG with a black square behind it. Ignore those pixels.
          if (alpha < 32 || brightest < 26 || (luminance < 31 && brightest - darkest < 18)) continue;

          const angle = Math.random() * Math.PI * 2;
          const scatterDistance = 150 + Math.random() * 175;
          const color = `rgb(${red}, ${green}, ${blue})`;
          nextParticles.push({
            tx: (x - SAMPLE_SIZE * 0.5) * 1.12,
            ty: (y - SAMPLE_SIZE * 0.5) * 1.12,
            tz: (Math.random() - 0.5) * 16,
            sx: Math.cos(angle) * scatterDistance,
            sy: Math.sin(angle) * scatterDistance,
            sz: (Math.random() - 0.5) * 210,
            delay: Math.random(),
            radius: 0.9 + (luminance / 255) * 1.1,
            color,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      particles = nextParticles;
      const startTime = window.performance.now();
      frameId = window.requestAnimationFrame((time) => drawFrame(time, startTime));
    };

    image.onerror = () => {
      // Keep the splash background clean if the bundled logo cannot be sampled.
      if (!disposed) {
        context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    };

    image.src = source.uri || "";

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      image.onload = null;
      image.onerror = null;
      image.src = "";
    };
  }, []);

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeFallback}>
        <NativeImage source={logoAsset} style={styles.nativeLogo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.canvasWrap} accessible accessibilityLabel="KMT Bazaar logo forming from 3D particles">
      {React.createElement("canvas" as any, {
        ref: canvasRef,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        role: "img",
        "aria-label": "KMT Bazaar logo forming from 3D particles",
        style: { width: "100%", height: "100%", display: "block" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    width: 360,
    height: 360,
    maxWidth: "92%",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeFallback: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeLogo: {
    width: "100%",
    height: "100%",
  },
});
