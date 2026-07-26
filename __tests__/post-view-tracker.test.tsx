import { act, render, screen } from "@testing-library/react";
import {
  PostViewBatchProvider,
  PostViewTracker,
} from "@/components/post-view-tracker";

describe("PostViewTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    global.IntersectionObserver = class IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [0.5];

      constructor(private callback: IntersectionObserverCallback) {}

      observe = (element: Element) => {
        this.callback(
          [
            {
              isIntersecting: true,
              intersectionRatio: 0.5,
              target: element,
            } as IntersectionObserverEntry,
          ],
          this,
        );
      };

      disconnect = jest.fn();
      unobserve = jest.fn();
      takeRecords = () => [];
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders a semantic article and batches its view", () => {
    render(
      <PostViewBatchProvider userId="user-1">
        <PostViewTracker postId="post-1" ariaLabel="Post by Ada">
          <p>Post content</p>
        </PostViewTracker>
      </PostViewBatchProvider>,
    );

    expect(
      screen.getByRole("article", { name: "Post by Ada" }),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(750);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/posts/views",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ postIds: ["post-1"] }),
      }),
    );
  });
});
