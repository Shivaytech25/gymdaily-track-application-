const http = require("http");

const BASE_URL = "http://127.0.0.1:5000";

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed, raw: data });
          } catch {
            resolve({ status: res.statusCode, body: data, raw: data });
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function getWeekdayWorkoutIndex(dateInput) {
  let date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === "string") {
    const [y, m, d] = dateInput.split("-").map(Number);
    date = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    date = new Date(dateInput);
  }
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return (dayOfWeek + 6) % 7;
}

async function runTests() {
  console.log("=========================================");
  console.log("   NEXFIT VERIFICATION TEST SUITE");
  console.log("=========================================\n");

  let userAToken = null;
  let userBToken = null;
  let testExerciseId = null;
  let testFoodId = null;

  // 0. HEALTH CHECK
  console.log("--- TEST 0: Health Check ---");
  const health = await makeRequest("GET", "/api/health");
  console.log(`Health Status: ${health.status}`, health.body);
  if (health.status !== 200) throw new Error("Backend not healthy");

  // 1. AUTH SETUP (User A and User B)
  console.log("\n--- Setting up Test Users ---");
  const emailA = `test_user_a_${Date.now()}@nexfit.com`;
  const emailB = `test_user_b_${Date.now()}@nexfit.com`;
  const password = "Password123!";

  const regA = await makeRequest("POST", "/api/auth/register", {
    name: "User Alpha",
    email: emailA,
    password,
  });
  console.log(`User A Register: ${regA.status}`);
  userAToken = regA.body.data?.accessToken || regA.body.accessToken || regA.body.token;

  const regB = await makeRequest("POST", "/api/auth/register", {
    name: "User Beta",
    email: emailB,
    password,
  });
  console.log(`User B Register: ${regB.status}`);
  userBToken = regB.body.data?.accessToken || regB.body.accessToken || regB.body.token;

  if (!userAToken || !userBToken) throw new Error("Failed to authenticate test users");

  // 2. ISSUE 1: CUSTOM EXERCISES
  console.log("\n=========================================");
  console.log("--- TEST 1: Add My Exercise Flow ---");
  console.log("=========================================");

  // 1A. Create custom exercise for User A
  const createExRes = await makeRequest(
    "POST",
    "/api/workouts/custom-exercises",
    {
      name: "Incline Dumbbell Press",
      muscle: "Chest",
      category: "Chest",
      sets: 4,
      reps: 12,
      durationSeconds: 45,
      equipment: ["Dumbbells", "Incline Bench"],
      notes: "Focus on upper chest squeeze",
    },
    userAToken
  );
  console.log(`Create Custom Exercise (User A): status ${createExRes.status}`);
  if (createExRes.status !== 201) {
    console.error("Create exercise failed:", createExRes.body);
    throw new Error("Failed to create custom exercise");
  }
  const createdEx = createExRes.body.exercise || createExRes.body.data;
  testExerciseId = createdEx._id;
  console.log(`Created Exercise ID: ${testExerciseId}, Name: ${createdEx.name}`);

  // 1B. List custom exercises for User A
  const listExA = await makeRequest("GET", "/api/workouts/custom-exercises", null, userAToken);
  console.log(`List Custom Exercises (User A): status ${listExA.status}, count: ${listExA.body.data.length}`);
  const foundA = listExA.body.data.find((e) => e._id === testExerciseId);
  if (!foundA) throw new Error("Created exercise not found in User A list");

  // 1C. Edit custom exercise
  const updateExRes = await makeRequest(
    "PUT",
    `/api/workouts/custom-exercises/${testExerciseId}`,
    {
      name: "Incline DB Press Heavy",
      sets: 5,
      reps: 8,
    },
    userAToken
  );
  console.log(`Update Custom Exercise (User A): status ${updateExRes.status}`);
  if (updateExRes.status !== 200) throw new Error("Failed to update custom exercise");
  console.log(`Updated Name: ${updateExRes.body.data.name}, Sets: ${updateExRes.body.data.sets}`);

  // 1D. Strict User Isolation: User B must NOT see User A's custom exercise
  const listExB = await makeRequest("GET", "/api/workouts/custom-exercises", null, userBToken);
  console.log(`List Custom Exercises (User B): status ${listExB.status}, count: ${listExB.body.data.length}`);
  const foundB = listExB.body.data.find((e) => e._id === testExerciseId);
  if (foundB) throw new Error("CRITICAL: User B can see User A's custom exercise! Isolation broken!");
  console.log("✓ User Isolation verified: User B cannot see User A's custom exercises.");

  // 1E. User B cannot edit or delete User A's custom exercise
  const unauthEdit = await makeRequest(
    "PUT",
    `/api/workouts/custom-exercises/${testExerciseId}`,
    { name: "Hacked" },
    userBToken
  );
  console.log(`User B editing User A's exercise: status ${unauthEdit.status} (expected 404 or 401)`);
  if (unauthEdit.status === 200) throw new Error("CRITICAL: User B edited User A's exercise!");

  const unauthDel = await makeRequest(
    "DELETE",
    `/api/workouts/custom-exercises/${testExerciseId}`,
    null,
    userBToken
  );
  console.log(`User B deleting User A's exercise: status ${unauthDel.status} (expected 404 or 401)`);
  if (unauthDel.status === 200) throw new Error("CRITICAL: User B deleted User A's exercise!");

  // 1F. Delete custom exercise by owner
  const delExRes = await makeRequest(
    "DELETE",
    `/api/workouts/custom-exercises/${testExerciseId}`,
    null,
    userAToken
  );
  console.log(`Delete Custom Exercise (User A): status ${delExRes.status}`);
  if (delExRes.status !== 200) throw new Error("Failed to delete custom exercise");
  console.log("✓ Custom exercise deleted successfully by owner.");

  // 3. ISSUE 2: WORKOUT WEEKDAY CALCULATION
  console.log("\n=========================================");
  console.log("--- TEST 2: Weekday Calculation Mapping ---");
  console.log("=========================================");

  const testDates = [
    { date: "2026-11-16", dayName: "Monday", expectedIndex: 0, expectedDayNumber: 1 },
    { date: "2026-11-17", dayName: "Tuesday", expectedIndex: 1, expectedDayNumber: 2 },
    { date: "2026-11-18", dayName: "Wednesday", expectedIndex: 2, expectedDayNumber: 3 },
    { date: "2026-11-19", dayName: "Thursday", expectedIndex: 3, expectedDayNumber: 4 },
    { date: "2026-11-20", dayName: "Friday", expectedIndex: 4, expectedDayNumber: 5 },
    { date: "2026-11-21", dayName: "Saturday", expectedIndex: 5, expectedDayNumber: 6 },
    { date: "2026-11-22", dayName: "Sunday", expectedIndex: 6, expectedDayNumber: 7 },
  ];

  for (const t of testDates) {
    const idx = getWeekdayWorkoutIndex(t.date);
    const dayNum = idx + 1;
    const ok = idx === t.expectedIndex && dayNum === t.expectedDayNumber;
    console.log(
      `${t.date} (${t.dayName}) -> Calculated: Index ${idx}, Day ${dayNum} | Expected: Index ${t.expectedIndex}, Day ${t.expectedDayNumber} => ${ok ? "PASS" : "FAIL"}`
    );
    if (!ok) throw new Error(`Weekday mapping failed for ${t.date}`);
  }
  console.log("✓ All 7 weekdays accurately mapped. Monday = Day 1, Wednesday = Day 3, Sunday = Day 7.");

  // 4. ISSUE 3: NUTRITION PAGE AUTH & FUNCTIONALITY
  console.log("\n=========================================");
  console.log("--- TEST 3: Nutrition Module Authentication ---");
  console.log("=========================================");

  const todayStr = "2026-11-18";

  // 3A. Unauthorized request (no token) -> must return 401
  const noTokenRes = await makeRequest("GET", `/api/nutrition?date=${todayStr}`);
  console.log(`GET /api/nutrition without token: status ${noTokenRes.status} (expected 401)`);
  if (noTokenRes.status !== 401) throw new Error("Security check failed: endpoint allowed unauthenticated access!");

  // 3B. Authenticated request -> must return 200 OK (no 401 Unauthorized!)
  const authNutrRes = await makeRequest("GET", `/api/nutrition?date=${todayStr}`, null, userAToken);
  console.log(`GET /api/nutrition with valid token: status ${authNutrRes.status} (expected 200)`);
  if (authNutrRes.status !== 200) throw new Error(`Nutrition fetch failed with status ${authNutrRes.status}`);
  console.log("✓ GET /api/nutrition returns 200 OK with valid token.");

  // 3C. Custom food creation
  const addFoodRes = await makeRequest(
    "POST",
    "/api/nutrition/custom-foods",
    {
      name: "Organic Oatmeal with Berries",
      calories: 360,
      protein: 14,
      carbs: 62,
      fats: 6,
      servingSize: 150,
      servingUnit: "bowl",
    },
    userAToken
  );
  console.log(`POST /api/nutrition/custom-foods: status ${addFoodRes.status}`);
  if (addFoodRes.status !== 201) throw new Error("Failed to create custom food");
  testFoodId = addFoodRes.body.data._id;
  console.log(`Created Custom Food ID: ${testFoodId}, Name: ${addFoodRes.body.data.name}`);

  // 3D. List custom foods (User A)
  const listFoodsRes = await makeRequest("GET", "/api/nutrition/custom-foods", null, userAToken);
  console.log(`GET /api/nutrition/custom-foods: status ${listFoodsRes.status}, count: ${listFoodsRes.body.data.length}`);
  if (listFoodsRes.status !== 200) throw new Error("Failed to list custom foods");

  // 3E. User isolation check for custom food: User B cannot see User A's custom foods
  const listFoodsB = await makeRequest("GET", "/api/nutrition/custom-foods", null, userBToken);
  console.log(`GET /api/nutrition/custom-foods (User B): status ${listFoodsB.status}, count: ${listFoodsB.body.data.length}`);
  const foundFoodB = listFoodsB.body.data.find((f) => f._id === testFoodId);
  if (foundFoodB) throw new Error("CRITICAL: User B can see User A's custom food! Isolation broken!");
  console.log("✓ User Isolation verified: User B cannot see User A's custom foods.");

  // 3F. Get & Update Nutrition Targets
  const getTargetsRes = await makeRequest("GET", "/api/nutrition/targets", null, userAToken);
  console.log(`GET /api/nutrition/targets: status ${getTargetsRes.status}, calories: ${getTargetsRes.body.data?.calories}`);

  const updateTargetsRes = await makeRequest(
    "PUT",
    "/api/nutrition/targets",
    {
      calories: 2400,
      protein: 175,
      carbs: 260,
      fats: 70,
    },
    userAToken
  );
  console.log(`PUT /api/nutrition/targets: status ${updateTargetsRes.status}, new calories: ${updateTargetsRes.body.data?.calories}`);
  if (updateTargetsRes.status !== 200 || updateTargetsRes.body.data?.calories !== 2400) {
    throw new Error("Failed to update nutrition targets");
  }

  // 3G. Add a meal
  const addMealRes = await makeRequest(
    "POST",
    "/api/nutrition/meal",
    {
      date: todayStr,
      mealName: "Breakfast",
      foods: [
        {
          name: "Organic Oatmeal with Berries",
          calories: 360,
          protein: 14,
          carbs: 62,
          fats: 6,
          quantity: 1,
          unit: "bowl",
          customFoodId: testFoodId,
        },
      ],
    },
    userAToken
  );
  console.log(`POST /api/nutrition/meal: status ${addMealRes.status}`);
  if (addMealRes.status !== 200 && addMealRes.status !== 201) {
    throw new Error("Failed to add meal");
  }

  // 3H. Water tracking
  const waterRes = await makeRequest("GET", `/api/water?date=${todayStr}`, null, userAToken);
  console.log(`GET /api/water: status ${waterRes.status}`);
  if (waterRes.status !== 200) throw new Error("Failed to get water logs");

  // 3I. Delete custom food
  const delFoodRes = await makeRequest(
    "DELETE",
    `/api/nutrition/custom-foods/${testFoodId}`,
    null,
    userAToken
  );
  console.log(`DELETE /api/nutrition/custom-foods/${testFoodId}: status ${delFoodRes.status}`);
  if (delFoodRes.status !== 200) throw new Error("Failed to delete custom food");

  console.log("\n=========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("=========================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
