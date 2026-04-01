import { Navigate, useParams } from "react-router-dom";

/**
 * Canonical patient plan editing lives at `…/assignment/:assignmentId/sessions`.
 * This route keeps short URLs and bookmarks working.
 */
export default function AssignPackageAssignmentEdit() {
  const { userId, assignmentId } = useParams<{
    userId: string;
    assignmentId: string;
  }>();
  if (!userId || !assignmentId) {
    return <Navigate to="/assign-package" replace />;
  }
  return <Navigate to="sessions" replace />;
}
