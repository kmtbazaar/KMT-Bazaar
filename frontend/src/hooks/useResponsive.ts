import { Dimensions } from "react-native";

export const useResponsive = () => {
  const { width } = Dimensions.get("window");

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,

    columns:
      width >= 1400 ? 6 :
      width >= 1200 ? 5 :
      width >= 1024 ? 4 :
      width >= 768 ? 3 : 2,

    containerWidth:
      width >= 1400 ? 1320 :
      width >= 1200 ? 1140 :
      width >= 1024 ? 960 :
      width - 24,
  };
};