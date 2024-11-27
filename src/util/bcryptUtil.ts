import * as bcrypt from 'bcryptjs';

const salt = 10;
const passwordLength = 8;

const generateRandomString = (): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  for (let i = 0; i < passwordLength; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
};
export const hashingPassword = async (): Promise<{
  randomString: string;
  hashPassword: string;
}> => {
  const randomString = generateRandomString();
  const hashPassword = await bcrypt.hash(randomString, salt);
  return { randomString, hashPassword };
};

export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};
