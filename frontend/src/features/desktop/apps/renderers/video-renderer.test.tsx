import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { VideoRenderer } from "./video-renderer";

describe("VideoRenderer", () => {
  it("renders a video element with the provided HTTPS src", () => {
    render(<VideoRenderer content={{ src: "https://example.com/video.mp4" }} readOnly />);

    const video = screen.getByTestId("video-player") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.src).toBe("https://example.com/video.mp4");
    expect(video).toHaveAttribute("controls");
  });

  it("renders an empty state for an HTTP src", () => {
    render(<VideoRenderer content={{ src: "http://example.com/video.mp4" }} readOnly />);

    expect(screen.getByTestId("video-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("video-player")).not.toBeInTheDocument();
  });

  it("renders an empty state when src is missing", () => {
    render(<VideoRenderer content={{}} readOnly />);

    expect(screen.getByTestId("video-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("video-player")).not.toBeInTheDocument();
  });

  it("renders an empty state when src is not a string", () => {
    render(<VideoRenderer content={{ src: 123 }} readOnly />);

    expect(screen.getByTestId("video-empty-state")).toBeInTheDocument();
  });

  it("shows an HTTPS warning when the user types an http:// URL", async () => {
    const user = userEvent.setup();

    render(<VideoRenderer content={{ src: "https://example.com/video.mp4" }} readOnly={false} />);

    const input = screen.getByTestId("video-url-input");
    await user.clear(input);
    await user.type(input, "http://insecure.com/video.mp4");

    expect(screen.getByTestId("video-https-warning")).toBeInTheDocument();
  });

  it("calls onChange with debounced updates in editable mode", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <VideoRenderer
        content={{ src: "https://example.com/video.mp4" }}
        readOnly={false}
        onChange={handleChange}
      />
    );

    const input = screen.getByTestId("video-url-input");
    await user.clear(input);
    await user.type(input, "https://example.com/new.mp4");

    expect(handleChange).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith({
          src: "https://example.com/new.mp4",
        });
      },
      { timeout: 1000 }
    );
  });

  it("does not render the URL input in readOnly mode", () => {
    render(<VideoRenderer content={{ src: "https://example.com/video.mp4" }} readOnly />);

    expect(screen.queryByTestId("video-url-input")).not.toBeInTheDocument();
  });
});
