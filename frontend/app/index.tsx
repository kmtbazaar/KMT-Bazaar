import { useEffect } from "react";
import { View, Image } from "react-native";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
      }}
    >
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 250, height: 250 }}
      />
    </View>
  );
}