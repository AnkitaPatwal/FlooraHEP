import { Route, Routes } from "react-router-dom";
import AssignPackageAssignForm from "./assignPackage/AssignPackageAssignForm";
import AssignPackageAssignmentEdit from "./assignPackage/AssignPackageAssignmentEdit";
import AssignPackageAssignmentSessions from "./assignPackage/AssignPackageAssignmentSessions";
import AssignPackagePatientSession from "./assignPackage/AssignPackagePatientSession";
import AssignPackageUserList from "./assignPackage/AssignPackageUserList";

export default function AssignPackage() {
  return (
    <Routes>
      <Route index element={<AssignPackageUserList />} />
      <Route
        path=":userId/assignment/:assignmentId/session/:moduleId"
        element={<AssignPackagePatientSession />}
      />
      <Route
        path=":userId/assignment/:assignmentId/sessions"
        element={<AssignPackageAssignmentSessions />}
      />
      <Route
        path=":userId/assignment/:assignmentId"
        element={<AssignPackageAssignmentEdit />}
      />
      <Route path=":userId" element={<AssignPackageAssignForm />} />
    </Routes>
  );
}
