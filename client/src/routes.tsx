import { Navigate, Outlet, type RouteObject, ScrollRestoration } from "react-router";
import { App } from "./App";
import { PatientDetailsPage } from "./features/patients/PatientDetailsPage";
import { NotFoundPage } from "./NotFoundPage";

// Wraps every page. ScrollRestoration puts the window back where it was when the provider
// returns to a page with Back, such as the directory after viewing a patient, and starts
// newly opened pages at the top.
function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

// Shared by the browser router in main.tsx and the in-memory router in tests, so tests
// exercise the real routes. The root redirect replaces the history entry, so Back doesn't
// land on the address that only redirected.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Navigate to="/patients" replace /> },
      { path: "/patients", element: <App /> },
      { path: "/patients/:patientId", element: <PatientDetailsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
