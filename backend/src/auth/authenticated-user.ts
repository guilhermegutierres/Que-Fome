export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}
