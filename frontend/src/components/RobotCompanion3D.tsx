import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as THREE from "three";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import RobotAvatar from "./RobotAvatar";

type RobotCompanion3DProps = {
  size?: number;
  talking?: boolean;
  onActivate?: () => void;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  idleGesture?: boolean;
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
    color: 0xf5f9ff,
    metalness: 0.74,
    roughness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0xa7bfce,
    metalness: 0.82,
    roughness: 0.3,
  });
  const redArmor = new THREE.MeshPhysicalMaterial({
    color: 0xd92732,
    metalness: 0.38,
    roughness: 0.28,
    clearcoat: 0.82,
    clearcoatRoughness: 0.2,
  });
  const shirtWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fbff,
    metalness: 0.12,
    roughness: 0.48,
  });
  const sneakerWhite = new THREE.MeshPhysicalMaterial({
    color: 0xf4f7fa,
    metalness: 0.28,
    roughness: 0.34,
    clearcoat: 0.45,
  });
  const sneakerRed = new THREE.MeshPhysicalMaterial({
    color: 0xe11d2e,
    metalness: 0.35,
    roughness: 0.3,
    clearcoat: 0.8,
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

  // Two glossy red jacket shells frame the white shirt like the supplied boy mascot.
  const jacketLeft = makeRoundedPanel(0.18, 0.43, 0.055, redArmor, 0.045);
  jacketLeft.position.set(-0.145, 1.05, 0.245);
  jacketLeft.rotation.z = -0.045;
  robot.add(jacketLeft);
  const jacketRight = makeRoundedPanel(0.18, 0.43, 0.055, redArmor, 0.045);
  jacketRight.position.set(0.145, 1.05, 0.245);
  jacketRight.rotation.z = 0.045;
  robot.add(jacketRight);
  const shirt = makeRoundedPanel(0.16, 0.34, 0.025, shirtWhite, 0.035);
  shirt.position.set(0, 1.03, 0.28);
  robot.add(shirt);
  const hoodieCollar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 10, 32), redArmor);
  hoodieCollar.rotation.x = Math.PI / 2;
  hoodieCollar.position.set(0, 1.43, 0.02);
  robot.add(hoodieCollar);
  const zipper = makeRoundedPanel(0.018, 0.35, 0.014, silver, 0.008);
  zipper.position.set(0, 1.055, 0.31);
  robot.add(zipper);

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
  helmet.scale.set(1.08, 0.94, 0.91);

  // A friendly, youthful boy face sits inside the robot's open helmet.
  const faceSkin = new THREE.MeshPhysicalMaterial({
    color: 0xe7b58f,
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  });
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: 0x30201b,
    roughness: 0.78,
    metalness: 0.02,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xfffdf7,
    roughness: 0.28,
  });
  const irisMaterial = new THREE.MeshStandardMaterial({
    color: 0x754321,
    emissive: 0x160b05,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.08,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: 0x101b2a,
    roughness: 0.2,
  });
  const browMaterial = new THREE.MeshStandardMaterial({
    color: 0x422a23,
    roughness: 0.75,
  });
  const cheekMaterial = new THREE.MeshStandardMaterial({
    color: 0xe77f88,
    transparent: true,
    opacity: 0.46,
    roughness: 0.7,
  });
  const smileMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a4b50,
    roughness: 0.62,
  });

  const face = add(
    new THREE.SphereGeometry(0.30, 40, 30),
    faceSkin,
    head,
    0,
    -0.035,
    0.345
  );
  face.scale.set(0.95, 1.08, 0.38);

  // Soft dark hair with a swept fringe and small side locks.
  const hairCapGeometry = new THREE.SphereGeometry(
    0.345, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.55
  );
  const hairCap = add(hairCapGeometry, hairMaterial, head, 0, 0.18, 0.315);
  hairCap.scale.set(1.0, 0.86, 0.92);
  const fringeOne = add(
    new THREE.SphereGeometry(0.12, 24, 18),
    hairMaterial,
    head,
    -0.13,
    0.205,
    0.465
  );
  fringeOne.scale.set(1.1, 0.48, 0.36);
  const fringeTwo = add(
    new THREE.SphereGeometry(0.105, 24, 18),
    hairMaterial,
    head,
    0.005,
    0.23,
    0.472
  );
  fringeTwo.scale.set(1.05, 0.5, 0.36);
  const fringeThree = add(
    new THREE.SphereGeometry(0.09, 24, 18),
    hairMaterial,
    head,
    0.13,
    0.18,
    0.455
  );
  fringeThree.scale.set(1.05, 0.52, 0.38);

  // A soft curved forelock gives the mascot a playful, recognizable silhouette.
  const hairSweepCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.27, 0.435),
    new THREE.Vector3(-0.12, 0.355, 0.455),
    new THREE.Vector3(-0.015, 0.385, 0.458),
    new THREE.Vector3(0.09, 0.345, 0.45),
    new THREE.Vector3(0.16, 0.275, 0.43),
  ]);
  add(new THREE.TubeGeometry(hairSweepCurve, 22, 0.038, 10, false), hairMaterial, head, 0, 0, 0);

  // Keep the complete eye details together for natural blinking.
  const eyeWhites: THREE.Mesh[] = [];
  const eyePupils: THREE.Mesh[] = [];
  const eyeHighlights: THREE.Mesh[] = [];

  // Ears, expressive brows, white eyes and bright blue irises.
  [-1, 1].forEach((side) => {
    const humanEar = add(
      new THREE.SphereGeometry(0.075, 20, 16),
      faceSkin,
      head,
      side * 0.265,
      -0.035,
      0.325
    );
    humanEar.scale.set(0.52, 0.82, 0.5);

    const brow = makeRoundedPanel(0.115, 0.022, 0.012, browMaterial, 0.01);
    brow.position.set(side * 0.125, 0.112, 0.489);
    brow.rotation.z = side * -0.1;
    head.add(brow);

    const white = add(
      new THREE.SphereGeometry(0.073, 24, 18),
      eyeWhite,
      head,
      side * 0.125,
      0.025,
      0.466
    );
    white.scale.set(0.92, 1.12, 0.42);
    eyeWhites.push(white);
  });

  const leftEye = add(
    new THREE.SphereGeometry(0.041, 24, 18),
    irisMaterial,
    head,
    -0.125,
    0.022,
    0.507
  );
  leftEye.scale.set(0.9, 1.05, 0.42);
  const leftEyeRing = add(
    new THREE.TorusGeometry(0.055, 0.006, 6, 24),
    cyan,
    head,
    -0.125,
    0.022,
    0.512
  );
  const rightEye = add(
    new THREE.SphereGeometry(0.041, 24, 18),
    irisMaterial,
    head,
    0.125,
    0.022,
    0.507
  );
  rightEye.scale.set(0.9, 1.05, 0.42);
  const rightEyeRing = add(
    new THREE.TorusGeometry(0.055, 0.006, 6, 24),
    cyan,
    head,
    0.125,
    0.022,
    0.512
  );
  [-1, 1].forEach((side) => {
    const pupil = add(
      new THREE.SphereGeometry(0.018, 18, 14),
      pupilMaterial,
      head,
      side * 0.125,
      0.02,
      0.524
    );
    eyePupils.push(pupil);
    const eyeHighlight = add(
      new THREE.SphereGeometry(0.008, 12, 10),
      eyeWhite,
      head,
      side * 0.137,
      0.04,
      0.532
    );
    eyeHighlights.push(eyeHighlight);
    const cheek = add(
      new THREE.SphereGeometry(0.047, 18, 12),
      cheekMaterial,
      head,
      side * 0.195,
      -0.075,
      0.448
    );
    cheek.scale.set(1.0, 0.48, 0.22);
  });

  // Tiny cheek freckles add a little personality without cluttering the face.
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((dot) => {
      const freckle = add(
        new THREE.SphereGeometry(0.008, 12, 10),
        cheekMaterial,
        head,
        side * (0.19 + dot * 0.018),
        -0.082 + dot * 0.012,
        0.467
      );
      freckle.scale.set(1.15, 0.8, 0.55);
    });
  });

  const nose = add(
    new THREE.SphereGeometry(0.031, 20, 14),
    faceSkin,
    head,
    0,
    -0.047,
    0.495
  );
  nose.scale.set(0.72, 0.88, 0.7);

  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.065, -0.135, 0.478),
    new THREE.Vector3(-0.032, -0.16, 0.49),
    new THREE.Vector3(0, -0.166, 0.493),
    new THREE.Vector3(0.032, -0.16, 0.49),
    new THREE.Vector3(0.065, -0.135, 0.478),
  ]);
  const mouth = add(
    new THREE.TubeGeometry(smileCurve, 16, 0.009, 8, false),
    smileMaterial,
    head,
    0,
    0,
    0
  );

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

  // Articulated arms with jacket shoulders, silver forearms and jointed robot fingers.
  const armPivots: THREE.Group[] = [];
  const handPivots: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.31, 0);
    robot.add(arm);
    armPivots.push(arm);

    const shoulder = add(
      new THREE.SphereGeometry(0.16, 24, 18),
      redArmor,
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
      redArmor,
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
    const cuff = add(
      new THREE.TorusGeometry(0.105, 0.014, 8, 24),
      sneakerWhite,
      arm,
      side * 0.035,
      -0.655,
      0.045
    );
    cuff.rotation.x = Math.PI / 2;

    const hand = new THREE.Group();
    hand.position.set(side * 0.035, -0.72, 0.055);
    arm.add(hand);
    const palm = add(
      new THREE.SphereGeometry(0.092, 20, 16),
      silver,
      hand,
      0,
      0,
      0
    );
    palm.scale.set(0.92, 1.08, 0.78);
    [-1, 0, 1].forEach((fingerIndex) => {
      const finger = add(
        new THREE.CapsuleGeometry(0.022, 0.07, 4, 8),
        pearl,
        hand,
        fingerIndex * 0.043,
        -0.092,
        0.01
      );
      finger.rotation.z = fingerIndex * -0.1;
    });
    const thumb = add(
      new THREE.CapsuleGeometry(0.024, 0.065, 4, 8),
      silver,
      hand,
      side * 0.084,
      -0.005,
      0.018
    );
    thumb.rotation.z = side * -0.72;
    arm.userData.hand = hand;
    handPivots.push(hand);
  });

  // Dark cargo-style robot trousers with red and white sneaker-inspired feet.
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
      dark,
      leg,
      0,
      -0.22,
      0
    );
    const kneeGuard = makeRoundedPanel(0.15, 0.105, 0.028, silver, 0.035);
    kneeGuard.position.set(0, -0.22, 0.115);
    leg.add(kneeGuard);
    const boot = add(
      new THREE.BoxGeometry(0.27, 0.17, 0.38),
      sneakerWhite,
      leg,
      0,
      -0.46,
      0.085
    );
    boot.rotation.x = -0.06;
    const sole = add(
      new THREE.BoxGeometry(0.285, 0.045, 0.395),
      rubber,
      leg,
      0,
      -0.545,
      0.085
    );
    sole.rotation.x = -0.06;
    const toe = makeRoundedPanel(0.205, 0.095, 0.03, sneakerRed, 0.04);
    toe.position.set(0, -0.435, 0.235);
    toe.rotation.x = -0.05;
    leg.add(toe);
    const sneakerStripe = makeRoundedPanel(0.12, 0.025, 0.018, sneakerWhite, 0.01);
    sneakerStripe.position.set(0, -0.39, 0.259);
    leg.add(sneakerStripe);
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

  root.userData = { robot, head, armPivots, handPivots, legPivots, leftEye, rightEye, eyeWhites, eyeIrises: [leftEye, rightEye], eyePupils, eyeHighlights, mouth, chestCore, eyeRings: [leftEyeRing, rightEyeRing] };
  return { root, materials: [pearl, silver, redArmor, shirtWhite, sneakerWhite, sneakerRed, dark, cyan, orange, rubber, faceSkin, hairMaterial, eyeWhite, irisMaterial, pupilMaterial, browMaterial, cheekMaterial, smileMaterial] };
}

