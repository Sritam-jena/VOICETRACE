export type AuthProviderType = "github" | "google" | "bitbucket" | "gitlab" | "email";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: AuthProviderType;
  role: "admin" | "engineer" | "viewer";
  username?: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface LoginRequestPayload {
  provider: AuthProviderType;
  email?: string;
  password?: string;
  rememberMe?: boolean;
}

export interface LoginResponsePayload {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  error?: string;
}
