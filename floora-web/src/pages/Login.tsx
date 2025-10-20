import { Link } from "react-router-dom";
import "../App.css";

export default function Login() {
  return (
    <div className="login-container">
      <form className="login-card">
        <h1 className="logo">Floora</h1>
        <p className="subtitle">Health Exercise Program</p>

        <input type="email" placeholder="Email" className="input" />
        <input type="password" placeholder="Password" className="input" />

        <p style={{ textAlign: "center", marginTop: 12 }}>
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>

        <button className="signin">Sign In</button>

        <p className="create-account">
          Don’t have an account? <Link to="/create">Create Account</Link>
        </p>
      </form>
    </div>
  );
}
