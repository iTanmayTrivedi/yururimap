import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/trouble")({
  component: () => <Navigate to="/post/$category" params={{ category: "kurashi" }} replace />,
});