export default function RobotCompanion3D({
  size = 108,
  talking = false,
  onActivate,
  style,
  interactive = true,
  idleGesture = false,
}: RobotCompanion3DProps) {
  const hostRef = useRef<any>(null);
  const activateRef = useRef(onActivate);
  const talkingRef = useRef(talking);
  const idleGestureRef = useRef(idleGesture);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    talkingRef.current = talking;
  }, [talking]);

  useEffect(() => {
    idleGestureRef.current = idleGesture;
  }, [idleGesture]);

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
      renderer.domElement.style.pointerEvents = interactive ? "auto" : "none";
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
      let greetingUntil = 0;
      let activationTimeout: number | null = null;

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
        if (moved < 8) {
          greetingUntil = performance.now() + 850;
          if (activationTimeout !== null) window.clearTimeout(activationTimeout);
          activationTimeout = window.setTimeout(() => activateRef.current?.(), 320);
        }
      };

      const onPointerCancel = (event: PointerEvent) => {
        if (pointerId === event.pointerId) pointerId = null;
        renderer!.domElement.style.cursor = "grab";
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          greetingUntil = performance.now() + 850;
          if (activationTimeout !== null) window.clearTimeout(activationTimeout);
          activationTimeout = window.setTimeout(() => activateRef.current?.(), 320);
        } else if (event.key === "ArrowLeft") {
          targetYaw -= 0.22;
        } else if (event.key === "ArrowRight") {
          targetYaw += 0.22;
        }
      };

      const canvas = renderer.domElement;
      if (interactive) {
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerCancel);
        canvas.addEventListener("keydown", onKeyDown);
      }

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
        const greeting = performance.now() < greetingUntil;
        robot.position.y = Math.sin(elapsed * 2.1) * 0.035 + (greeting ? Math.abs(Math.sin(elapsed * 10)) * 0.035 : 0);
        robot.rotation.y += (targetYaw + Math.sin(elapsed * 0.42) * 0.035 - robot.rotation.y) * 0.075;
        robot.rotation.x += (targetPitch - robot.rotation.x) * 0.12;
        head.rotation.y = Math.sin(elapsed * 1.15) * 0.075;
        head.rotation.x = greeting
          ? -0.17 + Math.sin(elapsed * 9) * 0.055
          : Math.sin(elapsed * 1.6) * 0.025;
        const wavePhase = elapsed % 8.2;
        const idleWave = idleGestureRef.current && wavePhase > 5.3 && wavePhase < 7.25;
        arms[0].rotation.z = -0.08 + Math.sin(elapsed * 2.0) * 0.035 +
          (idleWave ? Math.sin(elapsed * 4.5) * 0.1 : 0);
        arms[1].rotation.z = greeting
          ? 2.2 + Math.sin(elapsed * 14) * 0.24
          : idleWave
            ? 1.75 + Math.sin(elapsed * 12) * 0.22
            : 0.08 - Math.sin(elapsed * 2.0) * 0.035;
        const hands = state.handPivots as THREE.Group[];
        hands[1].rotation.x = (greeting || idleWave) ? Math.sin(elapsed * 12) * 0.28 : 0;
        hands[1].rotation.z = (greeting || idleWave) ? Math.sin(elapsed * 12) * 0.14 : 0;
        hands[0].rotation.z = idleWave ? Math.sin(elapsed * 3.2) * 0.08 : 0;
        legs[0].rotation.x = Math.sin(elapsed * 1.6) * 0.025;
        legs[1].rotation.x = -Math.sin(elapsed * 1.6) * 0.025;

        const glow = talkingRef.current
          ? 1.7 + Math.sin(elapsed * 12) * 0.45
          : 1.75 + Math.sin(elapsed * 2.3) * 0.24;
        const blinkPhase = elapsed % 5.1;
        const blink = blinkPhase > 4.82 && blinkPhase < 4.96 ? 0.08 : 1;
        (state.eyeWhites as THREE.Mesh[]).forEach((eye) => {
          eye.scale.y = 1.12 * blink;
        });
        const eyes = state.eyeIrises as THREE.Mesh[];
        eyes.forEach((eye) => {
          eye.scale.y = 1.05 * blink;
          (eye.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
        });
        (state.eyePupils as THREE.Mesh[]).forEach((pupil) => {
          pupil.scale.y = blink;
        });
        (state.eyeHighlights as THREE.Mesh[]).forEach((highlight) => {
          highlight.scale.y = blink;
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
        if (activationTimeout !== null) window.clearTimeout(activationTimeout);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", resize);
        if (interactive) {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerCancel);
          canvas.removeEventListener("keydown", onKeyDown);
        }
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
  }, [size, webglFailed, interactive]);

  if (Platform.OS === "web") {
    if (webglFailed) {
      return (
        <Pressable
          onPress={interactive ? onActivate : undefined}
          accessibilityRole="button"
          accessibilityLabel="Open KMT Bazaar AI assistant"
          testID="login-ai-assistant"
          pointerEvents={interactive ? "auto" : "none"}
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

  return (
    <NativeRobotStage
      size={size}
      talking={talking}
      onActivate={onActivate}
      interactive={interactive}
      idleGesture={idleGesture}
      style={style}
    />
  );
}


type NativeRobotResources = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  frameId: number;
  built: ReturnType<typeof buildRobot>;
};

type NativeRobotStageProps = {
  size: number;
  talking: boolean;
  onActivate?: () => void;
  interactive: boolean;
  idleGesture: boolean;
  style?: StyleProp<ViewStyle>;
};

function NativeRobotStage({
  size,
  talking,
  onActivate,
  interactive,
  idleGesture,
  style,
}: NativeRobotStageProps) {
  const [failed, setFailed] = useState(false);
  const resourcesRef = useRef<NativeRobotResources | null>(null);
  const activateRef = useRef(onActivate);
  const talkingRef = useRef(talking);
  const idleGestureRef = useRef(idleGesture);
  const greetingUntilRef = useRef(0);
  const activationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef({
    yaw: -0.14,
    pitch: 0,
    startYaw: -0.14,
    startPitch: 0,
  });

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    talkingRef.current = talking;
  }, [talking]);

  useEffect(() => {
    idleGestureRef.current = idleGesture;
  }, [idleGesture]);

  useEffect(() => () => {
    const resources = resourcesRef.current;
    if (!resources) return;
    cancelAnimationFrame(resources.frameId);
    if (activationTimeoutRef.current) clearTimeout(activationTimeoutRef.current);
    resources.built.materials.forEach((material) => material.dispose());
    resources.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    resources.renderer.dispose();
    resourcesRef.current = null;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          interactive && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
        onPanResponderGrant: () => {
          controlsRef.current.startYaw = controlsRef.current.yaw;
          controlsRef.current.startPitch = controlsRef.current.pitch;
        },
        onPanResponderMove: (_event, gesture) => {
          controlsRef.current.yaw = controlsRef.current.startYaw + gesture.dx * 0.012;
          controlsRef.current.pitch = THREE.MathUtils.clamp(
            controlsRef.current.startPitch + gesture.dy * 0.008,
            -0.22,
            0.22
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (Math.hypot(gesture.dx, gesture.dy) < 8) {
            greetingUntilRef.current = performance.now() + 850;
            if (activationTimeoutRef.current) clearTimeout(activationTimeoutRef.current);
            activationTimeoutRef.current = setTimeout(() => activateRef.current?.(), 320);
          }
        },
        onPanResponderTerminate: () => undefined,
      }),
    [interactive]
  );

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      const width = Math.max(1, gl.drawingBufferWidth || size);
      const height = Math.max(1, gl.drawingBufferHeight || Math.round(size * 1.22));
      // Three.js expects a browser-like canvas; Expo GL supplies the actual native context.
      const nativeCanvas = {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({
        canvas: nativeCanvas as unknown as HTMLCanvasElement,
        context: gl as unknown as WebGLRenderingContext,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(29, width / height, 0.1, 30);
      camera.position.set(0, 1.25, 5.25);
      camera.lookAt(0, 1.23, 0);
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
      scene.add(built.root);
      const state = built.root.userData;
      const clock = new THREE.Clock();

      const animate = () => {
        const elapsed = clock.getElapsedTime();
        const robot = state.robot as THREE.Group;
        const head = state.head as THREE.Group;
        const arms = state.armPivots as THREE.Group[];
        const legs = state.legPivots as THREE.Group[];
        const greeting = performance.now() < greetingUntilRef.current;
        robot.position.y = Math.sin(elapsed * 2.1) * 0.035 + (greeting ? Math.abs(Math.sin(elapsed * 10)) * 0.035 : 0);
        robot.rotation.y += (
          controlsRef.current.yaw +
          Math.sin(elapsed * 0.42) * 0.035 -
          robot.rotation.y
        ) * 0.075;
        robot.rotation.x += (controlsRef.current.pitch - robot.rotation.x) * 0.12;
        head.rotation.y = Math.sin(elapsed * 1.15) * 0.075;
        head.rotation.x = greeting
          ? -0.17 + Math.sin(elapsed * 9) * 0.055
          : Math.sin(elapsed * 1.6) * 0.025;
        const wavePhase = elapsed % 8.2;
        const idleWave = idleGestureRef.current && wavePhase > 5.3 && wavePhase < 7.25;
        arms[0].rotation.z = -0.08 + Math.sin(elapsed * 2.0) * 0.035 +
          (idleWave ? Math.sin(elapsed * 4.5) * 0.1 : 0);
        arms[1].rotation.z = greeting
          ? 2.2 + Math.sin(elapsed * 14) * 0.24
          : idleWave
            ? 1.75 + Math.sin(elapsed * 12) * 0.22
            : 0.08 - Math.sin(elapsed * 2.0) * 0.035;
        const hands = state.handPivots as THREE.Group[];
        hands[1].rotation.x = (greeting || idleWave) ? Math.sin(elapsed * 12) * 0.28 : 0;
        hands[1].rotation.z = (greeting || idleWave) ? Math.sin(elapsed * 12) * 0.14 : 0;
        hands[0].rotation.z = idleWave ? Math.sin(elapsed * 3.2) * 0.08 : 0;
        legs[0].rotation.x = Math.sin(elapsed * 1.6) * 0.025;
        legs[1].rotation.x = -Math.sin(elapsed * 1.6) * 0.025;

        const glow = talkingRef.current
          ? 1.7 + Math.sin(elapsed * 12) * 0.45
          : 1.75 + Math.sin(elapsed * 2.3) * 0.24;
        const blinkPhase = elapsed % 5.1;
        const blink = blinkPhase > 4.82 && blinkPhase < 4.96 ? 0.08 : 1;
        (state.eyeWhites as THREE.Mesh[]).forEach((eye) => {
          eye.scale.y = 1.12 * blink;
        });
        (state.eyeIrises as THREE.Mesh[]).forEach((eye) => {
          eye.scale.y = 1.05 * blink;
          (eye.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
        });
        (state.eyePupils as THREE.Mesh[]).forEach((pupil) => {
          pupil.scale.y = blink;
        });
        (state.eyeHighlights as THREE.Mesh[]).forEach((highlight) => {
          highlight.scale.y = blink;
        });
        (state.chestCore as THREE.Mesh).rotation.z = elapsed * 0.34;
        (state.mouth as THREE.Mesh).scale.x = talkingRef.current
          ? 0.82 + Math.abs(Math.sin(elapsed * 11)) * 0.55
          : 1;
        renderer.render(scene, camera);
        gl.endFrameEXP();

        const current = resourcesRef.current;
        if (current) current.frameId = requestAnimationFrame(animate);
      };

      resourcesRef.current = {
        renderer,
        scene,
        frameId: requestAnimationFrame(animate),
        built,
      };
    } catch {
      setFailed(true);
    }
  }, [size]);

  if (failed) {
    return (
      <Pressable
        onPress={interactive ? onActivate : undefined}
        pointerEvents={interactive ? "auto" : "none"}
        accessibilityRole="button"
        accessibilityLabel="Open KMT Bazaar AI assistant"
        style={[styles.fallback, { width: size, height: Math.round(size * 1.22) }, style]}
      >
        <RobotAvatar size={Math.round(size * 0.82)} talking={talking} showOrbit />
      </Pressable>
    );
  }

  return (
    <View
      {...(interactive ? panResponder.panHandlers : {})}
      pointerEvents={interactive ? "auto" : "none"}
      accessibilityRole="button"
      accessibilityLabel="KMT Bazaar 3D robot assistant. Drag to rotate or tap to open."
      testID="kmt-robot-3d-native"
      style={[styles.stage, { width: size, height: Math.round(size * 1.22) }, style]}
    >
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
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
