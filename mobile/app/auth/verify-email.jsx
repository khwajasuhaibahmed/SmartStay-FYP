import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthLayout from "../../components/AuthLayout";
import { colors, fonts } from "../../constants/theme";
import {
  resendVerification,
  saveToken,
  saveUser,
  verifyEmail,
} from "../../services/api";

const RESEND_SECONDS = 60;

// =========================================================
// VERIFY EMAIL PAGE
// =========================================================
export default function VerifyEmailNative() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  // Mobile app is for Residents and Staff (proposal Section 5)
  const mobileRoles = ["resident", "staff"];

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleVerify = async () => {
    setError("");
    setInfo("");

    if (!email) return setError("Email is missing. Please sign up or log in again.");
    if (!/^\d{6}$/.test(code)) return setError("Please enter the 6-digit code");

    setLoading(true);

    try {
      const data = await verifyEmail({ email, code });

      if (!mobileRoles.includes(data.user.role)) {
        setInfo("Email verified! Admins and Wardens please use the SmartStay web portal.");
        setLoading(false);
        return;
      }

      // Verified — save session and go to dashboard
      await saveToken(data.token);
      await saveUser(data.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    try {
      const data = await resendVerification(email);
      setInfo(data.message);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || "Could not resend the code");
      if (err.wait) setResendIn(err.wait);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>✉️</Text>
      </View>

      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{" "}
        <Text style={styles.bold}>{email || "your email"}</Text>. Enter it below to
        activate your account.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Verification Code</Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          placeholderTextColor={colors.textLight}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {info ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleVerify}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading ? "Verifying..." : "Verify Email →"}
        </Text>
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.mutedText}>Didn't get the code? </Text>
        {resendIn > 0 ? (
          <Text style={styles.lightText}>Resend in {resendIn}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.link}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

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
  bold: { fontFamily: fonts.bodySemiBold, color: colors.textMain, },
  field: { marginBottom: 20 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  codeInput: {
    height: 60,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    backgroundColor: colors.bgInput,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 12,
    color: colors.primary,
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
  infoBox: {
    backgroundColor: colors.emeraldLight,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { fontFamily: fonts.bodyMedium, color: "#047857", fontSize: 13, lineHeight: 19 },
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
  resendRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  mutedText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  lightText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textLight, },
  link: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primaryHover, },
  backLink: { alignItems: "center", marginTop: 20 },
});
