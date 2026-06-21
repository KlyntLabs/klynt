import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";

describe("Carousel interactions", () => {
  it("renders carousel with previous/next buttons", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
  });

  it("handles keyboard navigation", () => {
    const { container } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
      </Carousel>
    );
    const carousel = container.querySelector('[data-slot="carousel"]');
    expect(carousel).toBeInTheDocument();
    fireEvent.keyDown(carousel as Element, { key: "ArrowRight" });
    fireEvent.keyDown(carousel as Element, { key: "ArrowLeft" });
  });

  it("renders vertical carousel", () => {
    render(
      <Carousel orientation="vertical">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    );
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
  });

  it("calls setApi when api is available", () => {
    const setApi = vi.fn();
    render(
      <Carousel setApi={setApi}>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    );
    expect(setApi).toHaveBeenCalled();
  });
});
