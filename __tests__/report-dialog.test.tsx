import { fireEvent, render, screen } from "@testing-library/react";
import { ReportDialog } from "@/components/report-dialog";

jest.mock("posthog-js", () => ({
  capture: jest.fn(),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select
      id="reason"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Select a reason</option>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

describe("ReportDialog", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("blocks a custom reason shorter than three characters before the API call", () => {
    render(
      <ReportDialog
        open
        onOpenChange={jest.fn()}
        targetType="post"
        targetId="post-1"
      />
    );

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Other" },
    });
    fireEvent.change(screen.getByLabelText("Please specify"), {
      target: { value: "no" },
    });
    fireEvent.submit(screen.getByText("Submit Report").closest("form")!);

    expect(
      screen.getByText("Reason must be between 3 and 500 characters")
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
