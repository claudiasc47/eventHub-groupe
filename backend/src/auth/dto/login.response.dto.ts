export class LoginResponseDto {
  access_token!: string;
  user!: {
    id: string;
    email: string;
    pseudo: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    birthDate: string | null;
    role: string;
  };
}