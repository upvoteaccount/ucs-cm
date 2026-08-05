export interface ShellUser {
  id: string;
  displayName: string;
  email: string;
}

export interface ShellOrganisation {
  id: string;
  name: string;
}

export interface ShellPresentationUser {
  displayName: string;
  email: string;
}

export interface ShellPresentationOrganisation {
  name: string;
}

export interface ShellSessionPresentation {
  user: ShellPresentationUser;
  organisation: ShellPresentationOrganisation;
  platformRoles: PlatformRole[];
}

export type PlatformRole =
  | "PLATFORM_ADMIN"
  | "SOLUTION_DESIGNER"
  | "RUNTIME_USER";
