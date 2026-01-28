import zxcvbn from "zxcvbn";

export function validatePassword(rawPassword: string) {
  const password = rawPassword.trim();
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const zxcvbnResult = zxcvbn(password);

  return {
    isValid: regex.test(password) && zxcvbnResult.score >= 1,
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    specialChar: /[@$!%*?&]/.test(password),
    strengthScore: zxcvbnResult.score, // 0–4
  };
}
