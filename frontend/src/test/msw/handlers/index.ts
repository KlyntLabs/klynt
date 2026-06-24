import { membersHandlers } from "./members.handlers";
import { permissionsHandlers } from "./permissions.handlers";
import { tenantHandlers } from "./tenant.handlers";
import { tenantLayoutHandlers } from "./tenant-layout-handler";
import { usersHandlers } from "./users.handlers";

export const handlers = [
  ...usersHandlers,
  ...tenantHandlers,
  ...tenantLayoutHandlers,
  ...permissionsHandlers,
  ...membersHandlers,
];
