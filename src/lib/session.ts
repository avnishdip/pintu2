type DemoSession = {
  user: {
    email: string;
    name?: string | null;
  };
};

export async function requireSession(): Promise<DemoSession> {
  return {
    user: {
      email: "demo@local",
      name: "Demo User",
    },
  };
}
