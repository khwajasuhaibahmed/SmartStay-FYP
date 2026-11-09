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
import Logo from "../../components/Logo";
import { colors, fonts } from "../../constants/theme";
import { registerUser } from "../../services/api";
import {
  checkEmail,
  checkHostelCode,
  checkName,
  checkPassword,
  checkPhone,
} from "../../utils/validation";

// =========================================================
// REGISTER PAGE
// =========================================================
export default function RegisterNative() {
  const router = useRouter();

  const [hostelCode, setHostelCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign-up is for Residents only.
  // Staff, Warden and Admin accounts are created by the hostel administration.

  const handleRegister = async () => {
    setError("");

    const fieldError =
      checkHostelCode(hostelCode) ||
      checkName(fullName, "Full name") ||
      checkEmail(email) ||
      checkPhone(phone) ||
      checkPassword(password);
    if (fieldError) return setError(fieldError);
    if (password !== confirmPassword)
      return setError("Passwords do not match");

    setLoading(true);

    try {
      const data = await registerUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        hostelCode: hostelCode.trim().toUpperCase(),
      });

      // Account created — verify the email before first login
      setLoading(false);
      router.replace({ pathname: "/auth/verify-email", params: { email: data.email } });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Brand */}
      <View style={styles.brandRow}>
        <Logo />
        <Text style={styles.brand}>SmartStay</Text>
      </View>

      <Text style={styles.title}>Create resident account</Text>
      <Text style={styles.subtitle}>
        Staff, Warden or Admin? Your account is created by the hostel
        administration.
      </Text>

      {/* Hostel Code */}
      <View style={styles.field}>
        <Text style={styles.label}>Hostel Code</Text>
        <TextInput
          style={[styles.input, styles.codeText]}
          value={hostelCode}
          onChangeText={(t) => setHostelCode(t.toUpperCase())}
          placeholder="e.g. IGH-4821"
          placeholderTextColor={colors.textLight}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text style={styles.hint}>Ask your warden for your hostel's code.</Text>
      </View>

      {/* Full Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name (letters only)"
          placeholderTextColor={colors.textLight}
        />
      </View>

      {/* Email */}
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
        />
      </View>

      {/* Phone */}
      <View style={styles.field}>
        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="0300-1234567"
          placeholderTextColor={colors.textLight}
          keyboardType="phone-pad"
        />
      </View>

      {/* Password */}
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { paddingRight: 64 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
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
        <Text style={styles.label}>Confirm Password</Text>
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

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating account..." : "Create Account →"}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.switchPrompt}>
        <Text style={styles.switchText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.switchLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginBottom: 32 },
  field: { marginBottom: 20 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
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
  codeText: { letterSpacing: 2, fontWeight: "700" },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textLight, marginTop: 6 },
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
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textLight,
    letterSpacing: 1,
  },
  switchPrompt: { flexDirection: "row", justifyContent: "center" },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  switchLink: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primaryHover, },
});
