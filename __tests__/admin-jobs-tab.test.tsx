import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JobsTab } from "@/components/admin/jobs-tab";

describe("Admin JobsTab Component", () => {
  const mockJobs = [
    {
      id: "j-1",
      recruiter_id: "rec-1",
      title: "Senior Backend Engineer",
      company_name: "Google",
      company_logo: "https://google.com/logo.png",
      location: "Hyderabad, India",
      job_type: "full-time",
      salary_range: "$120,000 - $160,000",
      experience_level: "senior",
      category: "Engineering",
      impressions: 42,
      is_active: true,
      created_at: "2026-11-10T12:00:00Z",
      updated_at: "2026-11-10T12:00:00Z",
      external_apply_url: "https://careers.google.com/jobs/1",
      description: "Scale distributed cloud infrastructure.",
      requirements: "Go, Kubernetes, Distributed Systems",
    },
    {
      id: "j-2",
      recruiter_id: "rec-2",
      title: "Frontend Developer",
      company_name: "Microsoft",
      company_logo: "https://microsoft.com/logo.png",
      location: "Bengaluru, India",
      job_type: "full-time",
      salary_range: "$80,000 - $110,000",
      experience_level: "mid",
      category: "Engineering",
      impressions: 15,
      is_active: false,
      created_at: "2026-11-09T10:00:00Z",
      updated_at: "2026-11-09T10:00:00Z",
      external_apply_url: "https://careers.microsoft.com/jobs/2",
      description: "Build Next.js web applications.",
      requirements: "TypeScript, React, CSS",
    },
  ];

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/admin/jobs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            jobs: mockJobs,
            total: 2,
            page: 1,
            pageSize: 25,
            totalPages: 1,
            stats: {
              activeJobs: 1,
              totalJobs: 2,
              inactiveJobs: 1,
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders jobs list and top stats cards", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
      expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    });

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
    expect(screen.getByText("Active Jobs")).toBeInTheDocument();
    expect(screen.getByText("Total Database Jobs")).toBeInTheDocument();
  });

  it("filters jobs by search input", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by job title/i);
    fireEvent.change(searchInput, { target: { value: "Google" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Google"),
        expect.anything()
      );
    });
  });

  it("filters jobs using searchable company dropdown", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    // Find and click the company combobox trigger
    const companyCombobox = screen.getByRole("combobox", { name: /Filter by company/i });
    expect(companyCombobox).toHaveTextContent("All Companies");
    fireEvent.click(companyCombobox);

    // Search input inside popover
    const searchInput = screen.getByPlaceholderText(/Search company/i);
    fireEvent.change(searchInput, { target: { value: "Stripe" } });

    // Click "Filter by Stripe anyway"
    const filterAnywayBtn = screen.getByText(/Filter by "Stripe" anyway/i);
    fireEvent.click(filterAnywayBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("company=Stripe"),
        expect.anything()
      );
    });
  });

  it("filters jobs by location input", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    const locationInput = screen.getByPlaceholderText(/Filter location/i);
    fireEvent.change(locationInput, { target: { value: "Hyderabad" } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("location=Hyderabad"),
        expect.anything()
      );
    });
  });

  it("opens inspect modal when clicking job title", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    const jobTitleBtn = screen.getByText("Senior Backend Engineer");
    fireEvent.click(jobTitleBtn);

    await waitFor(() => {
      expect(screen.getByText("Role Description")).toBeInTheDocument();
      expect(screen.getByText("Scale distributed cloud infrastructure.")).toBeInTheDocument();
      expect(screen.getByText("Authentic ATS Application Link")).toBeInTheDocument();
    });
  });

  it("handles row checkbox selection and bulk delete confirmation", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    // Checkbox for j-1
    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /Select job/i });
    expect(rowCheckboxes).toHaveLength(2);

    // Select the first job
    fireEvent.click(rowCheckboxes[0]);

    // Bulk selection bar should now be visible with 1 job selected
    await waitFor(() => {
      expect(screen.getByText(/1 job selected on this page/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete Selected \(1\)/i })).toBeInTheDocument();
    });

    // Click "Delete Selected (1)" to open dialog
    const deleteSelectedBtn = screen.getByRole("button", { name: /Delete Selected \(1\)/i });
    fireEvent.click(deleteSelectedBtn);

    // Bulk delete dialog should be open
    await waitFor(() => {
      expect(screen.getByText(/Permanently Delete 1 Selected Job\?/i)).toBeInTheDocument();
    });

    // Click "Delete Permanently"
    const confirmDeleteBtn = screen.getByRole("button", { name: /Delete Permanently/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/jobs",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ ids: ["j-1"] }),
        })
      );
    });
  });

  it("handles select all on current page via header checkbox and clear selection", async () => {
    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    // Header checkbox to select all
    const selectAllCheckbox = screen.getByRole("checkbox", { name: /Select all jobs on current page/i });
    fireEvent.click(selectAllCheckbox);

    // Bulk toolbar should show 2 jobs selected
    await waitFor(() => {
      expect(screen.getByText(/2 jobs selected on this page/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete Selected \(2\)/i })).toBeInTheDocument();
    });

    // Clear selection
    const clearBtn = screen.getByRole("button", { name: /Clear selection/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/2 jobs selected on this page/i)).not.toBeInTheDocument();
    });
  });

  it("allows selecting all matching jobs across all pages and deleting", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          jobs: mockJobs,
          total: 50,
          page: 1,
          pageSize: 25,
          totalPages: 2,
          stats: { activeJobs: 30, totalJobs: 50, inactiveJobs: 20 },
        }),
      });
    });

    render(<JobsTab />);

    await waitFor(() => {
      expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    });

    // Header checkbox to select all on page
    const selectAllCheckbox = screen.getByRole("checkbox", { name: /Select all jobs on current page/i });
    fireEvent.click(selectAllCheckbox);

    // Option to select all 50 matching jobs should appear
    await waitFor(() => {
      expect(screen.getByText(/Select all 50 jobs matching criteria/i)).toBeInTheDocument();
    });

    const selectAllMatchingBtn = screen.getByText(/Select all 50 jobs matching criteria/i);
    fireEvent.click(selectAllMatchingBtn);

    // Bar now displays all 50 jobs selected
    await waitFor(() => {
      expect(screen.getByText(/All 50 jobs selected across all pages/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delete All \(50\)/i })).toBeInTheDocument();
    });

    // Click delete all
    const deleteAllBtn = screen.getByRole("button", { name: /Delete All \(50\)/i });
    fireEvent.click(deleteAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/Permanently Delete All Matching Jobs\?/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole("button", { name: /Delete Permanently/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/jobs",
        expect.objectContaining({
          method: "DELETE",
          body: expect.stringContaining('"allMatching":true'),
        })
      );
    });
  });
});

