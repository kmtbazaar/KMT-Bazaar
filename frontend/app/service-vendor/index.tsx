import React from "react";
import { View } from "react-native";
import { useAuth } from "@/src/AuthContext";
import HolidayVendorDashboardScreen from "../vendor/holiday-dashboard";
import CarRentalVendorDashboardScreen from "../vendor/car-rental-dashboard";

export default function ServiceVendorDashboard() {
  const { user } = useAuth();

  if (user?.role !== "vendor" || user?.vendor_type !== "service") {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  if (user.service_type === "car_rental") {
    return <CarRentalVendorDashboardScreen />;
  }

  return <HolidayVendorDashboardScreen />;
}
