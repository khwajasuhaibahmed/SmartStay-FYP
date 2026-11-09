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
import { forgotPassword, resetPassword } from "../../services/api";
import { checkPassword } from "../../utils/validation";

const RESEND_SECONDS = 60;

// =========================================================
// RESET PASSWORD PAGE
// =========================================================
export default function ResetPasswordNative() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleReset = async () => {
    setError("");
    setInfo("");

    if (!email) return setError("Email is missing. Please start again from Forgot Password.");
    if (!/^\d{6}$/.test(code)) return setError("Please enter the 6-digit code");
    const passwordError = checkPassword(newPassword, "New password");
    if (passwordError) return setError(passwordError);
    if (newPassword !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await resetPassword({ email, code, newPassword });
      setInfo(data.message);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    try {
      const data = await forgotPassword(email);
      setInfo(data.message);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || "Could not resend the code");
    }
  };

  return (
    <AuthLayout>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🔒</Text>
      </View>

      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        If <Text style={styles.bold}>{email || "your email"}</Text> has an account, we
        sent it a 6-digit code. Enter the code and choose a new password.
      </Text>

      {!done && (
        <>
          {/* Code */}
          <View style={styles.field}>
            <Text style={styles.label}>Reset Code</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
            />
          </View>

          {/* New Password */}
          <View style={styles.field}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 64 }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
        </>
      )}

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

      {done ? (
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/auth/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Go to Sign In →</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {loading ? "Resetting..." : "Reset Password →"}
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
        </>
      )}
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
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  eyeText: { fontFamily: fonts.bodySemiBold, color: colors.primaryHover, fontSize: 13 },
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
