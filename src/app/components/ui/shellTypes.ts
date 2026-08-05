export interface ShellUser {
  id: string;
  displayName: string;
  email: string;
}

export interface ShellOrganisation {
  id: string;
  name: string;
}

export type PlatformRole =
  | "PLATFORM_ADMIN"
  | "SOLUTION_DESIGNER"
  | "RUNTIME_USER";
