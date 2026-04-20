import AppLayout from "../components/layouts/AppLayout";
import AssignPackagePatientSession from "./assignPackage/AssignPackagePatientSession";

/**
 * Users-page alias for the per-user session editor.
 * This keeps the same component/logic as Assign Package for now,
 * while letting us route under `/users/*` later without breaking anything.
 */
export default function UserAssignedSession() {
  return (
    <AppLayout>
      <AssignPackagePatientSession />
    </AppLayout>
  );
}

