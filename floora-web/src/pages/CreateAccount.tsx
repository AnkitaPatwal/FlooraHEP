import { useNavigate } from "react-router-dom";
import "../App.css";

export default function CreateAccount() {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <form className="login-card create-card">
        {/* Back circle */}
        <button
          type="button"
          className="back-circle"
          aria-label="Go back"
          onClick={() => navigate("/")}
        >
          ←
        </button>

        {/* Fixed 313px column for perfect alignment */}
        <div className="ca-col">
          <h2 className="create-title">Create Account</h2>
          <p className="create-helper">Please enter your information below</p>

          <div className="field">
            <label className="field-label">First Name</label>
            <input className="input ca-input" type="text" />
          </div>

          <div className="field">
            <label className="field-label">Last Name</label>
            <input className="input ca-input" type="text" />
          </div>

          <div className="field">
            <label className="field-label">Email (Username)</label>
            <input className="input ca-input" type="email" />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input className="input ca-input" type="password" />
          </div>

          <div className="field">
            <label className="field-label">Re-enter Password</label>
            <input className="input ca-input" type="password" />
          </div>

          <button type="button" className="signin create-btn">
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
}
