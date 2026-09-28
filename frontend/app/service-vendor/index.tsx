import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/AuthContext";
import HolidayVendorDashboardScreen from "../vendor/holiday-dashboard";
import CarRentalVendorDashboardScreen from "../vendor/car-rental-dashboard";

export default function ServiceVendorDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  if (user?.role !== "vendor" || user?.vendor_type !== "service") {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  if (user.service_type === "car_rental") {
    return <CarRentalVendorDashboardScreen />;
  }

  return <HolidayVendorDashboardScreen />;
}
