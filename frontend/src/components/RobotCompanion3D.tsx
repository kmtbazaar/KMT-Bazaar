import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as THREE from "three";
import RobotAvatar from "./RobotAvatar";

type RobotCompanion3DProps = {
  size?: number;
  talking?: boolean;
  onActivate?: () => void;
  style?: StyleProp<ViewStyle>;
};

function makeRoundedPanel(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  radius = 0.07
) {
  const r = Math.min(radius, width * 0.22, height * 0.22);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + r, -height / 2);
  shape.lineTo(width / 2 - r, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r);
  shape.lineTo(width / 2, height / 2 - r);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2);
  shape.lineTo(-width / 2 + r, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r);
  shape.lineTo(-width / 2, -height / 2 + r);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 7,
  });
  geometry.center();
  const panel = new THREE.Mesh(geometry, material);
  panel.castShadow = false;
  panel.receiveShadow = false;
  return panel;
}

function buildRobot() {
  const root = new THREE.Group();
  const robot = new THREE.Group();
  root.add(robot);

  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xe7f0f6,
    metalness: 0.74,
    roughness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0x8fa7b9,
    metalness: 0.82,
    roughness: 0.3,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x101b2a,
    metalness: 0.52,
    roughness: 0.25,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x58e7ff,
    emissive: 0x10bfe8,
    emissiveIntensity: 2.1,
    metalness: 0.25,
    roughness: 0.2,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xff922e,
    emissive: 0x9b3b08,
    emissiveIntensity: 0.34,
    metalness: 0.52,
    roughness: 0.28,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x182637,
    metalness: 0.22,
    roughness: 0.72,
  });

  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number
  ) => {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = false;
    item.receiveShadow = false;
    parent.add(item);
    return item;
  };

  // Compact armored body with a bright KMT energy core.
  const torso = add(
    new THREE.CapsuleGeometry(0.265, 0.43, 6, 18),
    pearl,
    robot,
    0,
    1.04,
    0
  );
  torso.scale.set(1.02, 0.96, 0.83);

  const chest = makeRoundedPanel(0.34, 0.34, 0.06, dark, 0.075);
  chest.position.set(0, 1.08, 0.245);
  robot.add(chest);
  const chestTrim = makeRoundedPanel(0.255, 0.255, 0.025, orange, 0.055);
  chestTrim.position.set(0, 1.08, 0.292);
  robot.add(chestTrim);
  const chestCore = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 8, 30), cyan);
  chestCore.position.set(0, 1.08, 0.319);
  robot.add(chestCore);
  add(new THREE.SphereGeometry(0.035, 18, 12), cyan, robot, 0, 1.08, 0.33);

  // Oversized expressive helmet and glossy digital face.
  const head = new THREE.Group();
  head.position.set(0, 1.79, 0);
  robot.add(head);
  const helmet = add(
    new THREE.SphereGeometry(0.43, 40, 30),
    pearl,
    head,
    0,
    0,
    0
  );
  helmet.scale.set(1.04, 0.88, 0.84);

  const visor = makeRoundedPanel(0.61, 0.29, 0.055, dark, 0.085);
  visor.position.set(0, -0.015, 0.322);
  head.add(visor);

  const visorLine = makeRoundedPanel(0.42, 0.012, 0.012, silver, 0.006);
  visorLine.position.set(0, -0.118, 0.358);
  head.add(visorLine);

  const eyeGeometry = new THREE.SphereGeometry(0.052, 24, 18);
  const leftEye = add(eyeGeometry, cyan, head, -0.145, 0.018, 0.371);
  leftEye.scale.set(0.72, 1.22, 0.35);
  const rightEye = add(eyeGeometry.clone(), cyan, head, 0.145, 0.018, 0.371);
  rightEye.scale.set(0.72, 1.22, 0.35);

  const mouth = makeRoundedPanel(0.13, 0.018, 0.012, orange, 0.009);
  mouth.position.set(0, -0.083, 0.371);
  head.add(mouth);

  const antennaStem = add(
    new THREE.CylinderGeometry(0.018, 0.024, 0.17, 12),
    silver,
    head,
    0,
    0.47,
    0
  );
  antennaStem.rotation.z = -0.08;
  add(new THREE.SphereGeometry(0.055, 20, 16), orange, head, 0, 0.565, 0);
  add(
    new THREE.TorusGeometry(0.073, 0.012, 8, 24),
    cyan,
    head,
    0,
    0.565,
    0
  );

  // Side audio modules make the head read as a complete 3D helmet.
  [-1, 1].forEach((side) => {
    const ear = add(
      new THREE.CylinderGeometry(0.115, 0.115, 0.105, 28),
      silver,
      head,
      side * 0.435,
      -0.015,
      0
    );
    ear.rotation.z = Math.PI / 2;
    const earGlow = add(
      new THREE.TorusGeometry(0.068, 0.009, 8, 24),
      cyan,
      head,
      side * 0.495,
      -0.015,
      0
    );
    earGlow.rotation.y = Math.PI / 2;
    add(new THREE.SphereGeometry(0.035, 16, 12), orange, head, side * 0.505, -0.015, 0);
  });

  // Articulated arms with shoulder caps and small hands.
  const armPivots: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.31, 0);
    robot.add(arm);
    armPivots.push(arm);

    const shoulder = add(
      new THREE.SphereGeometry(0.16, 24, 18),
      pearl,
      arm,
      0,
      -0.025,
      0
    );
    shoulder.scale.set(1, 0.9, 0.92);
    add(
      new THREE.SphereGeometry(0.105, 18, 14),
      orange,
      arm,
      side * 0.035,
      -0.035,
      0.105
    );
    const upperArm = add(
      new THREE.CapsuleGeometry(0.105, 0.25, 5, 14),
      silver,
      arm,
      side * 0.025,
      -0.225,
      0
    );
    upperArm.rotation.z = side * -0.1;
    add(new THREE.SphereGeometry(0.105, 18, 14), dark, arm, 0, -0.39, 0);
    const forearm = add(
      new THREE.CapsuleGeometry(0.105, 0.22, 5, 14),
      pearl,
      arm,
      side * 0.035,
      -0.54,
      0.025
    );
    forearm.rotation.z = side * 0.07;
    add(
      new THREE.SphereGeometry(0.105, 18, 14),
      rubber,
      arm,
      side * 0.035,
      -0.72,
      0.055
    );
  });

  // Short armored legs and grounded boots.
  const legPivots: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.155, 0.69, 0);
    robot.add(leg);
    legPivots.push(leg);
    add(
      new THREE.SphereGeometry(0.12, 20, 16),
      dark,
      leg,
      0,
      -0.04,
      0
    );
    add(
      new THREE.CapsuleGeometry(0.12, 0.31, 5, 14),
      silver,
      leg,
      0,
      -0.22,
      0
    );
    const boot = add(
      new THREE.BoxGeometry(0.27, 0.17, 0.38),
      rubber,
      leg,
      0,
      -0.46,
      0.085
    );
    boot.rotation.x = -0.06;
    const toe = makeRoundedPanel(0.19, 0.055, 0.018, orange, 0.025);
    toe.position.set(0, -0.47, 0.279);
    leg.add(toe);
  });

  // Floating service-platform ring and a soft contact shadow.
  const floorShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 48),
    new THREE.MeshBasicMaterial({
      color: 0x071a2b,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.y = 0.025;
  robot.add(floorShadow);

  const platform = new THREE.Mesh(
    new THREE.TorusGeometry(0.49, 0.018, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x29d8f2,
      emissive: 0x078ca8,
      emissiveIntensity: 0.7,
      metalness: 0.65,
      roughness: 0.28,
    })
  );
  platform.rotation.x = Math.PI / 2;
  platform.position.y = 0.065;
  robot.add(platform);

  root.userData = { robot, head, armPivots, legPivots, leftEye, rightEye, mouth, chestCore };
  return { root, materials: [pearl, silver, dark, cyan, orange, rubber] };
}

