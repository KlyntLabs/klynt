import type { AppManifest, AppRegistry, DesktopContext } from "../apps/types";
import type { MenubarSchema } from "../menubar/types";
import type { BackgroundConfig, PersistenceAdapter } from "../persistence/types";

export type DesktopConfig = {
  id: string;
  title: string;
  apps: AppRegistry;
  defaultApp?: AppManifest;
  menubar: MenubarSchema;
  background: BackgroundConfig;
  persistence: PersistenceAdapter;
  context: DesktopContext;
  locked?: boolean;
  singleApp?: boolean;
};
