export interface User {
  name: string;
  email: string;
}

export interface Session {
  user: User;
  signedInAt: string;
}
