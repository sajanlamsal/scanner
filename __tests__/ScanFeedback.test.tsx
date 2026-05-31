import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ScanFeedback from "@/components/scanner/ScanFeedback";

// Mock navigator.vibrate
Object.defineProperty(navigator, "vibrate", {
  value: jest.fn(),
  writable: true,
});

describe("ScanFeedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (navigator.vibrate as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders green overlay with attendee name on success", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback
        result="success"
        attendeeName="Gurung Anjala"
        checkedInAt="2026-05-30T10:00:00.000Z"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Checked In!")).toBeInTheDocument();
    expect(screen.getByText("Gurung Anjala")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-green-500");
  });

  it("renders amber overlay on already_scanned", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback
        result="already_scanned"
        attendeeName="Gurung Anjala"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Already Scanned")).toBeInTheDocument();
    expect(screen.getByText("This ticket was already used")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-amber-400");
  });

  it("renders red overlay on not_found", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback
        result="not_found"
        attendeeName={null}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Not Found")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-red-500");
  });

  it("renders red overlay on inactive", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback
        result="inactive"
        attendeeName="Test User"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-red-700");
  });

  it("calls onDismiss after 1800ms", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback result="success" attendeeName="Gurung Anjala" onDismiss={onDismiss} />
    );

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1800);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss immediately when clicked", () => {
    const onDismiss = jest.fn();
    render(
      <ScanFeedback result="success" attendeeName="Gurung Anjala" onDismiss={onDismiss} />
    );

    fireEvent.click(screen.getByRole("status"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("triggers haptic vibration on success", () => {
    render(
      <ScanFeedback result="success" attendeeName="Gurung Anjala" onDismiss={jest.fn()} />
    );
    expect(navigator.vibrate).toHaveBeenCalledWith([100]);
  });

  it("triggers different vibration pattern on error", () => {
    render(
      <ScanFeedback result="not_found" attendeeName={null} onDismiss={jest.fn()} />
    );
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50]);
  });

  it("shows check-in time on success when checkedInAt is provided", () => {
    render(
      <ScanFeedback
        result="success"
        attendeeName="Gurung Anjala"
        checkedInAt="2026-05-30T14:04:27.819Z"
        onDismiss={jest.fn()}
      />
    );
    // Time string rendered somewhere
    const time = new Date("2026-05-30T14:04:27.819Z").toLocaleTimeString();
    expect(screen.getByText(time)).toBeInTheDocument();
  });
});
