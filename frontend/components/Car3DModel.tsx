import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

type Car3DModelProps = {
  kind?: string;
  color?: string;
  fallbackImage?: string;
};

type ThreeObject = any;

function shapeFor(kind: string) {
  const value = String(kind || "").toLowerCase();
  if (/suv|muv|mpv|innova|crysta|ertiga|fortuner|traveller|tempo|van/.test(value)) return "suv";
  if (/hatch|swift|compact/.test(value)) return "hatch";
  return "sedan";
}

function disposeTree(root: ThreeObject) {
  if (!root?.traverse) return;
  root.traverse((node: ThreeObject) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: ThreeObject) => material?.dispose?.());
    else node.material?.dispose?.();
  });
}

function createCar(THREE: ThreeObject, kind: string, color: string) {
  const group = new THREE.Group();
  const profile = shapeFor(kind);
  const roof = profile === "suv" ? 1.34 : profile === "hatch" ? 1.13 : 1.20;
  const rear = profile === "hatch" ? -1.12 : -1.0;

  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.68, roughness: 0.24 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x10151c, metalness: 0.25, roughness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0b1d2e, metalness: 0.45, roughness: 0.16, transparent: true, opacity: 0.96, side: THREE.DoubleSide,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111317, metalness: 0.04, roughness: 0.86 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xc8d3df, metalness: 0.84, roughness: 0.22 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xe8f5ff, emissive: 0x79bfff, emissiveIntensity: 0.7, metalness: 0.25, roughness: 0.18 });
  const tailLamp = new THREE.MeshStandardMaterial({ color: 0xc71532, emissive: 0x68091a, emissiveIntensity: 0.45 });

  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, material: ThreeObject) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const outline = new THREE.Shape();
  outline.moveTo(-1.72, 0.31);
  outline.lineTo(1.72, 0.31);
  outline.lineTo(1.75, 0.54);
  outline.quadraticCurveTo(1.68, 0.73, 1.38, 0.77);
  outline.lineTo(0.91, roof - 0.16);
  outline.quadraticCurveTo(0.74, roof, 0.51, roof);
  outline.lineTo(-0.56, roof);
  outline.quadraticCurveTo(-0.79, roof - 0.02, -0.98, 0.91);
  outline.lineTo(-1.40, 0.78);
  outline.quadraticCurveTo(-1.68, 0.72, -1.72, 0.54);
  outline.closePath();

  const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 1.12, steps: 1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2,
  });
  bodyGeometry.translate(0, 0, -0.56);
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  group.userData.paintMaterial = paint;

  box(0, 0.37, 0, 3.24, 0.16, 1.05, darkTrim);
  box(1.69, 0.40, 0, 0.15, 0.18, 0.92, darkTrim);
  box(-1.67, 0.40, 0, 0.13, 0.18, 0.92, darkTrim);

  const sideWindow = new THREE.Shape();
  sideWindow.moveTo(-0.84, 0.91);
  sideWindow.lineTo(-0.55, roof - 0.10);
  sideWindow.lineTo(0.43, roof - 0.10);
  sideWindow.lineTo(0.76, 0.91);
  sideWindow.closePath();
  const sideWindowGeometry = new THREE.ShapeGeometry(sideWindow);
  [0.575, -0.575].forEach((z) => {
    const pane = new THREE.Mesh(sideWindowGeometry, glass);
    pane.position.z = z;
    group.add(pane);
  });

  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.28), glass);
  frontGlass.position.set(0.91, roof - 0.21, 0);
  frontGlass.rotation.y = Math.PI / 2;
  frontGlass.rotation.z = -0.22;
  group.add(frontGlass);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.70, 0.25), glass);
  rearGlass.position.set(-1.03, 0.89, 0);
  rearGlass.rotation.y = Math.PI / 2;
  rearGlass.rotation.z = 0.46;
  group.add(rearGlass);

  box(0.08, roof - 0.08, 0, 0.045, 0.045, 1.05, darkTrim);
  box(-0.72, 0.89, 0, 0.035, 0.055, 1.12, darkTrim);
  box(0.54, 0.77, 0.64, 0.22, 0.08, 0.16, darkTrim);
  box(0.54, 0.77, -0.64, 0.22, 0.08, 0.16, darkTrim);

  for (const x of [-1.08, 1.05]) {
    for (const z of [-0.61, 0.61]) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.17, 14), rubber);
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(x, 0.34, z);
      tyre.castShadow = true;
      group.add(tyre);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.025, 7, 16), rim);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.34, z + (z > 0 ? 0.09 : -0.09));
      group.add(ring);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.018, 12), darkTrim);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.34, z + (z > 0 ? 0.10 : -0.10));
      group.add(hub);
    }
  }

  for (const z of [-0.34, 0.34]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.22), lamp);
    headlight.position.set(1.755, 0.57, z);
    group.add(headlight);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.20), tailLamp);
    tail.position.set(-1.73, 0.56, z);
    group.add(tail);
  }

  box(1.765, 0.43, 0, 0.045, 0.17, 0.42, darkTrim);
  box(1.79, 0.43, 0, 0.025, 0.035, 0.29, rim);
  box(rear - 0.62, 0.48, 0, 0.08, 0.06, 0.70, darkTrim);

  group.scale.setScalar(1.12);
  group.rotation.y = -0.18;
  return group;
}

