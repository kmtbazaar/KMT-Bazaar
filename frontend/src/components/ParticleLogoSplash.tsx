import React, { useEffect, useRef } from "react";
import { Image as NativeImage, Platform, StyleSheet, View } from "react-native";
import { Asset } from "expo-asset";

const logoAsset = require("../../assets/images/splash-icon.png");
const CANVAS_SIZE = 440;
const SAMPLE_SIZE = 400;
const SAMPLE_STEP = 3;

type Particle = {
  tx: number; ty: number; tz: number;
  sx: number; sy: number; sz: number;
  delay: number; radius: number; color: string; phase: number;
  curve: number; angle: number; glow: boolean;
};
type Spark = {
  x: number; y: number; radius: number; phase: number; color: string;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smoothStep = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export default function ParticleLogoSplash() {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    let disposed = false;
    let frameId = 0;
    let particles: Particle[] = [];
    let sparks: Spark[] = [];

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(CANVAS_SIZE * pixelRatio);
    canvas.height = Math.round(CANVAS_SIZE * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const source = Asset.fromModule(logoAsset);
    const image = document.createElement("img");
    image.decoding = "async";
    image.crossOrigin = "anonymous";

    // Off-screen canvas stores the clean high-resolution final logo.
    // The black JPEG matte is removed while preserving dark blue/orange details.
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = SAMPLE_SIZE;
    logoCanvas.height = SAMPLE_SIZE;
    const logoContext = logoCanvas.getContext("2d", { willReadFrequently: true });

    const drawFrame = (now: number, startedAt: number) => {
      if (disposed) return;
      const elapsed = now - startedAt;
      context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const ambient = context.createRadialGradient(
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.47, 5,
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.47, CANVAS_SIZE * 0.56
      );
      ambient.addColorStop(0, "rgba(14, 62, 112, 0.24)");
      ambient.addColorStop(0.55, "rgba(7, 29, 58, 0.11)");
      ambient.addColorStop(1, "rgba(4, 9, 18, 0)");
      context.fillStyle = ambient;
      context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // First stage: a restrained perimeter field of blue and amber particles.
      for (const spark of sparks) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.002 + spark.phase);
        const alpha = (0.10 + pulse * 0.25) * (1 - smoothStep(2100, 2800, elapsed) * 0.18);
        context.globalAlpha = alpha;
        context.fillStyle = spark.color;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.radius * (0.8 + pulse * 0.3), 0, Math.PI * 2);
        context.fill();
      }

      // Second stage: particles travel along smooth curved paths into the logo.
      const yaw = Math.sin(elapsed * 0.00042) * 0.07;
      const pitch = 0.045 + Math.sin(elapsed * 0.0005) * 0.018;
      const cosineY = Math.cos(yaw);
      const sineY = Math.sin(yaw);
      const cosineX = Math.cos(pitch);
      const sineX = Math.sin(pitch);
      const finalReveal = smoothStep(1480, 2180, elapsed);
      const particleFade = 1 - finalReveal * 0.72;

      for (const particle of particles) {
        const emergence = smoothStep(particle.delay * 170, particle.delay * 170 + 220, elapsed);
        const progress = smoothStep(
          170 + particle.delay * 340,
          170 + particle.delay * 340 + 1250,
          elapsed
        );
        const curvedTravel = Math.sin(progress * Math.PI) * particle.curve;
        const tangentX = -Math.sin(particle.angle);
        const tangentY = Math.cos(particle.angle);

        let x = particle.sx + (particle.tx - particle.sx) * progress + tangentX * curvedTravel;
        let y = particle.sy + (particle.ty - particle.sy) * progress + tangentY * curvedTravel;
        let z = particle.sz + (particle.tz - particle.sz) * progress;

        // Once assembled, particles remain nearly still rather than flickering noisily.
        x += Math.sin(elapsed * 0.0012 + particle.phase) * 0.22 * progress;
        y += Math.cos(elapsed * 0.001 + particle.phase) * 0.18 * progress;

        const rotatedX = x * cosineY + z * sineY;
        const rotatedZ = -x * sineY + z * cosineY;
        const rotatedY = y * cosineX - rotatedZ * sineX;
        const depth = y * sineX + rotatedZ * cosineX;
        const perspective = Math.max(0.68, Math.min(1.42, 520 / (520 + depth)));

        const screenX = CANVAS_SIZE * 0.5 + rotatedX * perspective;
        const screenY = CANVAS_SIZE * 0.5 + rotatedY * perspective;
        const radius = particle.radius * perspective;
        const alpha = emergence * (0.34 + progress * 0.66) * particleFade;
        if (alpha <= 0.01) continue;

        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.shadowColor = particle.glow ? particle.color : "transparent";
        context.shadowBlur = particle.glow ? 2.4 * (0.35 + progress * 0.65) : 0;
        context.beginPath();
        context.arc(screenX, screenY, radius, 0, Math.PI * 2);
        context.fill();
      }

      // Final stage: resolve into the original crisp logo with the black matte removed.
      if (finalReveal > 0) {
        context.save();
        context.globalAlpha = finalReveal;
        context.shadowColor = "rgba(28, 112, 220, 0.38)";
        context.shadowBlur = 15;
        context.drawImage(logoCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        context.shadowBlur = 0;
        context.drawImage(logoCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        context.restore();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      frameId = window.requestAnimationFrame((nextTime) => drawFrame(nextTime, startedAt));
    };

    image.onload = () => {
      if (disposed || !logoContext) return;
      logoContext.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      logoContext.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      const imageData = logoContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const pixels = imageData.data;
      const nextParticles: Particle[] = [];

      // Key out neutral near-black pixels and feather only dark neutral edges.
      for (let y = 0; y < SAMPLE_SIZE; y += 1) {
        for (let x = 0; x < SAMPLE_SIZE; x += 1) {
          const offset = (y * SAMPLE_SIZE + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const brightest = Math.max(red, green, blue);
          const darkest = Math.min(red, green, blue);
          const chroma = brightest - darkest;

          if (brightest < 26 && chroma < 18) {
            pixels[offset + 3] = 0;
          } else if (brightest < 48 && chroma < 24) {
            pixels[offset + 3] = Math.round(pixels[offset + 3] * clamp((brightest - 12) / 36));
          }
        }
      }

      logoContext.putImageData(imageData, 0, 0);

      for (let y = 0; y < SAMPLE_SIZE; y += SAMPLE_STEP) {
        for (let x = 0; x < SAMPLE_SIZE; x += SAMPLE_STEP) {
          const offset = (y * SAMPLE_SIZE + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const alpha = pixels[offset + 3];
          const darkest = Math.min(red, green, blue);
          const brightest = Math.max(red, green, blue);
          const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);

          // Ignore the black square in both the particle shape and the final image.
          if (alpha < 32 || brightest < 26 || (luminance < 31 && brightest - darkest < 18)) continue;

          const angle = Math.random() * Math.PI * 2;
          const startRadius = 92 + Math.random() * 132;
          const color = "rgb(" + red + ", " + green + ", " + blue + ")";
          const scale = CANVAS_SIZE / SAMPLE_SIZE;

          nextParticles.push({
            tx: (x + 0.5 - SAMPLE_SIZE * 0.5) * scale,
            ty: (y + 0.5 - SAMPLE_SIZE * 0.5) * scale,
            tz: (Math.random() - 0.5) * 18,
            sx: Math.cos(angle) * startRadius,
            sy: Math.sin(angle) * startRadius,
            sz: (Math.random() - 0.5) * 190,
            delay: Math.random(),
            radius: 0.58 + (luminance / 255) * 0.56,
            color,
            phase: Math.random() * Math.PI * 2,
            curve: 14 + Math.random() * 28,
            angle,
            glow: Math.random() < 0.045,
          });
        }
      }

      // A small, orderly halo stays around the canvas while the main logo forms.
      sparks = Array.from({ length: 84 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const radiusX = 192 + Math.random() * 22;
        const radiusY = 178 + Math.random() * 24;
        return {
          x: CANVAS_SIZE * 0.5 + Math.cos(angle) * radiusX,
          y: CANVAS_SIZE * 0.5 + Math.sin(angle) * radiusY,
          radius: 0.55 + Math.random() * 0.75,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.48 ? "#36a8ff" : "#ffb32f",
        };
      });

      const startTime = window.performance.now();
      frameId = window.requestAnimationFrame((time) => drawFrame(time, startTime));
    };

    image.onerror = () => {
      if (!disposed) context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
    width: "92%",
    maxWidth: CANVAS_SIZE,
    aspectRatio: 1,
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
