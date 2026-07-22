import { useEffect, useState, useRef } from "react";
import { View, Image, Animated, PanResponder, TouchableOpacity, Text, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";

// 1. Apni nayi transparent 3D image yahan import karein
// Dhyaan rahe ki path sahi ho (../assets/images/apki-file-ka-naam.png)
import AssistantImage from "../assets/images/assistant-char.png"; 

export default function Index() {
  // Yeh state tay karegi ki kab logo dikhana hai aur kab assistant
  const [showAssistant, setShowAssistant] = useState(false);

  // --- Swiping & Animation Logic ---
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x }], // Sirf Left/Right move track hoga
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        // Ungli chhodne par wapas center mein aayega
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
        }).start();
      },
    })
  ).current;

  // 3D Rotation effect (Y-axis par ghumana)
  const rotateY = pan.x.interpolate({
    inputRange: [-200, 200],
    outputRange: ["-45deg", "45deg"],
  });

  useEffect(() => {
    // Original timer logic: 3 second baad splash screen hatega
    const timer = setTimeout(() => {
      // Ab seedha login nahi, pehle assistant dikhao
      setShowAssistant(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // --- VIEW 2: INTERACTIVE ASSISTANT SCREEN (After 3 seconds) ---
  if (showAssistant) {
    return (
      <SafeAreaView style={styles.assistantContainer}>
        {/* Top Text Area */}
        <View style={styles.headerText}>
          <Text style={styles.title}>KMT Bazaar Assistant</Text>
          <Text style={styles.subtitle}>Swipe me left or right to see 3D effect</Text>
        </View>

        {/* Swipe Area with your 3D Image */}
        <View style={styles.characterSwipeArea} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.characterWrapper,
              {
                transform: [
                  { translateX: pan.x }, // Left/Right movement
                  { rotateY: rotateY }, // 3D Rotation
                ],
              },
            ]}
          >
            <Image
              source={AssistantImage} // Aapki generated image yahan load hogi
              style={styles.imageSize}
              resizeMode="contain" // Image stretch na ho
            />
          </Animated.View>
        </View>

        {/* Go to Login Button at Bottom */}
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => router.replace("/auth/login")} // Login par bhejo
        >
          <Text style={styles.loginButtonText}>Let's Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- VIEW 1: AAPKA ORIGINAL SPLASH SCREEN CODE (First 3 seconds) ---
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

// Styling for the new Assistant Screen
const styles = StyleSheet.create({
  assistantContainer: { 
    flex: 1, 
    backgroundColor: "#ffffff", // White background for assistant screen
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
    width: 280, // Character ki width thodi badi rakhi hai 
    height: 350, // Height thodi badi
    justifyContent: "center", 
    alignItems: "center" 
  },
  imageSize: { 
    width: "100%", 
    height: "100%" 
  },
  loginButton: { 
    backgroundColor: "#000000", // Black button for clean look
    paddingVertical: 16, 
    paddingHorizontal: 60, 
    borderRadius: 30, 
    marginBottom: 40,
    // Button shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    // Button shadow (Android)
    elevation: 8,
  },
  loginButtonText: { 
    color: "#ffffff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
});
