import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/render";
import { TenantSwitcher } from "./TenantSwitcher";

it("renders the active tenant name on the trigger", async () => {
  render(<TenantSwitcher />);

  // Scoped to the trigger, not getByText: Astryx's DropdownMenu keeps its items mounted even
  // when closed, so the tenant name also exists inside the (hidden) menu. An unscoped text
  // query matches both and would pass even if the trigger showed nothing.
  expect(await screen.findByRole("button", { name: "Acme" })).toBeInTheDocument();
});

it("links each tenant to its subdomain", async () => {
  const user = userEvent.setup();
  render(<TenantSwitcher />);

  await user.click(await screen.findByRole("button", { name: "Acme" }));

  // Real anchors, not menuitems. Astryx's DropdownMenu has no href in its item shape and its
  // docs say not to use it for navigation, so the switcher is a Popover of Links — which is
  // what preserves middle-click, open-in-new-tab and copy-link on a cross-subdomain switch.
  const link = await screen.findByRole("link", { name: "Acme" });
  expect(link.getAttribute("href")).toMatch(/^http:\/\/acme\.localhost(:\d+)?\/$/);
});
