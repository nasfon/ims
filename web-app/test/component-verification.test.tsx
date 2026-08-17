import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello() {
  return <div>Hello IMS</div>;
}

describe("component test setup", () => {
  it("renders into the jsdom environment", () => {
    render(<Hello />);
    expect(screen.getByText("Hello IMS")).toBeInTheDocument();
  });
});
