import chalk from "chalk";

export const log = {
  success: (message: string) => {
    console.log(chalk.green("✔ ") + message);
  },
  error: (message: string) => {
    console.error(chalk.red.bold("✖ Error: ") + chalk.red(message));
    process.exit(1);
  },
  info: (message: string) => {
    console.log(chalk.cyan("ℹ ") + message);
  },
  warning: (message: string) => {
    console.log(chalk.yellow("⚠ ") + message);
  },
  message: (message: string) => {
    console.log(message);
  },
};
