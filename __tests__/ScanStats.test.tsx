import React from "react";
import { render, screen } from "@testing-library/react";
import ScanStats from "@/components/scanner/ScanStats";

describe("ScanStats", () => {
  it("displays checked-in count and total", () => {
    render(<ScanStats stats={{ total: 9, checkedIn: 3 }} />);
    // The stat text is "3 / 9 checked in"
    expect(screen.getByText((_, el) =>
      el?.tagName === "SPAN" && el.textContent?.includes("3") && el.textContent?.includes("/ 9 checked in") || false
    )).toBeInTheDocument();
  });

  it("shows 0% when no one checked in", () => {
    render(<ScanStats stats={{ total: 9, checkedIn: 0 }} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows 100% when all checked in", () => {
    render(<ScanStats stats={{ total: 4, checkedIn: 4 }} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows 0% when total is 0 (avoids NaN/divide-by-zero)", () => {
    render(<ScanStats stats={{ total: 0, checkedIn: 0 }} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("rounds percentage correctly", () => {
    // 1 of 3 = 33%
    render(<ScanStats stats={{ total: 3, checkedIn: 1 }} />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});
