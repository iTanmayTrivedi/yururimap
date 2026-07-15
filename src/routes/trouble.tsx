import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/trouble")({
  component: () => <Navigate to="/post/$type" params={{ type: "request" }} replace />,
});
