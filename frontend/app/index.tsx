import { useEffect, useState, useRef } from "react";
import { View, Image, Animated, PanResponder, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";

// 1. PNG ki jagah ab hum apni GIF file import kar rahe hain
import AssistantGif from "../assets/images/assistant.gif"; 

export default function Index() {
  // State to manage splash vs assistant view
  const [showAssistant, setShowAssistant] = useState(false);

  // --- Swiping & Animation Logic (Same as before) ---
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x }], 
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        // Smoothly bring back to center
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
    })
  ).current;

  // 3D Rotation effect based on swipe
  const rotateY = pan.x.interpolate({
    inputRange: [-200, 200],
    outputRange: ["-45deg", "45deg"],
  });

  useEffect(() => {
    // 3 second timer for the initial black splash screen
    const timer = setTimeout(() => {
      setShowAssistant(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // --- VIEW 2: INTERACTIVE ASSISTANT SCREEN (After 3 seconds) ---
  if (showAssistant) {
    return (
      <SafeAreaView style={styles.assistantContainer}>
        {/* Header Text */}
        <View style={styles.headerText}>
          <Text style={styles.title}>KMT Bazaar Assistant</Text>
          <Text style={styles.subtitle}>[ KMT - Bazaar [ASSISTANT] ] गाॅव को शहर बनाते हैं </Text>
        </View>

        {/* Swipe Area with the Animated GIF */}
        <View style={styles.characterSwipeArea} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.characterWrapper,
              {
                transform: [
                  { translateX: pan.x }, // Horizontal movement
                  { rotateY: rotateY }, // 3D Rotate
                ],
              },
            ]}
          >
            {/* Using the same Image component, React Native handles GIFs automatically */}
            <Image
              source={AssistantGif} // Your animated GIF
              style={styles.imageSize}
              resizeMode="contain" 
            />
          </Animated.View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => router.replace("/auth/login")}
        >
          <Text style={styles.loginButtonText}>Let's Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- VIEW 1: AAPKA ORIGINAL BLACK SPLASH SCREEN (First 3 seconds, untouched) ---
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000", // Original black background
      }}
    >
      <Image
        // Original splash icon
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 250, height: 250 }}
      />
    </View>
  );
}

// Custom Styles for the Assistant Screen
const styles = StyleSheet.create({
  assistantContainer: { 
    flex: 1, 
    backgroundColor: "#ffffff", // Clean white background
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingVertical: 30 
  },
  headerText: { 
    alignItems: "center", 
    marginTop: 60,
    paddingHorizontal: 20
  },
  title: { 
    fontSize: 30, 
    fontWeight: "bold", 
    color: "#333333",
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: "#666666", 
    marginTop: 10,
    textAlign: 'center'
  },
  characterSwipeArea: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    width: "100%",
  },
  characterWrapper: { 
    width: 280, // Size of the GIF container
    height: 350, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  imageSize: { 
    width: "100%", 
    height: "100%" 
  },
  loginButton: { 
    backgroundColor: "#000000", // Clean black button
    paddingVertical: 16, 
    paddingHorizontal: 60, 
    borderRadius: 30, 
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  loginButtonText: { 
    color: "#ffffff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
});
