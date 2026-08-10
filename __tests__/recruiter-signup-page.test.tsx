import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterSignupPage from "@/app/recruiter/signup/page";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("next/link", () => {
  return ({ href, children }: any) => <a href={href}>{children}</a>;
});

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, ...props }: any) => <img {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

describe("RecruiterSignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({
        code: "already_registered",
        error:
          "You already have a Vouchins account. Please sign in with your existing credentials to continue as a recruiter.",
      }),
    })) as jest.Mock;
  });

  it("shows login guidance and link for existing users", async () => {
    render(<RecruiterSignupPage />);

    fireEvent.change(screen.getByPlaceholderText("Vouchins Corporation"), {
      target: { value: "Example Co" },
    });
    fireEvent.change(screen.getByPlaceholderText("hiring@vouchins.com"), {
      target: { value: "recruiter@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter secure password"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("billing@vouchins.com"), {
      target: { value: "billing@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register as recruiter/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/you already have a vouchins account/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /go to recruiter login/i })).toHaveAttribute(
      "href",
      "/recruiter/login",
    );
  });
});
