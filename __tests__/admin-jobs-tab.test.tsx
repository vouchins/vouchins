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
});

