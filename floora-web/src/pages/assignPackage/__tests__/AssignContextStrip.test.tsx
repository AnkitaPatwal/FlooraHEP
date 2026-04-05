import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssignContextStrip } from "../ui/AssignContextStrip";

describe("AssignContextStrip", () => {
  it("renders patient, plan, and session together", () => {
    render(
      <AssignContextStrip
        patientLabel="Ankita Patwal"
        planName="Starter Plan"
        sessionName="Session 1: week 1 foundations"
      />,
    );

    expect(screen.getByText(/patient:/i)).toBeInTheDocument();
    expect(screen.getByText("Ankita Patwal")).toBeInTheDocument();

    expect(screen.getByText(/plan:/i)).toBeInTheDocument();
    expect(screen.getByText("Starter Plan")).toBeInTheDocument();

    expect(screen.getByText(/session:/i)).toBeInTheDocument();
    expect(screen.getByText("Session 1: week 1 foundations")).toBeInTheDocument();
  });

  it("shows placeholder when patient is loading", () => {
    render(
      <AssignContextStrip
        patientLabel={null}
        patientLoading
        planName="Starter Plan"
      />,
    );

    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getByText("Starter Plan")).toBeInTheDocument();
  });
});

