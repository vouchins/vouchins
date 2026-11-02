export type UserBadge = {
  name: string;
  icon: string;
};

export const getHighestBadge = (count: number): UserBadge | null => {
  if (count >= 50) return { name: "Founding Connector", icon: "🏆" };
  if (count >= 25) return { name: "Network Catalyst", icon: "🚀" };
  if (count >= 5) return { name: "Community Builder", icon: "🌱" };
  return null;
};
