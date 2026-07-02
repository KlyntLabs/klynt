import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import { RendererSwitch } from "./renderer-switch";

const folderChildren: IconTreeNode[] = [
  {
    appId: "child-1",
    x: 0,
    y: 0,
    title: "Child App",
  },
];

describe("RendererSwitch", () => {
  it.each([
    ["markdown", { text: "# Hello" }, "markdown-preview"],
    ["notes", { text: "A note" }, "notes-editor"],
    ["video", { src: "https://example.com/video.mp4" }, "video-player"],
    ["folder", { children: folderChildren }, "folder-item-child-1"],
  ] as const)("renders the %s renderer when rendererId is %s", (rendererId, content, testId) => {
    render(<RendererSwitch rendererId={rendererId} content={content} />);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it("renders nothing for an unknown renderer id", () => {
    const { container } = render(<RendererSwitch rendererId="unknown" content={{}} />);

    expect(container.firstChild).toBeNull();
  });
});
