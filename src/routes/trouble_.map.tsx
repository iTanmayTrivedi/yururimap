import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/trouble_/map")({
  component: () => <Navigate to="/map" replace />,
});