export default function Car3DModel({ kind = "sedan", color = "#d92741", fallbackImage }: Car3DModelProps) {
  const hostRef = useRef<any>(null);
  const configRef = useRef({ kind, color });
  const [ready, setReady] = useState(false);
  configRef.current = { kind, color };

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") return;

    let disposed = false;
    let renderer: ThreeObject = null;
    let scene: ThreeObject = null;
    let camera: ThreeObject = null;
    let car: ThreeObject = null;
    let shadow: ThreeObject = null;
    let frame = 0;
    let resizeObserver: ThreeObject = null;
    let lastFrame = 0;
    let currentShape = "";
    let currentColor = "";
    const host = hostRef.current as unknown as HTMLElement;
    if (!host) return;

    const resize = () => {
      if (!renderer || !camera || !host) return;
      const w = Math.max(1, host.clientWidth || 340);
      const h = Math.max(1, host.clientHeight || 230);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const renderScene = async () => {
      try {
        const THREE = await import("three");
        if (disposed) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
        camera.position.set(4.2, 2.35, 5.9);
        camera.lookAt(0, 0.67, 0);

        renderer = new THREE.WebGLRenderer({
          alpha: true, antialias: false, powerPreference: "low-power", depth: true, stencil: false,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.04;
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.touchAction = "pan-y";
        host.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x23202a, 2.0));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
        keyLight.position.set(3.5, 6, 4.5);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x5a9fff, 2.0);
        rimLight.position.set(-4, 2.8, -3.5);
        scene.add(rimLight);
        const redFill = new THREE.PointLight(0xef233c, 1.15, 10);
        redFill.position.set(2, 1.2, -2.6);
        scene.add(redFill);

        const groundGeometry = new THREE.CircleGeometry(2.05, 32);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, opacity: 0.35 });
        shadow = new THREE.Mesh(groundGeometry, groundMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.set(1.0, 0.42, 1.0);
        shadow.position.y = 0.075;
        scene.add(shadow);

        currentShape = shapeFor(configRef.current.kind);
        currentColor = configRef.current.color;
        car = createCar(THREE, configRef.current.kind, currentColor);
        scene.add(car);
        resize();
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(host);
        } else {
          window.addEventListener("resize", resize);
        }
        setReady(true);

        const animate = (now: number) => {
          if (disposed) return;
          frame = window.requestAnimationFrame(animate);
          if (document.hidden || now - lastFrame < 33 || !renderer || !scene || !camera) return;
          lastFrame = now;

          const latest = configRef.current;
          const nextShape = shapeFor(latest.kind);
          if (nextShape !== currentShape) {
            if (car) {
              scene.remove(car);
              disposeTree(car);
            }
            car = createCar(THREE, latest.kind, latest.color);
            scene.add(car);
            currentShape = nextShape;
            currentColor = latest.color;
          } else if (latest.color !== currentColor && car?.userData?.paintMaterial) {
            car.userData.paintMaterial.color.set(latest.color);
            currentColor = latest.color;
          }

          if (car) car.rotation.y = -0.18 + Math.sin(now * 0.00032) * 0.12;
          renderer.render(scene, camera);
        };
        frame = window.requestAnimationFrame(animate);
      } catch (_error) {
        if (!disposed) setReady(false);
      }
    };

    void renderScene();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect?.();
      window.removeEventListener("resize", resize);
      if (scene) disposeTree(scene);
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, []);

  return (
    <View style={styles.stage}>
      {!ready && fallbackImage ? (
        <Image source={{ uri: fallbackImage }} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={180} />
      ) : null}
      <View ref={hostRef} style={styles.canvasHost} />
      {!ready && Platform.OS === "web" ? <View pointerEvents="none" style={styles.modelBadge} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    height: 238,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  canvasHost: {
    ...StyleSheet.absoluteFillObject,
  },
  modelBadge: {
    position: "absolute",
    left: 12,
    bottom: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef233c",
    opacity: 0.8,
  },
});
