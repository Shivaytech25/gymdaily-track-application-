import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarLabel: "Home" }}
      />

      <Tabs.Screen
        name="workout"
        options={{ title: "Workouts", tabBarLabel: "Workouts" }}
      />

      <Tabs.Screen
        name="nutrition"
        options={{ title: "Nutrition", tabBarLabel: "Nutrition" }}
      />

      <Tabs.Screen
        name="progress"
        options={{ title: "Progress", tabBarLabel: "Progress" }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
    </Tabs>
  );
}
