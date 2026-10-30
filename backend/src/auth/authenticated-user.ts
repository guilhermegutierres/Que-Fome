export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string; cookie?: string };
  user?: AuthenticatedUser;
}
