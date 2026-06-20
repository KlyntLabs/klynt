import { fireEvent, screen } from "@testing-library/react";
import { type CalendarDay } from "react-day-picker";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Calendar, CalendarDayButton } from "./calendar";

describe("Calendar interactions", () => {
  it("navigates to previous and next months", () => {
    render(<Calendar />);
    const previous = screen.getByLabelText("Go to the Previous Month");
    const next = screen.getByLabelText("Go to the Next Month");
    expect(previous).toBeInTheDocument();
    expect(next).toBeInTheDocument();
    fireEvent.click(previous);
    fireEvent.click(next);
  });

  it("renders with dropdown caption layout", () => {
    render(<Calendar captionLayout="dropdown" />);
    expect(screen.getByLabelText("Choose the Month")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose the Year")).toBeInTheDocument();
  });

  it("renders with week numbers", () => {
    const { container } = render(<Calendar showWeekNumber />);
    expect(container.querySelector('[data-slot="calendar"] .rdp-week_number')).toBeInTheDocument();
  });

  it("renders with a selected range", () => {
    render(
      <Calendar
        mode="range"
        selected={{
          from: new Date(2026, 5, 10),
          to: new Date(2026, 5, 15),
        }}
      />
    );
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders day button with focused modifier", () => {
    const day = { date: new Date(2026, 5, 15) } as unknown as CalendarDay;
    render(
      <CalendarDayButton day={day} modifiers={{ focused: true }} onClick={() => undefined}>
        15
      </CalendarDayButton>
    );
    expect(screen.getByText("15")).toBeInTheDocument();
  });
});
