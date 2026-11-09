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
import { loginUser, saveToken, saveUser } from "../../services/api";
import { checkEmail, checkPassword } from "../../utils/validation";

// =========================================================
// LOGIN PAGE
// =========================================================
export default function LoginNative() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Mobile app is for Residents and Staff (proposal Section 5)
  const mobileRoles = ["resident", "staff"];

  const handleLogin = async () => {
    setError("");

    const fieldError = checkEmail(email) || checkPassword(password);
    if (fieldError) return setError(fieldError);

    setLoading(true);

    try {
      const data = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      // Role check — Admin / Warden / Super Admin use the web portal
      const actualRole = data.user.role;
      if (!mobileRoles.includes(actualRole)) {
        setError("Admins and Wardens please use the SmartStay web portal.");
        setLoading(false);
        return;
      }

      // Accounts with a temporary password set a new one on the web first
      if (data.user.must_change_password) {
        setError("Please log in on the SmartStay website once to set your own password.");
        setLoading(false);
        return;
      }

      // Save session
      await saveToken(data.token);
      await saveUser(data.user);

      router.replace("/dashboard");
    } catch (err) {
      // Account exists but email isn't verified yet — a code was just sent
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setLoading(false);
        router.replace({
          pathname: "/auth/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
        return;
      }
      setError(err.message || "Login failed. Check your credentials.");
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

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your SmartStay account</Text>

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
        <TouchableOpacity
          style={styles.forgotWrap}
          onPress={() => router.push("/auth/forgot-password")}
        >
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing in..." : "Sign In →"}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.switchPrompt}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.replace("/auth/register")}>
          <Text style={styles.switchLink}>Sign Up</Text>
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
  forgotWrap: { alignSelf: "flex-end", marginTop: 8 },
  forgotLink: { fontFamily: fonts.bodySemiBold, color: colors.primaryHover, fontSize: 13 },
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
