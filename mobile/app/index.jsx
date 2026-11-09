import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { getToken } from "../services/api";

// =========================================================
// START SCREEN
// =========================================================
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    getToken().then((token) => {
      router.replace(token ? "/dashboard" : "/auth/login");
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
