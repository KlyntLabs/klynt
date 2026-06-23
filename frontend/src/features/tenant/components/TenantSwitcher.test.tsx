import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import { TenantSwitcher } from "./TenantSwitcher";

it("renders the active tenant name", async () => {
  render(<TenantSwitcher />);
  expect(await screen.findByText("Acme")).toBeInTheDocument();
});
