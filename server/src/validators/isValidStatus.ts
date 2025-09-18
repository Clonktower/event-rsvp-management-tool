export const isValidStatus = (status: string) => {
  return status === "going" || status === "not_going" || status === "maybe";
};
