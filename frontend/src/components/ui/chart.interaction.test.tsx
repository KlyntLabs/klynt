import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from "./chart";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe("Chart interactions", () => {
  it("renders ChartContainer with color config", () => {
    render(
      <ChartContainer
        config={{
          desktop: { label: "Desktop", color: "#2563eb" },
        }}
      >
        <div data-testid="chart-child">child</div>
      </ChartContainer>
    );
    expect(screen.getByTestId("chart-child")).toBeInTheDocument();
  });

  it("renders ChartContainer with theme config", () => {
    render(
      <ChartContainer
        config={{
          mobile: {
            label: "Mobile",
            theme: { light: "#60a5fa", dark: "#3b82f6" },
          },
        }}
      >
        <div data-testid="chart-child">child</div>
      </ChartContainer>
    );
    expect(screen.getByTestId("chart-child")).toBeInTheDocument();
  });

  it("renders tooltip with default indicator", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartTooltipContent
          active
          label="January"
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 186,
              color: "#2563eb",
              payload: { desktop: 186 },
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("January")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("186")).toBeInTheDocument();
  });

  it("renders tooltip with line indicator and formatter", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartTooltipContent
          active
          indicator="line"
          hideLabel
          formatter={(value) => <span data-testid="formatted">{value}</span>}
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 200,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByTestId("formatted")).toHaveTextContent("200");
  });

  it("renders tooltip with dashed indicator and nested label", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartTooltipContent
          active
          indicator="dashed"
          labelFormatter={(value) => <span data-testid="label">{value}</span>}
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 200,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByTestId("label")).toBeInTheDocument();
  });

  it("renders tooltip with icon and hideIndicator", () => {
    const Icon = () => <span data-testid="icon">icon</span>;
    render(
      <ChartContainer config={{ desktop: { label: "Desktop", icon: Icon } }}>
        <ChartTooltipContent
          active
          hideIndicator
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 200,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("returns null when tooltip is not active", () => {
    const { container } = render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartTooltipContent
          active={false}
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 200,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(container.querySelector("[data-slot='chart-tooltip-content']")).toBeNull();
  });

  it("renders legend content with payload", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartLegendContent
          payload={[{ value: "desktop", dataKey: "desktop", color: "#2563eb" }]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("Desktop")).toBeInTheDocument();
  });

  it("renders legend content with icon", () => {
    const Icon = () => <span data-testid="legend-icon">icon</span>;
    render(
      <ChartContainer config={{ desktop: { label: "Desktop", icon: Icon } }}>
        <ChartLegendContent
          payload={[{ value: "desktop", dataKey: "desktop", color: "#2563eb" }]}
        />
      </ChartContainer>
    );
    expect(screen.getByTestId("legend-icon")).toBeInTheDocument();
  });

  it("renders legend content with hidden icon", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartLegendContent
          hideIcon
          payload={[{ value: "desktop", dataKey: "desktop", color: "#2563eb" }]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("Desktop")).toBeInTheDocument();
  });

  it("returns null when legend payload is empty", () => {
    const { container } = render(
      <ChartContainer config={{}}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>
    );
    expect(container.querySelector('[data-slot="chart"]')).toBeInTheDocument();
  });

  it("renders tooltip with nested label for non-dot indicator", () => {
    render(
      <ChartContainer config={{ desktop: { label: "Desktop" } }}>
        <ChartTooltipContent
          active
          indicator="line"
          label="January"
          payload={[
            {
              name: "desktop",
              dataKey: "desktop",
              value: 200,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("January")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
  });

  it("renders tooltip with payload key matching config", () => {
    render(
      <ChartContainer config={{ mobile: { label: "Mobile" } }}>
        <ChartTooltipContent
          active
          payload={[
            {
              name: "phone",
              dataKey: "mobile",
              value: 100,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("renders tooltip with null label when value is missing", () => {
    render(
      <ChartContainer config={{}}>
        <ChartTooltipContent
          active
          label={undefined}
          payload={[
            {
              name: "unknown",
              dataKey: "unknown",
              value: 100,
              color: "#2563eb",
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders tooltip with nested payload key matching config", () => {
    render(
      <ChartContainer config={{ mobile: { label: "Mobile" } }}>
        <ChartTooltipContent
          active
          payload={[
            {
              name: "phone",
              dataKey: "value",
              value: 100,
              color: "#2563eb",
              payload: { value: "mobile" },
            },
          ]}
        />
      </ChartContainer>
    );
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });
});
