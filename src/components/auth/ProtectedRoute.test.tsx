import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

type AuthShape = { user: unknown; loading: boolean };

function renderAt(auth: AuthShape) {
  vi.mocked(useAuth).mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>sign in page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a loading state while the session resolves", () => {
    renderAt({ user: null, loading: true });
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    renderAt({ user: null, loading: false });
    expect(screen.getByText("sign in page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders children for an authenticated user", () => {
    renderAt({ user: { id: "u1" }, loading: false });
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
