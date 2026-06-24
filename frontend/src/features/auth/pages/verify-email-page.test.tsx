import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import VerifyEmailPage from "./verify-email-page";

describe("VerifyEmailPage", () => {
  it("renders the verify email app inside the kiosk desktop", () => {
    server.use(
      http.post("/api/v1/auth/verify-email", () =>
        HttpResponse.json({ message: "Email verified successfully" })
      )
    );

    render(<VerifyEmailPage />, { initialEntries: ["/?token=abc123"] });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
