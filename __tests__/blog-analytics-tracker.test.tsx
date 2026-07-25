import { act, render } from "@testing-library/react";
import posthog from "posthog-js";
import { BlogAnalyticsTracker } from "@/components/blog-analytics-tracker";

jest.mock("posthog-js", () => ({
  capture: jest.fn(),
}));

describe("BlogAnalyticsTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("records one view per tab session and marks sustained reading as engaged", () => {
    const props = {
      postId: "post-1",
      slug: "a-useful-post",
      title: "A useful post",
    };

    const firstRender = render(<BlogAnalyticsTracker {...props} />);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analytics/blog",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ postId: "post-1", eventType: "view" }),
      }),
    );
    expect(posthog.capture).toHaveBeenCalledWith(
      "Blog Viewed",
      expect.objectContaining({ blog_post_id: "post-1" }),
    );

    firstRender.unmount();
    render(<BlogAnalyticsTracker {...props} />);

    const viewCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([, options]) => options.body.includes('"eventType":"view"'),
    );
    expect(viewCalls).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "Blog Engaged",
      expect.objectContaining({
        blog_post_id: "post-1",
        engagement_seconds: 30,
      }),
    );
  });
});
