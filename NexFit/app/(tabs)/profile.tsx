import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../services/userApi";

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

const FITNESS_GOALS = [
  { value: "fat_loss", label: "Fat Loss", desc: "Burn fat and improve conditioning" },
  { value: "muscle_gain", label: "Build Muscle", desc: "Hypertrophy and lean muscle growth" },
  { value: "strength", label: "Build Strength", desc: "Increase power and heavy lifting" },
  { value: "general_fitness", label: "General Fitness", desc: "Overall health and mobility" },
  { value: "endurance", label: "Endurance", desc: "Stamina and cardiovascular fitness" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "New to training or returning" },
  { value: "intermediate", label: "Intermediate", desc: "Consistent training for 1-2 years" },
  { value: "advanced", label: "Advanced", desc: "Experienced lifter with 2+ years" },
];

const DIET_PREFERENCES = [
  { value: "vegetarian", label: "Vegetarian", desc: "Plant-based with dairy" },
  { value: "non_vegetarian", label: "Non-Vegetarian", desc: "Includes meat, poultry, fish" },
  { value: "vegan", label: "Vegan", desc: "Exclusively plant-based" },
  { value: "eggetarian", label: "Eggetarian", desc: "Vegetarian plus eggs" },
  { value: "other", label: "Other", desc: "Flexible or custom dietary choices" },
];

