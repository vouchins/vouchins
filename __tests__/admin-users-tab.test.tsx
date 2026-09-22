import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UsersTab } from "@/components/admin/users-tab";

describe("Admin UsersTab Component - City Filter", () => {
  const mockUsers = [
    {
      id: "u-1",
      full_name: "Aarav Sharma",
      email: "aarav@google.com",
      personal_email: "aarav@gmail.com",
      city: "Hyderabad",
      vouch_score: 10,
      is_active: true,
      is_admin: false,
      is_marketing_manager: false,
      is_verified: true,
      onboarded: true,
      created_at: "2026-01-01T00:00:00Z",
      company: { id: "c-1", name: "Google" },
    },
    {
      id: "u-2",
      full_name: "Bhavna Patel",
      email: "bhavna@microsoft.com",
      personal_email: "bhavna@gmail.com",
      city: "Bangalore",
      vouch_score: 5,
      is_active: true,
      is_admin: false,
      is_marketing_manager: false,
      is_verified: true,
      onboarded: true,
      created_at: "2026-02-01T00:00:00Z",
      company: { id: "c-2", name: "Microsoft" },
    },
    {
      id: "u-3",
      full_name: "Carlos Rivera",
      email: "carlos@amazon.com",
      personal_email: "carlos@gmail.com",
      city: "Global",
      vouch_score: 2,
      is_active: true,
      is_admin: false,
      is_marketing_manager: false,
      is_verified: false,
      onboarded: true,
      created_at: "2026-03-01T00:00:00Z",
      company: { id: "c-3", name: "Amazon" },
    },
  ];

  const defaultProps = {
    users: mockUsers,
    onUpdateUser: jest.fn(),
    onAdjustVouchScore: jest.fn(),
    onDeleteUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders users with their respective cities", () => {
    render(<UsersTab {...defaultProps} />);

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Bhavna Patel")).toBeInTheDocument();
    expect(screen.getByText("Carlos Rivera")).toBeInTheDocument();

    expect(screen.getByText("Hyderabad")).toBeInTheDocument();
    expect(screen.getByText("Bangalore")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("filters users by city when selected from dropdown", () => {
    render(<UsersTab {...defaultProps} />);

    // Open City combobox filter
    const cityButtons = screen.getAllByRole("combobox");
    // Find the button with 'All Cities'
    const cityFilterButton = cityButtons.find((btn) => btn.textContent?.includes("All Cities"));
    expect(cityFilterButton).toBeDefined();

    if (cityFilterButton) {
      fireEvent.click(cityFilterButton);
      // Select 'Hyderabad'
      const hyderabadOption = screen.getAllByText("Hyderabad").find((el) => el.tagName === "BUTTON");
      if (hyderabadOption) {
        fireEvent.click(hyderabadOption);
      }
    }

    // Should only show Aarav Sharma
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.queryByText("Bhavna Patel")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Rivera")).not.toBeInTheDocument();

    // Active filter badge should be present
    expect(screen.getByText(/City:\s*Hyderabad/i)).toBeInTheDocument();
    expect(screen.getByText("1 of 3 results")).toBeInTheDocument();
  });

  it("filters users when searching by city name in main search", () => {
    render(<UsersTab {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search by name, email or city...");
    fireEvent.change(searchInput, { target: { value: "Bangalore" } });

    expect(screen.queryByText("Aarav Sharma")).not.toBeInTheDocument();
    expect(screen.getByText("Bhavna Patel")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Rivera")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3 results")).toBeInTheDocument();
  });

  it("displays empty state with clear filters button when 0 results match", () => {
    render(<UsersTab {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search by name, email or city...");
    fireEvent.change(searchInput, { target: { value: "NonExistentCityOrUser" } });

    expect(screen.getByText("No users found")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("resets city filter on clicking Clear All", () => {
    render(<UsersTab {...defaultProps} />);

    const cityButtons = screen.getAllByRole("combobox");
    const cityFilterButton = cityButtons.find((btn) => btn.textContent?.includes("All Cities"));
    if (cityFilterButton) {
      fireEvent.click(cityFilterButton);
      const hyderabadOption = screen.getAllByText("Hyderabad").find((el) => el.tagName === "BUTTON");
      if (hyderabadOption) {
        fireEvent.click(hyderabadOption);
      }
    }

    expect(screen.getByText("Clear All")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear All"));

    // All users should be visible again
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Bhavna Patel")).toBeInTheDocument();
    expect(screen.getByText("Carlos Rivera")).toBeInTheDocument();
  });
});
