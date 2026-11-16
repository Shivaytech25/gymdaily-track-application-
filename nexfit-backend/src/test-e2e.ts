import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:5000/api";

async function post(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function get(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers,
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function patch(path: string, body: any, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function del(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log("=== STARTING NEXFIT END-TO-END VERIFICATION SUITE ===");
  const timestamp = Date.now();
  const userAEmail = `test_user_a_${timestamp}@example.com`;
  const userBEmail = `test_user_b_${timestamp}@example.com`;
  const password = "TestPassword123!";

  // 1. AUTHENTICATION: REGISTER
  console.log("\n[TEST 1] Register User A...");
  const regA = await post("/auth/register", {
    name: "User Alpha",
    email: userAEmail,
    password,
  });
  assert.strictEqual(regA.status, 201, `Register User A failed: ${JSON.stringify(regA.data)}`);
  assert.ok(regA.data.data.accessToken, "User A received token");
  const tokenA = regA.data.data.accessToken;
  const userAId = regA.data.data.user.id;
  console.log("✓ User A registered successfully. ID:", userAId);

  // 2. AUTHENTICATION: LOGIN
  console.log("\n[TEST 2] Login User A...");
  const loginA = await post("/auth/login", {
    email: userAEmail,
    password,
  });
  assert.strictEqual(loginA.status, 200, `Login User A failed: ${JSON.stringify(loginA.data)}`);
  assert.ok(loginA.data.data.accessToken, "Login token received");
  console.log("✓ User A logged in successfully.");

  // 3. PROFILE FUNCTIONALITY: GET & PATCH
  console.log("\n[TEST 3] Profile Management (GET & PATCH /users/profile)...");
  const profGet = await get("/users/profile", tokenA);
  assert.strictEqual(profGet.status, 200, `Get profile failed: ${JSON.stringify(profGet.data)}`);
  assert.strictEqual(profGet.data.data.name, "User Alpha");

  const profPatch = await patch("/users/profile", {
    name: "Alpha Updated",
    fitnessGoal: "muscle_gain",
    experienceLevel: "intermediate",
    workoutDaysPerWeek: 5,
    dietPreference: "non_vegetarian",
    heightCm: 182,
    currentWeightKg: 81.5,
    targetWeightKg: 85.0,
  }, tokenA);
  assert.strictEqual(profPatch.status, 200, `Update profile failed: ${JSON.stringify(profPatch.data)}`);
  assert.strictEqual(profPatch.data.data.name, "Alpha Updated");
  assert.strictEqual(profPatch.data.data.fitnessGoal, "muscle_gain");
  assert.strictEqual(profPatch.data.data.workoutDaysPerWeek, 5);
  assert.strictEqual(profPatch.data.data.heightCm, 182);
  assert.strictEqual(profPatch.data.data.currentWeightKg, 81.5);
  assert.strictEqual(profPatch.data.data.targetWeightKg, 85);
  console.log("✓ User profile updated and verified in database.");

  // 4. PROGRESS & BODY MEASUREMENTS (WEIGHT, CHEST, WAIST, ARMS, THIGHS)
  console.log("\n[TEST 4] Body Measurements with Arms and Thighs persistence...");
  const measRes = await post("/body-measurements", {
    weightKg: 81.5,
    chestCm: 104,
    waistCm: 82,
    armsCm: 38.5,
    thighsCm: 60.2,
    notes: "Week 1 baseline",
  }, tokenA);
  assert.strictEqual(measRes.status, 201, `Create measurement failed: ${JSON.stringify(measRes.data)}`);
  const measData = measRes.data.data;
  assert.strictEqual(measData.weightKg, 81.5);
  assert.strictEqual(measData.chestCm, 104);
  assert.strictEqual(measData.waistCm, 82);
  assert.strictEqual(measData.armsCm, 38.5, "armsCm saved");
  assert.strictEqual(measData.thighsCm, 60.2, "thighsCm saved");
  console.log("✓ Saved measurements with armsCm and thighsCm: PASS");

  // Read latest measurement
  const latestMeas = await get("/body-measurements/latest", tokenA);
  assert.strictEqual(latestMeas.status, 200);
  assert.strictEqual(latestMeas.data.data.armsCm, 38.5);
  assert.strictEqual(latestMeas.data.data.thighsCm, 60.2);
  console.log("✓ Retrieved latest measurement with armsCm and thighsCm: PASS");

  // 5. DASHBOARD WORKOUT PERSISTENCE (WORKOUT SESSIONS)
  console.log("\n[TEST 5] Dashboard Workout Session creation & persistence...");
  const todayStr = new Date().toISOString().slice(0, 10);
  const sessionRes = await post("/workout-sessions", {
    workoutDate: new Date().toISOString(),
    title: "Daily Workout Session",
    durationMinutes: 45,
    caloriesBurned: 340,
    exercises: [
      {
        exerciseName: "Bench Press",
        machineName: "Barbell Bench",
        sets: [
          { setNumber: 1, weightKg: 60, reps: 10, completed: true },
          { setNumber: 2, weightKg: 70, reps: 8, completed: true },
        ],
      },
      {
        exerciseName: "Incline Dumbbell Press",
        machineName: "Dumbbells",
        sets: [
          { setNumber: 1, weightKg: 24, reps: 10, completed: true },
        ],
      },
    ],
  }, tokenA);
  assert.strictEqual(sessionRes.status, 201, `Create workout session failed: ${JSON.stringify(sessionRes.data)}`);
  const sessionId = sessionRes.data.session._id;
  assert.ok(sessionId, "Workout session created with Mongo ObjectId");
  console.log("✓ Workout session persisted to MongoDB. ID:", sessionId);

  // Check Dashboard endpoint reflects session
  console.log("\n[TEST 6] Verify GET /api/dashboard reflects saved session & activity...");
  const dashRes = await get(`/dashboard?date=${todayStr}`, tokenA);
  assert.strictEqual(dashRes.status, 200, "Dashboard fetch status 200");
  assert.ok(dashRes.data.data.workout.sessions >= 1, "Dashboard workout sessions counted");
  assert.strictEqual(dashRes.data.data.body.latestMeasurement.armsCm, 38.5, "Dashboard reflects arms measurement");
  assert.strictEqual(dashRes.data.data.body.latestMeasurement.thighsCm, 60.2, "Dashboard reflects thighs measurement");
  console.log("✓ Dashboard reflects workout session & body measurements: PASS");

  // 6. NUTRITION & FOOD LOGGING
  console.log("\n[TEST 7] Nutrition: Add 3 foods to meal & verify individual item vs whole meal deletion...");
  const mealRes = await post(`/nutrition/meal?date=${todayStr}`, {
    name: "Lunch",
    foods: [
      {
        name: "Chicken Breast",
        quantity: 1,
        unit: "serving",
        calories: 200,
        protein: 40,
        carbs: 0,
        fats: 4,
        fiber: 0,
      },
      {
        name: "Brown Rice",
        quantity: 1,
        unit: "cup",
        calories: 215,
        protein: 5,
        carbs: 45,
        fats: 2,
        fiber: 3,
      },
      {
        name: "Steamed Broccoli",
        quantity: 1,
        unit: "cup",
        calories: 55,
        protein: 4,
        carbs: 11,
        fats: 1,
        fiber: 5,
      },
    ],
  }, tokenA);
  assert.strictEqual(mealRes.status, 201, `Add meal failed: ${JSON.stringify(mealRes.data)}`);
  
  const targetMeal = mealRes.data.log.meals.find((m: any) => m.name === "Lunch");
  assert.ok(targetMeal, "Lunch meal created");
  assert.strictEqual(targetMeal.foods.length, 3, "Meal contains exactly 3 food items initially");
  
  const mealId = targetMeal._id;
  const food1 = targetMeal.foods[0]; // Chicken Breast
  const food2 = targetMeal.foods[1]; // Brown Rice
  const food3 = targetMeal.foods[2]; // Steamed Broccoli

  console.log(`✓ 3 food items added to meal ${mealId}: Chicken Breast, Brown Rice, Steamed Broccoli`);

  // Delete ONE food item (food2: Brown Rice) using ?foodId=...
  console.log(`Deleting food item: "${food2.name}" (ID: ${food2._id}) via ?foodId=...`);
  const delFoodRes = await del(`/nutrition/meal/${mealId}?date=${todayStr}&foodId=${food2._id}`, tokenA);
  assert.strictEqual(delFoodRes.status, 200, `Delete single food failed: ${JSON.stringify(delFoodRes.data)}`);

  // Verify that the meal now has exactly 2 food items remaining (Chicken Breast & Steamed Broccoli)
  const nutCheck = await get(`/nutrition?date=${todayStr}`, tokenA);
  assert.strictEqual(nutCheck.status, 200);
  const remainingMeal = nutCheck.data.log.meals.find((m: any) => m._id === mealId);
  assert.ok(remainingMeal, "Lunch meal still exists after deleting 1 food item");
  assert.strictEqual(remainingMeal.foods.length, 2, "Meal has exactly 2 food items remaining");
  
  const remainingNames = remainingMeal.foods.map((f: any) => f.name);
  assert.ok(remainingNames.includes("Chicken Breast"), "Chicken Breast is preserved");
  assert.ok(remainingNames.includes("Steamed Broccoli"), "Steamed Broccoli is preserved");
  assert.ok(!remainingNames.includes("Brown Rice"), "Brown Rice was deleted");
  console.log("✓ Deleting 1 food item preserved the other 2 food items: PASS");

  // Delete remaining meal without foodId to verify whole-meal deletion contract
  console.log("\n[TEST 8] Nutrition: Delete entire meal without foodId parameter...");
  const delMeal = await del(`/nutrition/meal/${mealId}?date=${todayStr}`, tokenA);
  assert.strictEqual(delMeal.status, 200, `Delete meal failed: ${JSON.stringify(delMeal.data)}`);
  
  const nutAfterMealDel = await get(`/nutrition?date=${todayStr}`, tokenA);
  const deletedMealCheck = (nutAfterMealDel.data.log?.meals || []).find((m: any) => m._id === mealId);
  assert.strictEqual(deletedMealCheck, undefined, "Whole meal is deleted when foodId is omitted");
  console.log("✓ Entire meal deleted successfully when foodId is omitted: PASS");

  // 7. WATER LOGGING & TARGET
  console.log("\n[TEST 9] Water: Add entry, update target & delete entry...");
  const waterAdd = await post(`/water/entries?date=${todayStr}`, {
    amountMl: 500,
  }, tokenA);
  assert.strictEqual(waterAdd.status, 201, `Add water failed: ${JSON.stringify(waterAdd.data)}`);
  assert.strictEqual(waterAdd.data.data.totalMl, 500);
  const waterEntryId = waterAdd.data.data.entries[0]._id;

  // Update water target
  const waterTarget = await patch(`/water/target?date=${todayStr}`, {
    dailyTargetMl: 3000,
  }, tokenA);
  assert.strictEqual(waterTarget.status, 200, `Update water target failed: ${JSON.stringify(waterTarget.data)}`);
  assert.strictEqual(waterTarget.data.data.dailyTargetMl, 3000);
  console.log("✓ Water target updated to 3000 ml: PASS");

  // Delete water entry
  const waterDel = await del(`/water/entries/${waterEntryId}?date=${todayStr}`, tokenA);
  assert.strictEqual(waterDel.status, 200, `Delete water entry failed: ${JSON.stringify(waterDel.data)}`);
  assert.strictEqual(waterDel.data.data.totalMl, 0);
  console.log("✓ Water entry deleted and total recalculated to 0: PASS");

  // 8. MULTI-USER ISOLATION
  console.log("\n[TEST 10] Multi-User Isolation Verification...");
  const regB = await post("/auth/register", {
    name: "User Beta",
    email: userBEmail,
    password,
  });
  assert.strictEqual(regB.status, 201);
  const tokenB = regB.data.data.accessToken;

  // User B queries measurements
  const measB = await get("/body-measurements", tokenB);
  assert.strictEqual(measB.status, 200);
  assert.strictEqual(measB.data.data.length, 0, "User B cannot see User A's measurements");

  // User B queries workout sessions
  const sessionsB = await get("/workout-sessions", tokenB);
  assert.strictEqual(sessionsB.status, 200);
  assert.strictEqual(sessionsB.data.sessions.length, 0, "User B cannot see User A's workout sessions");

  // User B queries nutrition
  const nutB = await get(`/nutrition?date=${todayStr}`, tokenB);
  assert.strictEqual(nutB.status, 200);
  const bMeals = nutB.data.log?.meals ?? [];
  assert.strictEqual(bMeals.length, 0, "User B cannot see User A's meals");

  // User B queries water
  const waterB = await get(`/water?date=${todayStr}`, tokenB);
  assert.strictEqual(waterB.status, 200);
  assert.strictEqual(waterB.data.data.totalMl, 0, "User B cannot see User A's water");

  // User B tries to delete User A's workout session
  const illegalDelSession = await del(`/workout-sessions/${sessionId}`, tokenB);
  assert.strictEqual(illegalDelSession.status, 404, "User B cannot delete User A's session (Strict isolation enforced)");

  console.log("✓ Multi-tenant user isolation verified 100%: PASS");

  // 11. WORKOUT PLAN BUILDER & COMPLETION SYNC
  console.log("\n[TEST 11] Workout Plan Builder & Exercise Completion Sync...");
  const savePlanRes = await post("/workouts", {
    preferences: {
      goal: "muscle",
      level: "intermediate",
      location: "gym",
      daysPerWeek: 4,
      duration: 45,
      mode: "automatic",
    },
    plan: [
      {
        id: "day-1",
        title: "Upper Body Power",
        exercises: [
          { id: "ex-1", name: "Barbell Bench Press", sets: 4, reps: 8 },
          { id: "ex-2", name: "Bent Over Row", sets: 4, reps: 8 },
        ],
      },
    ],
    completedExercises: ["day-1:ex-1"],
  }, tokenA);
  assert.strictEqual(savePlanRes.status, 200, "Save workout plan 200");
  assert.strictEqual(savePlanRes.data.success, true);

  const getPlanRes = await get("/workouts/me", tokenA);
  assert.strictEqual(getPlanRes.status, 200, "Get workout plan 200");
  assert.strictEqual(getPlanRes.data.workout.preferences.goal, "muscle");
  assert.strictEqual(getPlanRes.data.workout.completedExercises.length, 1);

  const patchCompletedRes = await patch("/workouts/completed", {
    completedExercises: ["day-1:ex-1", "day-1:ex-2"],
  }, tokenA);
  assert.strictEqual(patchCompletedRes.status, 200, "Patch completed exercises 200");
  assert.strictEqual(patchCompletedRes.data.workout.completedExercises.length, 2);
  console.log("✓ Workout Plan Builder & Exercise Completion Sync verified: PASS");

  // 12. CLEANUP TEST DATA
  console.log("\n[TEST 12] Cleaning up dedicated test accounts...");
  const mongoose = await import("mongoose");
  await mongoose.connect("mongodb://127.0.0.1:27017/nexfit");
  const User = (await import("./models/User")).default;
  const WorkoutSession = (await import("./models/WorkoutSession")).default;
  const WorkoutPlan = (await import("./models/WorkoutPlan")).default;
  const NutritionLog = (await import("./models/NutritionLog")).default;
  const WaterLog = (await import("./models/WaterLog")).default;
  const BodyMeasurement = (await import("./models/BodyMeasurement")).default;

  const users = await User.find({ email: { $in: [userAEmail, userBEmail] } }).lean();
  const userIds = users.map((u) => u._id);

  await Promise.all([
    User.deleteMany({ _id: { $in: userIds } }),
    WorkoutSession.deleteMany({ userId: { $in: userIds } }),
    WorkoutPlan.deleteMany({ userId: { $in: userIds } }),
    NutritionLog.deleteMany({ userId: { $in: userIds } }),
    WaterLog.deleteMany({ userId: { $in: userIds } }),
    BodyMeasurement.deleteMany({ userId: { $in: userIds } }),
  ]);
  await mongoose.disconnect();
  console.log("✓ Test records safely cleaned up.");

  console.log("\n=======================================================");
  console.log("🎉 ALL END-TO-END WORKFLOW TESTS COMPLETED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
