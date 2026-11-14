import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RobotCompanion3D from "./RobotCompanion3D";

type HomeRobotCompanionProps = {
  onActivate: () => void;
  size?: number;
};

export default function HomeRobotCompanion({
  onActivate,
  size = 122,
}: HomeRobotCompanionProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offset = useRef({ x: 0, y: 0 });
  const activateRef = useRef(onActivate);
  const [hasMoved, setHasMoved] = useState(false);
  const height = Math.round(size * 1.22);

  useEffect(() => {
    activateRef.current = onActivate;
  }, [onActivate]);

  const clampPosition = useCallback((x: number, y: number) => {
    const minX = -Math.max(0, windowWidth - size - 20);
    const minY = -Math.max(0, windowHeight - height - 116);
    return {
      x: Math.max(minX, Math.min(0, x)),
      y: Math.max(minY, Math.min(0, y)),
    };
  }, [height, size, windowHeight, windowWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
        onPanResponderGrant: () => {
          translate.setValue(offset.current);
        },
        onPanResponderMove: (_event, gesture) => {
          translate.setValue(clampPosition(
            offset.current.x + gesture.dx,
            offset.current.y + gesture.dy
          ));
        },
        onPanResponderRelease: (_event, gesture) => {
          const next = clampPosition(
            offset.current.x + gesture.dx,
            offset.current.y + gesture.dy
          );
          offset.current = next;
          translate.setValue(next);
          if (Math.hypot(gesture.dx, gesture.dy) < 8) {
            activateRef.current();
          } else {
            setHasMoved(Math.abs(next.x) > 8 || Math.abs(next.y) > 8);
          }
        },
        onPanResponderTerminate: () => {
          translate.setValue(offset.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [clampPosition, translate]
  );

  const returnToDock = () => {
    offset.current = { x: 0, y: 0 };
    Animated.spring(translate, {
      toValue: { x: 0, y: 0 },
      damping: 16,
      stiffness: 150,
      useNativeDriver: false,
    }).start();
    setHasMoved(false);
  };

  return (
    <Animated.View
      testID="home-robot-companion"
      accessible
      accessibilityRole="button"
      accessibilityLabel="KMT Bazaar robot assistant. Drag to move it or tap to open the assistant."
      style={[
        styles.anchor,
        {
          width: size + 18,
          height: height + 12,
          right: 3,
          bottom: 88,
          transform: [
            { translateX: translate.x },
            { translateY: translate.y },
          ],
        },
      ]}
    >
      <View pointerEvents="none" style={styles.aura} />
      <View
        {...panResponder.panHandlers}
        testID="home-robot-drag-area"
        style={[styles.dragArea, { width: size, height }]}
      >
        <RobotCompanion3D
          size={size}
          interactive={false}
          idleGesture
        />
      </View>
      {hasMoved && (
        <Pressable
          onPress={returnToDock}
          accessibilityRole="button"
          accessibilityLabel="Return robot to Assistant tab"
          testID="home-robot-return-to-dock"
          style={styles.dockButton}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    zIndex: 200,
    elevation: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  aura: {
    position: "absolute",
    width: 108,
    height: 128,
    top: 20,
    borderRadius: 64,
    backgroundColor: "rgba(34,211,238,0.10)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
  },
  dragArea: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dockButton: {
    position: "absolute",
    top: 3,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E7490",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 5,
    elevation: 8,
  },
});
