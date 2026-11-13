
import { API_BASE_URL } from "./apiConfig";

export interface WorkoutSet {
  _id?: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  restSeconds?: number;
}

export interface WorkoutExercise {
  _id?: string;
  exerciseName: string;
  machineName: string;
  equipmentType?: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  _id: string;
  workoutDate: string;
  title: string;
  exercises: WorkoutExercise[];
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveWorkoutSessionInput {
  workoutDate: string;
  title?: string;
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  caloriesBurned?: number;
  notes?: string;
}

async function request<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

export async function createWorkoutSession(
  token: string,
  input: SaveWorkoutSessionInput
): Promise<WorkoutSession> {
  const result = await request<{
    success: boolean;
    session: WorkoutSession;
  }>("/workout-sessions", token, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.session;
}

export async function fetchWorkoutSessions(
  token: string,
  year?: number,
  month?: number
): Promise<WorkoutSession[]> {
  const query =
    year !== undefined && month !== undefined
      ? `?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
      : "";

  const result = await request<{
    success: boolean;
    sessions: WorkoutSession[];
  }>(`/workout-sessions${query}`, token);

  return result.sessions;
}

export async function fetchWorkoutSessionsByDate(
  token: string,
  date: string
): Promise<WorkoutSession[]> {
  const result = await request<{
    success: boolean;
    sessions: WorkoutSession[];
  }>(`/workout-sessions/date/${encodeURIComponent(date)}`, token);

  return result.sessions;
}

export async function updateWorkoutSession(
  token: string,
  id: string,
  updates: Partial<SaveWorkoutSessionInput>
): Promise<WorkoutSession> {
  const result = await request<{
    success: boolean;
    session: WorkoutSession;
  }>(`/workout-sessions/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  return result.session;
}

export async function deleteWorkoutSession(
  token: string,
  id: string
): Promise<void> {
  await request<{ success: boolean }>(
    `/workout-sessions/${encodeURIComponent(id)}`,
    token,
    { method: "DELETE" }
  );
}