export default function ProfileScreen() {
  const { user, accessToken, signOut, updateUser } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [units, setUnits] = useState<"kg" | "lb">("kg");

  // Edit Modals
  const [activeModal, setActiveModal] = useState<
    "details" | "goal" | "level" | "schedule" | "diet" | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for profile details modal
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formTargetWeight, setFormTargetWeight] = useState("");
  const [formGender, setFormGender] = useState("prefer_not_to_say");

  // Load persisted local preferences on mount
  useEffect(() => {
    async function loadLocalPrefs() {
      try {
        const [savedNotifs, savedReminders, savedUnits] = await Promise.all([
          AsyncStorage.getItem("@nexfit_notifications"),
          AsyncStorage.getItem("@nexfit_reminders"),
          AsyncStorage.getItem("@nexfit_units"),
        ]);
        if (savedNotifs !== null) setNotifications(savedNotifs === "true");
        if (savedReminders !== null) setReminders(savedReminders === "true");
        if (savedUnits === "kg" || savedUnits === "lb") setUnits(savedUnits);
      } catch (e) {
        console.warn("Could not load local preferences:", e);
      }
    }
    loadLocalPrefs();
  }, []);

  const handleToggleNotifications = async (val: boolean) => {
    setNotifications(val);
    try {
      await AsyncStorage.setItem("@nexfit_notifications", String(val));
    } catch {
      // Ignore local storage error
    }
  };

  const handleToggleReminders = async (val: boolean) => {
    setReminders(val);
    try {
      await AsyncStorage.setItem("@nexfit_reminders", String(val));
    } catch {
      // Ignore local storage error
    }
  };

  const handleSelectUnits = async (val: "kg" | "lb") => {
    setUnits(val);
    try {
      await AsyncStorage.setItem("@nexfit_units", val);
    } catch {
      // Ignore local storage error
    }
  };

  const openDetailsModal = () => {
    setFormName(user?.name || "");
    setFormPhone(user?.phoneNumber || "");
    setFormHeight(user?.heightCm ? String(user.heightCm) : "");
    setFormWeight(user?.currentWeightKg ? String(user.currentWeightKg) : "");
    setFormTargetWeight(user?.targetWeightKg ? String(user.targetWeightKg) : "");
    setFormGender(user?.gender || "prefer_not_to_say");
    setActiveModal("details");
  };

  const handleSaveDetails = async () => {
    if (!formName.trim() || formName.trim().length < 2) {
      Alert.alert("Invalid Name", "Please enter a valid name (at least 2 characters).");
      return;
    }

    const updates: Record<string, unknown> = {
      name: formName.trim(),
    };

    if (formPhone.trim()) {
      const cleaned = formPhone.trim().replace(/[\s\-()]/g, "");
      const indianRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
      const internationalRegex = /^\+?[1-9]\d{6,14}$/;
      if (!indianRegex.test(cleaned) && !internationalRegex.test(cleaned)) {
        Alert.alert(
          "Invalid Phone",
          "Please enter a valid phone number (10-digit Indian number or international format)."
        );
        return;
      }
      updates.phoneNumber = cleaned;
    }

    if (formGender) {
      updates.gender = formGender;
    }

    if (formHeight.trim()) {
      const h = Number(formHeight);
      if (!Number.isFinite(h) || h < 50 || h > 300) {
        Alert.alert("Invalid Height", "Height must be between 50 and 300 cm.");
        return;
      }
      updates.heightCm = h;
    }

    if (formWeight.trim()) {
      const w = Number(formWeight);
      if (!Number.isFinite(w) || w < 20 || w > 500) {
        Alert.alert("Invalid Weight", "Current weight must be between 20 and 500 kg.");
        return;
      }
      updates.currentWeightKg = w;
    }

    if (formTargetWeight.trim()) {
      const tw = Number(formTargetWeight);
      if (!Number.isFinite(tw) || tw < 20 || tw > 500) {
        Alert.alert("Invalid Target Weight", "Target weight must be between 20 and 500 kg.");
        return;
      }
      updates.targetWeightKg = tw;
    }

    if (!accessToken) {
      Alert.alert("Session Required", "Please log in to save your profile.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfile(accessToken, updates);
      await updateUser(updated);
      setActiveModal(null);
      Alert.alert("Profile Updated", "Your personal details have been saved.");
    } catch (err) {
      Alert.alert("Save Failed", err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSetting = async (field: string, value: unknown) => {
    if (!accessToken) {
      Alert.alert("Session Required", "Please log in to save your profile.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfile(accessToken, { [field]: value });
      await updateUser(updated);
      setActiveModal(null);
    } catch (err) {
      Alert.alert("Save Failed", err instanceof Error ? err.message : "Could not update setting.");
    } finally {
      setIsSaving(false);
    }
  };

  // Sign out and redirect to login
  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const displayName = user?.name || "NexFit Member";
  const displayEmail = user?.email || "Complete your profile to get started";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "N";

  // Calculate profile completion percentage based on filled user profile fields
  const completionItems = [
    Boolean(user?.name),
    Boolean(user?.fitnessGoal),
    Boolean(user?.experienceLevel),
    Boolean(user?.workoutDaysPerWeek),
    Boolean(user?.dietPreference),
    Boolean(user?.heightCm),
    Boolean(user?.currentWeightKg),
    Boolean(user?.targetWeightKg),
  ];
  const filledCount = completionItems.filter(Boolean).length;
  const completionPercentage = Math.round((filledCount / completionItems.length) * 100);

  const formatGoalSubtitle = () => {
    const found = FITNESS_GOALS.find((g) => g.value === user?.fitnessGoal);
    return found ? found.label : "Strength, muscle gain, fat loss";
  };

  const formatLevelSubtitle = () => {
    const found = EXPERIENCE_LEVELS.find((l) => l.value === user?.experienceLevel);
    return found ? found.label : "Set your experience level";
  };

  const formatScheduleSubtitle = () => {
    return user?.workoutDaysPerWeek
      ? `${user.workoutDaysPerWeek} training days per week`
      : "Choose your training days";
  };

  const formatDietSubtitle = () => {
    const found = DIET_PREFERENCES.find((d) => d.value === user?.dietPreference);
    return found ? found.label : "Vegetarian, non-vegetarian, other";
  };

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
          onPress={openDetailsModal}
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
          {user?.phoneNumber ? (
            <Text style={[styles.email, { marginTop: 2, color: COLORS.primary }]}>
              📞 {user.phoneNumber}
            </Text>
          ) : null}

          <View style={styles.memberBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.memberBadgeText}>FREE MEMBER</Text>
          </View>
        </View>
      </View>

      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.sectionTitle}>Profile completion</Text>
          <Text style={styles.completionPercent}>{completionPercentage}%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>

        <Text style={styles.helperText}>
          {completionPercentage < 100
            ? "Add your details to personalize your training experience."
            : "Great job! Your profile is complete and optimized."}
        </Text>

        {completionPercentage < 100 && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={openDetailsModal}
          >
            <Text style={styles.completeButtonText}>Complete profile →</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionHeading}>TRAINING PREFERENCES</Text>

      <View style={styles.card}>
        <SettingRow
          icon="🎯"
          title="Fitness goals"
          subtitle={formatGoalSubtitle()}
          onPress={() => setActiveModal("goal")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="🏋️"
          title="Training experience"
          subtitle={formatLevelSubtitle()}
          onPress={() => setActiveModal("level")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="📅"
          title="Workout schedule"
          subtitle={formatScheduleSubtitle()}
          onPress={() => setActiveModal("schedule")}
        />

        <View style={styles.separator} />

        <SettingRow
          icon="🥗"
          title="Diet preferences"
          subtitle={formatDietSubtitle()}
          onPress={() => setActiveModal("diet")}
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
            onValueChange={handleToggleNotifications}
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
            onValueChange={handleToggleReminders}
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
              onPress={() => handleSelectUnits("kg")}
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
              onPress={() => handleSelectUnits("lb")}
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
          onPress={() =>
            Alert.alert(
              "Privacy & Data",
              "Your fitness records and personal measurements are strictly isolated to your authenticated account.",
            )
          }
        />

        <View style={styles.separator} />

        <SettingRow
          icon="❓"
          title="Help & support"
          subtitle="Get help with NexFit"
          onPress={() =>
            Alert.alert(
              "Help & Support",
              "Need assistance? Email support@nexfit.app or visit the help desk.",
            )
          }
        />

        <View style={styles.separator} />

        <SettingRow
          icon="ℹ️"
          title="About NexFit"
          subtitle="Version 1.0.0"
          onPress={() =>
            Alert.alert(
              "About NexFit",
              "NexFit v1.0.0\nHigh-performance fitness and habit tracking.",
            )
          }
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

      {/* Profile Details Edit Modal */}
      <Modal
        visible={activeModal === "details"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={formName}
              onChangeText={setFormName}
              placeholder="Your name"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={formPhone}
              onChangeText={setFormPhone}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.modalInput}
              value={formHeight}
              onChangeText={setFormHeight}
              placeholder="e.g. 175"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Current Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              value={formWeight}
              onChangeText={setFormWeight}
              placeholder="e.g. 75"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Target Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              value={formTargetWeight}
              onChangeText={setFormTargetWeight}
              placeholder="e.g. 70"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setActiveModal(null)}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveDetails}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.black} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fitness Goal Selection Modal */}
      <Modal
        visible={activeModal === "goal"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Fitness Goal</Text>
            {FITNESS_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                style={[
                  styles.optionCard,
                  user?.fitnessGoal === goal.value && styles.optionCardActive,
                ]}
                onPress={() => handleSaveSetting("fitnessGoal", goal.value)}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    user?.fitnessGoal === goal.value && styles.optionLabelActive,
                  ]}
                >
                  {goal.label}
                </Text>
                <Text style={styles.optionDesc}>{goal.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Training Experience Modal */}
      <Modal
        visible={activeModal === "level"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Training Experience</Text>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.value}
                style={[
                  styles.optionCard,
                  user?.experienceLevel === lvl.value && styles.optionCardActive,
                ]}
                onPress={() => handleSaveSetting("experienceLevel", lvl.value)}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    user?.experienceLevel === lvl.value && styles.optionLabelActive,
                  ]}
                >
                  {lvl.label}
                </Text>
                <Text style={styles.optionDesc}>{lvl.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Workout Schedule Modal */}
      <Modal
        visible={activeModal === "schedule"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Training Days Per Week</Text>
            <View style={styles.scheduleRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.scheduleNumberBox,
                    user?.workoutDaysPerWeek === num && styles.scheduleNumberBoxActive,
                  ]}
                  onPress={() => handleSaveSetting("workoutDaysPerWeek", num)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.scheduleNumberText,
                      user?.workoutDaysPerWeek === num && styles.scheduleNumberTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperTextCentered}>
              Select how many days you aim to work out each week.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Diet Preferences Modal */}
      <Modal
        visible={activeModal === "diet"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Diet Preference</Text>
            {DIET_PREFERENCES.map((diet) => (
              <TouchableOpacity
                key={diet.value}
                style={[
                  styles.optionCard,
                  user?.dietPreference === diet.value && styles.optionCardActive,
                ]}
                onPress={() => handleSaveSetting("dietPreference", diet.value)}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    user?.dietPreference === diet.value && styles.optionLabelActive,
                  ]}
                >
                  {diet.label}
                </Text>
                <Text style={styles.optionDesc}>{diet.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.text,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  modalSaveText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "900",
  },
  optionCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#1C2412",
  },
  optionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  optionLabelActive: {
    color: COLORS.primary,
  },
  optionDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  modalCloseButton: {
    alignSelf: "center",
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: SPACING.md,
  },
  scheduleNumberBox: {
    width: 42,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleNumberBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scheduleNumberText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  scheduleNumberTextActive: {
    color: COLORS.black,
  },
  helperTextCentered: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
});
