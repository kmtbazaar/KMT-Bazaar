import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");
const COLORS = ["#20BFFF", "#087BFF", "#F59E0B", "#FFD166", "#FFFFFF"];

export default function ParticleLogo() {
  const reveal = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 58 }, (_, i) => {
      const angle = (i / 58) * Math.PI * 2;
      const ring = i % 3 === 0 ? 0.42 : i % 3 === 1 ? 0.72 : 1;
      return {
        id: i,
        x: width / 2 + Math.cos(angle) * width * 0.31 * ring,
        y: height / 2 + Math.sin(angle) * 112 * ring,
        dx: Math.cos(angle + 0.7) * (65 + (i % 5) * 25),
        dy: Math.sin(angle + 0.7) * (65 + (i % 4) * 24),
        color: COLORS[i % COLORS.length],
        size: i % 7 === 0 ? 5 : i % 3 === 0 ? 3.5 : 2.5,
        progress: new Animated.Value(0),
        delay: (i % 12) * 38,
      };
    })
  ).current;

  useEffect(() => {
    const animations = particles.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration: 1050,
        delay: p.delay,
        useNativeDriver: true,
      })
    );
    Animated.parallel([
      Animated.stagger(12, animations),
      Animated.sequence([
        Animated.delay(620),
        Animated.spring(reveal, { toValue: 1, speed: 1.1, bounciness: 5, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: p.size,
              backgroundColor: p.color,
              opacity: p.progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0.82] }),
              transform: [
                { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [p.dx, 0] }) },
                { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [p.dy, 0] }) },
                { scale: p.progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 1.5, 1] }) },
              ],
            },
          ]}
        />
      ))}
      <Animated.Image
        source={require("../../assets/images/splash-icon.png")}
        resizeMode="contain"
        style={[
          styles.logo,
          {
            opacity: reveal,
            transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#000000", overflow: "hidden" },
  logo: { width: 220, height: 220, zIndex: 2 },
  particle: { position: "absolute", zIndex: 1, shadowColor: "#38BDF8", shadowOpacity: 0.9, shadowRadius: 7, elevation: 5 },
});
