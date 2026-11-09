import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../constants/theme";

// =========================================================
// SMARTSTAY LOGO (same house icon as the web app)
// =========================================================
export default function Logo() {
  return (
    <View style={styles.logo}>
      <Svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M3 21V8l9-5 9 5v13" />
        <Path d="M9 21v-6h6v6" />
        <Path d="M3 21h18" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
});
