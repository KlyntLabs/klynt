import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { VerifyEmailApp } from "./verify-email-app";

function renderAt(token: string) {
  return render(
    <Routes>
      <Route path="/verify/:token" element={<VerifyEmailApp />} />
    </Routes>,
    { initialEntries: [`/verify/${token}`] }
  );
}

describe("VerifyEmailApp", () => {
  it("shows a spinner while the token is being verified", () => {
    const { container } = renderAt("pending-token");

    expect(container.querySelector(".astryx-spinner")).toBeInTheDocument();
  });

  it("shows an error banner with a way back to login when verification fails", async () => {
    // The default handler rejects the token "invalid" with a 400 { error: "Invalid token" }.
    renderAt("invalid");

    // The error toast repeats the message, so scope the assertions to the banner: it is the
    // only one of the two that offers a way out.
    const link = await screen.findByRole("link", { name: /back to login/i });
    expect(link).toHaveAttribute("href", "/login");

    const banner = link.closest('[role="alert"]');
    expect(banner).toHaveTextContent("Verification failed");
    expect(banner).toHaveTextContent("Invalid token");
  });

  it("stops showing the spinner once verification has failed", async () => {
    // The regression this guards: a failed verification used to spin forever, so an expired
    // link left the user staring at a spinner with no way forward.
    const { container } = renderAt("invalid");

    expect(container.querySelector(".astryx-spinner")).toBeInTheDocument();

    await screen.findByRole("link", { name: /back to login/i });
    expect(container.querySelector(".astryx-spinner")).not.toBeInTheDocument();
  });
});
