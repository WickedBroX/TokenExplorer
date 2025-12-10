import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTokenInfo } from "../useTokenInfo";
import axios from "axios";

vi.mock("axios");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTokenInfo", () => {
  it("should fetch token info successfully", async () => {
    const mockData = {
      name: "BZR Token",
      symbol: "BZR",
      decimals: 18,
      formattedTotalSupply: "555555555",
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useTokenInfo(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle error when fetching token info", async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error("API Error"));

    const { result } = renderHook(() => useTokenInfo(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
