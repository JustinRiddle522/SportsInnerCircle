import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070A",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        padding: "60px 20px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#D4AF37",
            textDecoration: "none",
            marginBottom: 40,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Back to Home
        </Link>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 900,
            marginBottom: 24,
            letterSpacing: "-0.02em",
          }}
        >
          Privacy Policy
        </h1>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.8,
            color: "rgba(255,255,255,.7)",
          }}
        >
          <p>Last Updated: January 2026</p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly when submitting an application,
            contacting us, or interacting with our platform. This may include your name,
            email address, phone number, and any additional information you choose to provide.
          </p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            2. How We Use Your Information
          </h2>
          <p>
            Your information is used to review applications, communicate with you,
            provide access to services, and improve overall system performance.
            All usage is strictly aligned with operating and maintaining our services.
          </p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            3. Data Privacy & Sharing
          </h2>
          <p>
            We do not sell, rent, or trade your personal information. Information may be
            shared only when necessary to operate our services, comply with legal obligations,
            or protect our rights.
          </p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            4. Data Security
          </h2>
          <p>
            We take reasonable measures to protect your information from unauthorized access,
            loss, or misuse. While no system is completely secure, we continuously improve
            safeguards to maintain data integrity.
          </p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            5. Your Rights
          </h2>
          <p>
            You may request access to, correction of, or deletion of your personal information
            at any time through available communication channels.
          </p>

          <h2 style={{ color: "#D4AF37", marginTop: 32 }}>
            6. Contact
          </h2>
          <p>
            For any questions regarding this policy, you may contact us through the
            communication channels provided on this website.
          </p>

          <p
            style={{
              marginTop: 40,
              fontSize: 12,
              color: "rgba(255,255,255,.4)",
            }}
          >
            Sports Private Capital © 2026
          </p>
        </div>
      </div>
    </div>
  );
}