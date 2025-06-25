import { execSync } from "child_process";

export const getGitUserName = () => {
  try {
    const userName = execSync("git config user.name").toString().trim();
    return userName;
  } catch (error) {
    return "Unknown";
  }
};
