import type { User } from "../types/User";

export const getUserFromUsersById = (id: string, users: User[]) => {
  const filter = users.filter((user) => user.id === id);
  return filter?.length ? filter[0] : undefined;
};
