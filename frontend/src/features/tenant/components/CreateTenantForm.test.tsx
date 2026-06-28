import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/render";
import { CreateTenantForm } from "./CreateTenantForm";

it("submits the form with slug and name", async () => {
  const user = userEvent.setup();
  const onSuccess = vi.fn();
  render(<CreateTenantForm onSuccess={onSuccess} />);

  await user.type(screen.getByLabelText(/tenant name/i), "New Tenant");
  await user.type(screen.getByLabelText(/tenant slug/i), "new-tenant");
  await user.click(screen.getByRole("button", { name: /create tenant/i }));

  expect(await screen.findByText(/create tenant/i)).toBeInTheDocument();
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
