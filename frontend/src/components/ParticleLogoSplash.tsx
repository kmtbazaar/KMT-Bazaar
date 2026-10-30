import React, { useEffect, useRef } from "react";
import { Image as NativeImage, Platform, StyleSheet, View } from "react-native";
import { Asset } from "expo-asset";

const logoAsset = require("../../assets/images/splash-icon.png");
const SAMPLE_SIZE = 400;
const SAMPLE_STEP = 3;
const MAX_PARTICLES = 11000;

type Particle = {
  tx: number; ty: number; tz: number;
  sx: number; sy: number; sz: number;
  delay: number; radius: number; color: string; phase: number;
  curve: number; angle: number; glow: boolean;
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

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
    let viewportWidth = Math.max(320, window.innerWidth || 390);
    let viewportHeight = Math.max(480, window.innerHeight || 800);
    const resizeCanvas = () => {
      viewportWidth = Math.max(1, window.innerWidth || viewportWidth);
      viewportHeight = Math.max(1, window.innerHeight || viewportHeight);
      canvas.width = Math.round(viewportWidth * pixelRatio);
      canvas.height = Math.round(viewportHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const source = Asset.fromModule(logoAsset);
    const image = document.createElement("img");
    image.decoding = "async";
    image.crossOrigin = "anonymous";

    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = SAMPLE_SIZE;
    logoCanvas.height = SAMPLE_SIZE;
    const logoContext = logoCanvas.getContext("2d", { willReadFrequently: true });
    let shineCanvas: HTMLCanvasElement | null = null;
    let shineContext: CanvasRenderingContext2D | null = null;

    let cropX = 0;
    let cropY = 0;
    let cropWidth = SAMPLE_SIZE;
    let cropHeight = SAMPLE_SIZE;
    let logoDrawWidth = 0;
    let logoDrawHeight = 0;

    const drawOrbits = (elapsed: number) => {
      const strength = elapsed < 0.2 ? 0 : 1 - smoothStep(3.6, 4.7, elapsed);
      if (strength <= 0.01) return;

      context.save();
      const orbitScale = Math.min(viewportWidth, viewportHeight) / 600;
      context.translate(viewportWidth * 0.5, viewportHeight * 0.5);
      context.scale(orbitScale, orbitScale);
      context.rotate(-0.10 + Math.sin(elapsed * 0.7) * 0.025);

      context.lineWidth = 1.15;
      context.strokeStyle = "rgba(55, 158, 255, " + (0.24 * strength) + ")";
      context.beginPath();
      context.ellipse(0, 0, 278, 190, 0, Math.PI * 1.08, Math.PI * 1.91);
      context.stroke();

      context.strokeStyle = "rgba(255, 171, 48, " + (0.22 * strength) + ")";
      context.beginPath();
      context.ellipse(0, 0, 268, 181, 0, Math.PI * 0.04, Math.PI * 0.91);
      context.stroke();

      const blueAngle = Math.PI * 1.08 + ((elapsed * 0.62) % (Math.PI * 0.83));
      const goldAngle = Math.PI * 0.04 + ((elapsed * 0.54) % (Math.PI * 0.87));
      const nodes = [
        { x: Math.cos(blueAngle) * 278, y: Math.sin(blueAngle) * 190, color: "#37a8ff" },
        { x: Math.cos(goldAngle) * 268, y: Math.sin(goldAngle) * 181, color: "#ffb33d" },
      ];

      for (const node of nodes) {
        context.globalAlpha = 0.48 * strength;
        context.fillStyle = node.color;
        context.shadowColor = node.color;
        context.shadowBlur = 7;
        context.beginPath();
        context.arc(node.x, node.y, 2.0, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
      context.restore();
      context.globalAlpha = 1;
    };

    const drawFrame = (now: number, startedAt: number) => {
      if (disposed) return;
      const elapsed = (now - startedAt) / 1000;

      context.clearRect(0, 0, viewportWidth, viewportHeight);
      // The parent and canvas remain pure black; only the particles and logo are drawn.
      drawOrbits(elapsed);

      const settle = smoothStep(2.55, 3.85, elapsed);
      const yaw =
        (1 - settle) * 0.34 * Math.sin(elapsed * 1.15) +
        settle * 0.035 * Math.sin(elapsed * 0.7);
      const pitch =
        (1 - settle) * 0.17 * Math.sin(elapsed * 0.92 + 0.6) +
        settle * 0.018 * Math.sin(elapsed * 0.7);

      const cosineY = Math.cos(yaw);
      const sineY = Math.sin(yaw);
      const cosineX = Math.cos(pitch);
      const sineX = Math.sin(pitch);
      const particleFade = 1 - smoothStep(3.65, 4.35, elapsed) * 0.78;

      for (const particle of particles) {
        const progress = smoothStep(0.18, 2.72, elapsed - particle.delay);
        const ease = progress * progress * (3 - 2 * progress);
        const curvedTravel = Math.sin(Math.PI * ease) * particle.curve;

        const tangentX = -Math.sin(particle.angle);
        const tangentY = Math.cos(particle.angle);
        const x =
          particle.sx +
          (particle.tx - particle.sx) * ease +
          tangentX * curvedTravel;
        const y =
          particle.sy +
          (particle.ty - particle.sy) * ease +
          tangentY * curvedTravel * 0.72;
        const z =
          particle.sz * (1 - ease) +
          particle.tz * ease +
          Math.sin(ease * Math.PI * 2 + particle.phase) * (1 - ease) * 52;

        // 3D yaw, pitch and perspective make the particle field move in depth.
        const rotatedX = x * cosineY + z * sineY;
        const rotatedZ = -x * sineY + z * cosineY;
        const rotatedY = y * cosineX - rotatedZ * sineX;
        const depth = y * sineX + rotatedZ * cosineX;
        const perspective = Math.max(0.62, Math.min(1.48, 520 / (520 + depth)));

        const screenX = viewportWidth * 0.5 + rotatedX * perspective;
        const screenY = viewportHeight * 0.5 + rotatedY * perspective;
        if (
          screenX < -3 || screenX > viewportWidth + 3 ||
          screenY < -3 || screenY > viewportHeight + 3
        ) continue;

        const radius = particle.radius * perspective;
        const alpha = (0.28 + 0.72 * ease) * particleFade;
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;

        if (particle.glow && ease > 0.35) {
          context.shadowColor = particle.color;
          context.shadowBlur = 2.6 * ease;
        } else {
          context.shadowBlur = 0;
        }

        context.beginPath();
        context.arc(screenX, screenY, radius, 0, Math.PI * 2);
        context.fill();

        // Small secondary highlight gives selected particles a dimensional bead.
        if (particle.glow && ease > 0.6) {
          context.globalAlpha = alpha * 0.42;
          context.fillStyle = "#ffffff";
          context.beginPath();
          context.arc(screenX - radius * 0.28, screenY - radius * 0.32, radius * 0.25, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;

      // Crisp sampled logo reveal after the particles assemble.
      const revealProgress = smoothStep(3.52, 4.26, elapsed);
      const logoLeft = viewportWidth * 0.5 - logoDrawWidth * 0.5;
      const logoTop = viewportHeight * 0.5 - logoDrawHeight * 0.5;
      if (revealProgress > 0.001 && logoDrawWidth > 0 && logoDrawHeight > 0) {
        context.save();
        context.globalAlpha = revealProgress;
        context.shadowColor = "rgba(42, 174, 255, 0.78)";
        context.shadowBlur = 15 * revealProgress;
        context.drawImage(
          logoCanvas,
          cropX, cropY, cropWidth, cropHeight,
          logoLeft, logoTop, logoDrawWidth, logoDrawHeight
        );
        context.restore();
      }

      // Diagonal blue-white shine sweeps through the logo's alpha mask.
      const shineProgress = smoothStep(4.32, 5.25, elapsed);
      if (shineProgress > 0 && shineProgress < 1 && shineCanvas && shineContext) {
        shineContext.clearRect(0, 0, cropWidth, cropHeight);
        shineContext.globalCompositeOperation = "source-over";
        shineContext.drawImage(logoCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const shineCenter = (shineProgress * 1.5 - 0.25) * cropWidth;
        const shineGradient = shineContext.createLinearGradient(shineCenter - cropWidth * 0.22, 0, shineCenter + cropWidth * 0.22, cropHeight);
        shineGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        shineGradient.addColorStop(0.34, "rgba(150, 224, 255, 0.10)");
        shineGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.92)");
        shineGradient.addColorStop(0.66, "rgba(97, 194, 255, 0.18)");
        shineGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        shineContext.globalCompositeOperation = "source-in";
        shineContext.fillStyle = shineGradient;
        shineContext.fillRect(0, 0, cropWidth, cropHeight);
        shineContext.globalCompositeOperation = "source-over";
        context.save();
        context.globalAlpha = 0.92;
        context.globalCompositeOperation = "screen";
        context.drawImage(shineCanvas, logoLeft, logoTop, logoDrawWidth, logoDrawHeight);
        context.restore();
      }

      // End shimmer is subtle and limited to the clean logo hold.
      if (elapsed > 4.75 && elapsed < 5.25) {
        const glint = 0.5 + 0.5 * Math.sin(elapsed * 4.2);
        context.globalAlpha = 0.22 + glint * 0.28;
        context.fillStyle = "#55b8ff";
        context.beginPath();
        context.arc(viewportWidth * 0.5 - logoDrawWidth * 0.53, viewportHeight * 0.5 - logoDrawHeight * 0.08, 1.4 + glint, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }

      frameId = window.requestAnimationFrame((nextTime) => drawFrame(nextTime, startedAt));
    };

    image.onload = () => {
      if (disposed || !logoContext) return;

      logoContext.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      logoContext.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      const imageData = logoContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const pixels = imageData.data;
      let minX = SAMPLE_SIZE;
      let minY = SAMPLE_SIZE;
      let maxX = 0;
      let maxY = 0;

      // Remove the black JPEG matte while retaining saturated dark-blue/orange artwork.
      for (let y = 0; y < SAMPLE_SIZE; y += 1) {
        for (let x = 0; x < SAMPLE_SIZE; x += 1) {
          const offset = (y * SAMPLE_SIZE + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const brightest = Math.max(red, green, blue);
          const darkest = Math.min(red, green, blue);
          const chroma = brightest - darkest;
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

          const saturatedAlpha =
            smoothStep(7, 30, chroma) * smoothStep(9, 38, brightest) * 0.98;
          const lightAlpha = smoothStep(48, 96, luminance) * 0.94;
          let matteAlpha = Math.max(saturatedAlpha, lightAlpha);

          if (brightest < 15 && chroma < 13) matteAlpha = 0;
          pixels[offset + 3] = Math.round(pixels[offset + 3] * matteAlpha);

          if (pixels[offset + 3] > 56) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      logoContext.putImageData(imageData, 0, 0);
      if (maxX <= minX || maxY <= minY) return;

      cropX = minX;
      cropY = minY;
      cropWidth = maxX - minX + 1;
      cropHeight = maxY - minY + 1;

      const fitScale = Math.min((viewportWidth * 0.76) / cropWidth, (viewportHeight * 0.55) / cropHeight, 1.75);
      logoDrawWidth = cropWidth * fitScale;
      logoDrawHeight = cropHeight * fitScale;
      shineCanvas = document.createElement("canvas");
      shineCanvas.width = cropWidth;
      shineCanvas.height = cropHeight;
      shineContext = shineCanvas.getContext("2d");

      const nextParticles: Particle[] = [];
      const points: Array<{
        x: number; y: number; z: number;
        red: number; green: number; blue: number; alpha: number;
      }> = [];

      for (let y = minY; y <= maxY; y += SAMPLE_STEP) {
        for (let x = minX; x <= maxX; x += SAMPLE_STEP) {
          const offset = (y * SAMPLE_SIZE + x) * 4;
          const alpha = pixels[offset + 3] / 255;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const brightest = Math.max(red, green, blue);
          const darkest = Math.min(red, green, blue);
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

          if (alpha < 0.23 || brightest < 26 || (luminance < 31 && brightest - darkest < 18)) continue;
          points.push({ x, y, z: 0, red, green, blue, alpha });
        }
      }

      // Bound draw cost on phones while keeping the logo silhouette densely sampled.
      if (points.length > MAX_PARTICLES) {
        for (let i = points.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const swap = points[i];
          points[i] = points[j];
          points[j] = swap;
        }
        points.length = MAX_PARTICLES;
      }

      const centerX = minX + cropWidth * 0.5;
      const centerY = minY + cropHeight * 0.5;
      const fit = fitScale;

      for (const point of points) {
        const angle = Math.random() * Math.PI * 2;
        const startSpreadX = viewportWidth + logoDrawWidth * 1.3;
        const startSpreadY = viewportHeight + logoDrawHeight * 1.3;
        const color = "rgb(" + point.red + ", " + point.green + ", " + point.blue + ")";

        nextParticles.push({
          tx: (point.x - centerX) * fit,
          ty: (point.y - centerY) * fit,
          tz: (Math.random() - 0.5) * 18,
          sx: (Math.random() - 0.5) * startSpreadX,
          sy: (Math.random() - 0.5) * startSpreadY,
          sz: (Math.random() - 0.5) * 620,
          delay: Math.random() * 0.55,
          radius: 0.8 + point.alpha * 0.85 + Math.random() * 0.5,
          color,
          phase: Math.random() * Math.PI * 2,
          curve: 20 + Math.random() * 42,
          angle,
          glow: Math.random() < 0.04,
        });
      }

      particles = nextParticles;
      const startTime = window.performance.now();
      frameId = window.requestAnimationFrame((time) => drawFrame(time, startTime));
    };

    image.onerror = () => {
      if (!disposed) {
        // Keep a clean black splash if asset decoding fails; never show a white canvas.
        context.clearRect(0, 0, viewportWidth, viewportHeight);
      }
    };
    image.src = source.uri || "";

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
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
    <View style={styles.canvasWrap} accessible accessibilityLabel="KMT Bazaar logo assembling from smooth 3D particles">
      {React.createElement("canvas" as any, {
        ref: canvasRef,
        width: 1,
        height: 1,
        role: "img",
        "aria-label": "KMT Bazaar logo assembling from smooth 3D particles across the screen",
        style: { width: "100%", height: "100%", display: "block", backgroundColor: "#000000" },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#000000",
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
