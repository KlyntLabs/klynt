import { membersHandlers } from "./handlers/members.handlers";
import { permissionsHandlers } from "./handlers/permissions.handlers";
import { tenantHandlers } from "./handlers/tenant.handlers";
import { usersHandlers } from "./handlers/users.handlers";

export const handlers = [
  ...usersHandlers,
  ...tenantHandlers,
  ...permissionsHandlers,
  ...membersHandlers,
];
