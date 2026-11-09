import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../components/Logo";
import { colors, fonts, roleThemes } from "../constants/theme";
import {
  clearSession,
  getMe,
  getUser,
  saveUser,
} from "../services/api";

// =========================================================
// ROLE CONFIG
// =========================================================
const roleConfig = {
  staff: {
    label: "Staff",
    upcoming: [
      { icon: "💬", text: "Pick up complaints assigned to you" },
      { icon: "🔧", text: "Update maintenance task status" },
      { icon: "📋", text: "View your task history" },
    ],
  },
  resident: {
    label: "Resident",
    upcoming: [
      { icon: "🏠", text: "View your room, bed and dues" },
      { icon: "📝", text: "Submit complaints and maintenance requests" },
      { icon: "🤝", text: "Fill the roommate preference questionnaire" },
    ],
  },
};

// =========================================================
// DASHBOARD PAGE
// =========================================================
export default function DashboardNative() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const currentRole = roleConfig[user?.role] || roleConfig.resident;
  const theme = roleThemes[user?.role] || roleThemes.resident;

  // Load the saved user, then refresh it from the server
  useEffect(() => {
    getUser().then((saved) => saved && setUser(saved));

    getMe()
      .then(async (data) => {
        setUser(data.user);
        await saveUser(data.user);
      })
      .catch(() => handleLogout());
  }, []);

  const handleLogout = async () => {
    await clearSession();
    router.replace("/auth/login");
  };

  if (!user) return null;

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB")
    : "—";

  const profileRows = [
    { label: "Full Name", value: user.full_name },
    { label: "Email", value: user.email },
    { label: "Phone", value: user.phone || "Not set" },
    { label: "Joined", value: joined },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Logo />
          <View>
            <Text style={styles.brand}>SmartStay</Text>
            <Text style={styles.hostel}>{user.hostel_name}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <Text style={styles.title}>Welcome back, {user.full_name.split(" ")[0]}</Text>
        <Text style={styles.subtitle}>
          Signed in as <Text style={styles.bold}>{currentRole.label}</Text> at{" "}
          <Text style={styles.bold}>{user.hostel_name}</Text>
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
          <View style={[styles.dot, { backgroundColor: theme.primaryHover }]} />
          <Text style={[styles.badgeText, { color: theme.primaryHover }]}>
            {currentRole.label}
          </Text>
        </View>

        {/* Your Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Profile</Text>
            <View style={[styles.badge, styles.badgeGreen]}>
              <View style={[styles.dot, { backgroundColor: colors.primaryHover }]} />
              <Text style={[styles.badgeText, { color: colors.primaryHover }]}>Active</Text>
            </View>
          </View>
          {profileRows.map((row) => (
            <View key={row.label} style={styles.profileRow}>
              <Text style={styles.profileLabel}>{row.label}</Text>
              <Text style={styles.profileValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Coming Up Next */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Coming Up Next</Text>
          </View>
          {currentRole.upcoming.map((item) => (
            <View key={item.text} style={[styles.taskRow, { backgroundColor: theme.bg }]}>
              <Text style={styles.taskIcon}>{item.icon}</Text>
              <Text style={styles.taskText}>{item.text}</Text>
              <View style={[styles.badge, styles.badgeAmber]}>
                <Text style={[styles.badgeText, { color: colors.amber }]}>Soon</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { fontFamily: fonts.display, fontSize: 18, color: colors.textMain },
  hostel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgSurface,
  },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.rose },

  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.textMain,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 21,
  },
  bold: { fontFamily: fonts.bodySemiBold, color: colors.textMain },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    marginTop: 12,
  },
  badgeGreen: { backgroundColor: colors.primaryLight, marginTop: 0 },
  badgeAmber: { backgroundColor: colors.amberLight, marginTop: 0 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.textMain },

  profileRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  profileLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  profileValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMain },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskIcon: { fontSize: 20 },
  taskText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMain,
  },
});
