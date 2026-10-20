import { Navigate, type RouteObject } from "react-router";
import { App } from "./App";

// Shared by the browser router in main.tsx and the in-memory router in tests, so tests
// exercise the real routes. Redirects replace the history entry, so Back doesn't land on
// the address that only redirected.
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/patients" replace /> },
  { path: "/patients", element: <App /> },
  { path: "*", element: <Navigate to="/patients" replace /> },
];
