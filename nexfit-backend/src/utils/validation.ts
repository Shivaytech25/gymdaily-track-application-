
export interface RegisterInput {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Indian phone number (10 digits, starting with 6,7,8,9, optional country code +91, 91, or 0)
  const indianRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  // International format E.164 (7-15 digits with optional +)
  const internationalRegex = /^\+?[1-9]\d{6,14}$/;
  return indianRegex.test(cleaned) || internationalRegex.test(cleaned);
}

export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // If 10-digit Indian number without country code, prefix +91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return `+${cleaned}`;
}

export function validateRegisterInput(
  input: unknown
): { valid: true; data: RegisterInput } | { valid: false; message: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'Request body must be an object.' };
  }

  const body = input as Record<string, unknown>;
  const { name, email, password, phoneNumber } = body;

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

  let validatedPhone: string | undefined;
  if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== '') {
    if (typeof phoneNumber !== 'string') {
      return { valid: false, message: 'Phone number must be a valid string.' };
    }
    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone.length > 0) {
      if (!isValidPhoneNumber(trimmedPhone)) {
        return {
          valid: false,
          message: 'Please enter a valid phone number (10-digit Indian number or international format).',
        };
      }
      validatedPhone = normalizePhoneNumber(trimmedPhone);
    }
  }

  return {
    valid: true,
    data: {
      name: cleanName,
      email: cleanEmail,
      phoneNumber: validatedPhone,
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
