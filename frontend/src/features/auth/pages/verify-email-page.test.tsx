import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import VerifyEmailPage from "./verify-email-page";

describe("VerifyEmailPage", () => {
  it("renders verification loading state", () => {
    server.use(
      http.post("/api/v1/auth/verify-email", () =>
        HttpResponse.json({ message: "Email verified successfully" })
      )
    );

    render(<VerifyEmailPage />, { initialEntries: ["/?token=abc123"] });
    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
  });
});