export default function RobotCompanion3D({
  size = 108,
  talking = false,
  onActivate,
  style,
}: RobotCompanion3DProps) {
  const hostRef = useRef<any>(null);
  const activateRef = useRef(onActivate);
  const talkingRef = useRef(talking);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    talkingRef.current = talking;
  }, [talking]);

  useEffect(() => {
    if (Platform.OS !== "web" || webglFailed) return;

    const host = hostRef.current as HTMLElement | null;
    if (!host || typeof window === "undefined") return;

    let renderer: THREE.WebGLRenderer | null = null;
    let frameId = 0;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 30);
      camera.position.set(0, 1.25, 5.25);
      camera.lookAt(0, 1.23, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.outline = "none";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.setAttribute("role", "button");
      renderer.domElement.setAttribute("aria-label", "KMT Bazaar 3D robot assistant. Drag to rotate or tap to open the assistant.");
      renderer.domElement.tabIndex = 0;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xd9f6ff, 0x172337, 2.0));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
      keyLight.position.set(-3, 4, 5);
      scene.add(keyLight);
      const cyanLight = new THREE.PointLight(0x27dfff, 2.8, 5);
      cyanLight.position.set(2.2, 1.8, 2.3);
      scene.add(cyanLight);
      const warmLight = new THREE.PointLight(0xffa24a, 1.6, 4);
      warmLight.position.set(-2.1, 0.75, 1.2);
      scene.add(warmLight);

      const built = buildRobot();
      const root = built.root;
      const state = root.userData;
      scene.add(root);

      let targetYaw = -0.14;
      let targetPitch = 0;
      let pointerId: number | null = null;
      let startX = 0;
      let startY = 0;
      let previousX = 0;
      let previousY = 0;
      let moved = 0;

      const onPointerDown = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        pointerId = event.pointerId;
        startX = previousX = event.clientX;
        startY = previousY = event.clientY;
        moved = 0;
        renderer!.domElement.style.cursor = "grabbing";
        try { renderer!.domElement.setPointerCapture(event.pointerId); } catch {}
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const dx = event.clientX - previousX;
        const dy = event.clientY - previousY;
        moved = Math.max(moved, Math.hypot(event.clientX - startX, event.clientY - startY));
        targetYaw += dx * 0.012;
        targetPitch = THREE.MathUtils.clamp(targetPitch + dy * 0.008, -0.22, 0.22);
        previousX = event.clientX;
        previousY = event.clientY;
      };

      const onPointerUp = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        pointerId = null;
        renderer!.domElement.style.cursor = "grab";
        if (moved < 8) activateRef.current?.();
      };

      const onPointerCancel = (event: PointerEvent) => {
        if (pointerId === event.pointerId) pointerId = null;
        renderer!.domElement.style.cursor = "grab";
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateRef.current?.();
        } else if (event.key === "ArrowLeft") {
          targetYaw -= 0.22;
        } else if (event.key === "ArrowRight") {
          targetYaw += 0.22;
        }
      };

      const canvas = renderer.domElement;
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerCancel);
      canvas.addEventListener("keydown", onKeyDown);

      const resize = () => {
        if (!renderer || disposed) return;
        const width = Math.max(1, host.clientWidth || size);
        const height = Math.max(1, host.clientHeight || size * 1.22);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
      } else {
        window.addEventListener("resize", resize);
      }
      resize();

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed || !renderer) return;
        frameId = window.requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const robot = state.robot as THREE.Group;
        const head = state.head as THREE.Group;
        const arms = state.armPivots as THREE.Group[];
        const legs = state.legPivots as THREE.Group[];
        robot.position.y = Math.sin(elapsed * 2.1) * 0.035;
        robot.rotation.y += (targetYaw + Math.sin(elapsed * 0.42) * 0.035 - robot.rotation.y) * 0.075;
        robot.rotation.x += (targetPitch - robot.rotation.x) * 0.12;
        head.rotation.y = Math.sin(elapsed * 1.15) * 0.075;
        head.rotation.x = Math.sin(elapsed * 1.6) * 0.025;
        arms[0].rotation.z = -0.08 + Math.sin(elapsed * 2.0) * 0.035;
        arms[1].rotation.z = 0.08 - Math.sin(elapsed * 2.0) * 0.035;
        legs[0].rotation.x = Math.sin(elapsed * 1.6) * 0.025;
        legs[1].rotation.x = -Math.sin(elapsed * 1.6) * 0.025;

        const glow = talkingRef.current
          ? 1.7 + Math.sin(elapsed * 12) * 0.45
          : 1.75 + Math.sin(elapsed * 2.3) * 0.24;
        const eyes = [state.leftEye, state.rightEye] as THREE.Mesh[];
        eyes.forEach((eye) => {
          (eye.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
        });
        (state.chestCore as THREE.Mesh).rotation.z = elapsed * 0.34;
        (state.mouth as THREE.Mesh).scale.x = talkingRef.current
          ? 0.82 + Math.abs(Math.sin(elapsed * 11)) * 0.55
          : 1;
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        disposed = true;
        window.cancelAnimationFrame(frameId);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerCancel);
        canvas.removeEventListener("keydown", onKeyDown);
        built.materials.forEach((material) => material.dispose());
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        renderer?.dispose();
        if (canvas.parentElement === host) host.removeChild(canvas);
      };
    } catch {
      renderer?.dispose();
      setWebglFailed(true);
    }
  }, [size, webglFailed]);

  if (Platform.OS !== "web" || webglFailed) {
    return (
      <Pressable
        onPress={onActivate}
        accessibilityRole="button"
        accessibilityLabel="Open KMT Bazaar AI assistant"
        testID="login-ai-assistant"
        style={[styles.fallback, { width: size, height: size }, style]}
      >
        <RobotAvatar size={Math.round(size * 0.82)} talking={talking} showOrbit />
      </Pressable>
    );
  }

  return (
    <View
      ref={hostRef}
      testID="login-ai-assistant"
      accessibilityRole="button"
      accessibilityLabel="KMT Bazaar 3D robot assistant. Drag to rotate or tap to open."
      style={[styles.stage, { width: size, height: Math.round(size * 1.22) }, style]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "visible",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
