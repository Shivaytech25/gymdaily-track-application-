
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateRegisterInput(
  input: unknown
): { valid: true; data: RegisterInput } | { valid: false; message: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'Request body must be an object.' };
  }

  const body = input as Record<string, unknown>;
  const { name, email, password } = body;

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return {
      valid: false,
      message: 'Name, email, and password are required.',
    };
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2 || cleanName.length > 80) {
    return {
      valid: false,
      message: 'Name must be between 2 and 80 characters.',
    };
  }

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return { valid: false, message: 'Enter a valid email address.' };
  }

  if (password.length < 8 || password.length > 128) {
    return {
      valid: false,
      message: 'Password must be between 8 and 128 characters.',
    };
  }

  return {
    valid: true,
    data: {
      name: cleanName,
      email: cleanEmail,
      password,
    },
  };
}

export function validateLoginInput(
  input: unknown
): { valid: true; data: LoginInput } | { valid: false; message: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'Request body must be an object.' };
  }

  const body = input as Record<string, unknown>;
  const { email, password } = body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return {
      valid: false,
      message: 'Email and password are required.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return { valid: false, message: 'Enter a valid email address.' };
  }

  if (password.length === 0 || password.length > 128) {
    return { valid: false, message: 'Invalid email or password.' };
  }

  return {
    valid: true,
    data: {
      email: cleanEmail,
      password,
    },
  };
}
