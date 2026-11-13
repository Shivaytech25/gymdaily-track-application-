import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

type SettingRowProps = {
  title: string;
  subtitle: string;
  icon: string;
  onPress?: () => void;
  danger?: boolean;
};

function SettingRow({
  title,
  subtitle,
  icon,
  onPress,
  danger = false,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>

      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [units, setUnits] = useState<"kg" | "lb">("kg");

  const showComingSoon = (feature: string) => {
    Alert.alert(
      feature,
      "This feature will be connected to your NexFit account in a future update.",
    );
  };

  // Sign out and redirect to login
  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  const displayName = user?.name || "NexFit Member";
  const displayEmail = user?.email || "Complete your profile to get started";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "N";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.heading}>Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => showComingSoon("Edit profile")}
        >
          <Text style={styles.editButtonText}>EDIT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>

          <View style={styles.memberBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.memberBadgeText}>FREE MEMBER</Text>
          </View>
        </View>
      </View>

      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.sectionTitle}>Profile completion</Text>
          <Text style={styles.completionPercent}>25%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        <Text style={styles.helperText}>
          Add your details to personalize your training experience.
        </Text>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => showComingSoon("Complete your profile")}
        >
          <Text style={styles.completeButtonText}>Complete profile →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeading}>TRAINING PREFERENCES</Text>

      <View style={styles.card}>
        <SettingRow
          icon="🎯"
          title="Fitness goals"
          subtitle="Strength, muscle gain, fat loss"
          onPress={() => showComingSoon("Fitness goals")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="🏋️"
          title="Training experience"
          subtitle="Set your experience level"
          onPress={() => showComingSoon("Training experience")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="📅"
          title="Workout schedule"
          subtitle="Choose your training days"
          onPress={() => showComingSoon("Workout schedule")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="🥗"
          title="Diet preferences"
          subtitle="Vegetarian, non-vegetarian, other"
          onPress={() => showComingSoon("Diet preferences")}
        />
      </View>

      <Text style={styles.sectionHeading}>APP PREFERENCES</Text>

      <View style={styles.card}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceText}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingSubtitle}>
              Workout and progress updates
            </Text>
          </View>

          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{
              false: COLORS.border,
              true: COLORS.primary,
            }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceText}>
            <Text style={styles.settingTitle}>Workout reminders</Text>
            <Text style={styles.settingSubtitle}>
              Remind me to stay consistent
            </Text>
          </View>

          <Switch
            value={reminders}
            onValueChange={setReminders}
            trackColor={{
              false: COLORS.border,
              true: COLORS.primary,
            }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.unitsRow}>
          <View style={styles.preferenceText}>
            <Text style={styles.settingTitle}>Weight units</Text>
            <Text style={styles.settingSubtitle}>
              Choose your preferred measurement
            </Text>
          </View>

          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[
                styles.unitOption,
                units === "kg" && styles.unitOptionActive,
              ]}
              onPress={() => setUnits("kg")}
            >
              <Text
                style={[
                  styles.unitText,
                  units === "kg" && styles.unitTextActive,
                ]}
              >
                KG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitOption,
                units === "lb" && styles.unitOptionActive,
              ]}
              onPress={() => setUnits("lb")}
            >
              <Text
                style={[
                  styles.unitText,
                  units === "lb" && styles.unitTextActive,
                ]}
              >
                LB
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeading}>ACCOUNT & PRIVACY</Text>

      <View style={styles.card}>
        <SettingRow
          icon="🔒"
          title="Privacy & data"
          subtitle="Manage your personal information"
          onPress={() => showComingSoon("Privacy & data")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="❓"
          title="Help & support"
          subtitle="Get help with NexFit"
          onPress={() => showComingSoon("Help & support")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="ℹ️"
          title="About NexFit"
          subtitle="Version 1.0.0"
          onPress={() => showComingSoon("About NexFit")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="↪"
          title="Sign out"
          subtitle="Sign out of your account"
          danger
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.footerBrand}>NEXFIT</Text>
      <Text style={styles.footerText}>BUILT FOR YOUR NEXT LEVEL.</Text>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 58,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xl,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 7,
  },
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    fontWeight: "800",
  },
  editButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.black,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 5,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  memberBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  completionCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
  },
  completionPercent: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "900",
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  progressFill: {
    width: "25%",
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  completeButton: {
    alignSelf: "flex-start",
    marginTop: SPACING.md,
    paddingVertical: 8,
  },
  completeButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "800",
  },
  sectionHeading: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    marginLeft: 3,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxl,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  dangerIcon: {
    backgroundColor: "#321D1D",
  },
  settingIconText: {
    fontSize: 18,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
  settingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  chevron: {
    color: COLORS.textSecondary,
    fontSize: 25,
    marginLeft: SPACING.sm,
  },
  dangerText: {
    color: COLORS.danger,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 54,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 17,
  },
  preferenceText: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  unitsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 17,
  },
  unitSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceElevated,
    padding: 4,
    borderRadius: RADIUS.md,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  unitOptionActive: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  unitTextActive: {
    color: COLORS.black,
  },
  footerBrand: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 5,
  },
  footerText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 6,
  },
});
