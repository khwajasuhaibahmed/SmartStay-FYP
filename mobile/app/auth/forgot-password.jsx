import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthLayout from "../../components/AuthLayout";
import { colors, fonts } from "../../constants/theme";
import { forgotPassword } from "../../services/api";
import { checkEmail } from "../../utils/validation";

// =========================================================
// FORGOT PASSWORD PAGE
// =========================================================
export default function ForgotPasswordNative() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    const emailError = checkEmail(email);
    if (emailError) return setError(emailError);

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      await forgotPassword(cleanEmail);
      router.replace({ pathname: "/auth/reset-password", params: { email: cleanEmail } });
    } catch (err) {
      setError(err.message || "Could not send the reset code. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🔑</Text>
      </View>

      <Text style={styles.title}>Forgot password?</Text>
      <Text style={styles.subtitle}>
        Enter your account email and we'll send you a 6-digit code to reset your
        password.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending code..." : "Send Reset Code →"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => router.replace("/auth/login")}
      >
        <Text style={styles.link}>Back to Sign In</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 26 },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 21, marginBottom: 32 },
  field: { marginBottom: 20 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  input: {
    fontFamily: fonts.body,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textMain,
    backgroundColor: colors.bgInput,
  },
  errorBox: {
    backgroundColor: colors.roseLight,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { fontFamily: fonts.bodyMedium, color: colors.rose, fontSize: 13, lineHeight: 19 },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { fontFamily: fonts.displayBold, color: "#fff", fontSize: 16, },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primaryHover, },
  backLink: { alignItems: "center", marginTop: 24 },
});
