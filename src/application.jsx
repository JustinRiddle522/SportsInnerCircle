import { useEffect, useMemo, useState } from "react";
import logoBright from "./assets/images/logo-bright.png";

export default function ApplySurveyPage() {
  const G = "#D4AF37";
  const GL = "#F2D060";
  const GREEN = "#10b981";

  const questions = [
    {
      key: "firstName",
      type: "text",
      label: "First Name",
      placeholder: "ex: John",
      required: true,
    },
    {
      key: "liquidCapital",
      type: "radio",
      label: "How much liquid capital do you currently have available?",
      required: true,
      options: [
        "Under $5,000",
        "$5,000 - $25,000",
        "$25,000 - $100,000",
        "$100,000 - $250,000",
        "$250,000+",
      ],
    },
    {
      key: "allocation",
      type: "radio",
      label: "How much capital would you be willing to allocate?",
      required: true,
      options: [
        "Less than $2,000",
        "$2,000 - $10,000",
        "$10,000 - $50,000",
        "$50,000 - $100,000",
        "$100,000+",
      ],
    },
    {
      key: "annualIncome",
      type: "radio",
      label: "What is your annual income range?",
      required: true,
      options: [
        "Under $100,000",
        "$100,000 - $250,000",
        "$250,000 - $500,000",
        "$500,000 - $1,000,000",
        "$1,000,000+",
      ],
    },
    {
      key: "bettingExperience",
      type: "radio",
      label: "What best describes your experience with sports betting?",
      required: true,
      options: [
        "Completely new",
        "Casual bettor",
        "Consistent bettor",
        "Data-driven bettor",
        "High volume bettor",
      ],
    },
    {
      key: "primaryGoal",
      type: "radio",
      label: "What is your primary goal?",
      required: true,
      options: [
        "Generate side income",
        "Looking for alternative investment",
        "Scale capital",
        "Not sure",
      ],
    },
    {
      key: "involvement",
      type: "radio",
      label: "Which best describes your preferred level of involvement?",
      required: true,
      options: [
        "Fully hands-off",
        "Structured guidance",
        "Independent execution",
        "Just exploring",
      ],
    },
    {
      key: "whyApplying",
      type: "textarea",
      label: "Why are you applying?",
      placeholder:
        "Briefly explain your goals, current situation, and why you think this could be a fit.",
      required: true,
    },
    {
      key: "contactBlock",
      type: "contactBlock",
      label: "Contact Information",
      required: true,
    },
    {
      key: "contactMethod",
      type: "radio",
      label: "Preferred contact method",
      required: true,
      options: ["Text", "Call", "Email"],
    },
  ];

  const totalQuestions = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [animateIn, setAnimateIn] = useState(true);

  const [form, setForm] = useState({
    firstName: "",
    liquidCapital: "",
    allocation: "",
    annualIncome: "",
    bettingExperience: "",
    primaryGoal: "",
    involvement: "",
    whyApplying: "",
    fullName: "",
    phone: "",
    email: "",
    contactMethod: "",
  });

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 20);
    return () => clearTimeout(t);
  }, [currentIndex]);

  const progress = useMemo(() => {
    return Math.round((currentIndex / totalQuestions) * 100);
  }, [currentIndex, totalQuestions]);

  const currentQuestion = questions[currentIndex];

  function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function updateField(key, value) {
    if (key === "phone") {
      value = formatPhoneNumber(value);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  function validateCurrentQuestion() {
    if (currentQuestion.type === "contactBlock") {
      if (!form.fullName.trim()) {
        setError("Please enter your full name");
        return false;
      }

      const rawPhone = form.phone.replace(/\D/g, "");
      if (!rawPhone) {
        setError("Please enter your phone number");
        return false;
      }
      if (rawPhone.length !== 10) {
        setError("Please enter a valid 10-digit phone number");
        return false;
      }

      const email = form.email.trim();
      if (!email) {
        setError("Please enter your email");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email");
        return false;
      }

      return true;
    }

    const value = form[currentQuestion.key];

    if (currentQuestion.required && !String(value).trim()) {
      setError("Please answer this question");
      return false;
    }

    if (currentQuestion.key === "whyApplying" && String(value).trim().length < 12) {
      setError("Please give a bit more detail");
      return false;
    }

    return true;
  }

  function goNext() {
    if (!validateCurrentQuestion()) return;

    if (currentIndex === totalQuestions - 1) {
      console.log("Application submitted:", form);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cardStyle = {
    borderRadius: 26,
    border: "1px solid rgba(212,175,55,.14)",
    background: "linear-gradient(135deg, rgba(14,12,8,.98), rgba(10,10,14,.98))",
    boxShadow: "0 28px 90px rgba(0,0,0,.65)",
    overflow: "hidden",
  };

  const inputStyle = {
    width: "100%",
    height: 58,
    borderRadius: 18,
    border: "1px solid rgba(212,175,55,.16)",
    background: "rgba(255,255,255,.03)",
    color: "#fff",
    fontSize: 16,
    padding: "0 18px",
    outline: "none",
    transition: "all .2s ease",
    WebkitAppearance: "none",
  };

  const textAreaStyle = {
    width: "100%",
    minHeight: 180,
    borderRadius: 18,
    border: "1px solid rgba(212,175,55,.16)",
    background: "rgba(255,255,255,.03)",
    color: "#fff",
    fontSize: 16,
    padding: "16px 18px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
    transition: "all .2s ease",
    WebkitAppearance: "none",
  };

  const buttonBase = {
    minHeight: 56,
    borderRadius: 999,
    padding: "14px 24px",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  function renderRadioOption(option) {
    const checked = form[currentQuestion.key] === option;

    return (
      <label
        key={option}
        style={{
          display: "block",
          cursor: "pointer",
          borderRadius: 18,
          border: checked
            ? "1px solid rgba(16,185,129,.6)"
            : "1px solid rgba(212,175,55,.15)",
          background: checked
            ? "linear-gradient(135deg, rgba(16,185,129,.10), rgba(16,185,129,.04))"
            : "rgba(255,255,255,.025)",
          padding: "16px",
          transition: "all .25s ease",
          transform: checked ? "translateY(-2px)" : "translateY(0)",
          boxShadow: checked ? "0 0 24px rgba(16,185,129,.12)" : "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <input
          type="radio"
          name={currentQuestion.key}
          value={option}
          checked={checked}
          onChange={(e) => updateField(currentQuestion.key, e.target.value)}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: checked ? `5px solid ${GREEN}` : "1px solid rgba(255,255,255,.28)",
              background: checked ? "#07130f" : "transparent",
              flexShrink: 0,
              transition: "all .2s ease",
            }}
          />
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            {option}
          </div>
        </div>
      </label>
    );
  }

  function renderContactBlock() {
    return (
      <div
        style={{
          display: "grid",
          gap: 16,
          maxWidth: 760,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              color: "rgba(255,255,255,.82)",
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            placeholder="ex: John Doe"
            style={inputStyle}
            autoComplete="name"
            inputMode="text"
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              color: "rgba(255,255,255,.82)",
            }}
          >
            Phone Number
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="ex: (248) 555-1234"
            style={inputStyle}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              color: "rgba(255,255,255,.82)",
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="ex: JohnDoe@gmail.com"
            style={inputStyle}
            autoComplete="email"
            inputMode="email"
          />
        </div>
      </div>
    );
  }

  function renderQuestion() {
    if (currentQuestion.type === "text" || currentQuestion.type === "email") {
      return (
        <input
          type={currentQuestion.type}
          value={form[currentQuestion.key]}
          onChange={(e) => updateField(currentQuestion.key, e.target.value)}
          placeholder={currentQuestion.placeholder || ""}
          style={inputStyle}
          autoFocus
          inputMode={currentQuestion.type === "email" ? "email" : "text"}
        />
      );
    }

    if (currentQuestion.type === "textarea") {
      return (
        <textarea
          value={form[currentQuestion.key]}
          onChange={(e) => updateField(currentQuestion.key, e.target.value)}
          placeholder={currentQuestion.placeholder || ""}
          style={textAreaStyle}
          autoFocus
        />
      );
    }

    if (currentQuestion.type === "radio") {
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {currentQuestion.options.map(renderRadioOption)}
        </div>
      );
    }

    if (currentQuestion.type === "contactBlock") {
      return renderContactBlock();
    }

    return null;
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#07070A",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          padding: "16px 14px 40px",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; }
          body { margin: 0; }
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(18px) scale(.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (max-width: 640px) {
            .submit-wrap {
              padding: 48px 18px !important;
            }
            .submit-title {
              font-size: 32px !important;
            }
          }
        `}</style>

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ ...cardStyle, animation: "fadeUp .55s cubic-bezier(.16,1,.3,1)" }}>
            <div className="submit-wrap" style={{ padding: "72px 24px", textAlign: "center" }}>
              <img
                src={logoBright}
                alt="Logo"
                style={{
                  width: 82,
                  height: 82,
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto 22px",
                  filter: "drop-shadow(0 0 18px rgba(212,175,55,.28))",
                }}
              />

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: "1px solid rgba(16,185,129,.28)",
                  background: "rgba(16,185,129,.08)",
                  padding: "7px 16px",
                  color: "#34d399",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  marginBottom: 22,
                }}
              >
                Application Received
              </div>

              <h1
                className="submit-title"
                style={{
                  fontSize: "clamp(28px,4.8vw,52px)",
                  fontWeight: 900,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "-.03em",
                  margin: "0 0 12px",
                  lineHeight: 1.02,
                }}
              >
                Submission Complete
              </h1>

              <p
                style={{
                  maxWidth: 560,
                  margin: "0 auto 30px",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,.48)",
                }}
              >
                Your application has been received and is now under review. If selected,
                we will reach out directly using the contact information provided.
              </p>

              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  ...buttonBase,
                  background: `linear-gradient(135deg, ${GL}, ${G})`,
                  color: "#05030A",
                  boxShadow: "0 12px 40px rgba(212,175,55,.28)",
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070A",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; }
        body { margin: 0; }
        textarea::placeholder, input::placeholder {
          color: rgba(255,255,255,.25);
        }
        @keyframes fadeSlideIn {
          0% {
            opacity: 0;
            transform: translateY(22px) scale(.985);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(212,175,55,0); }
          50% { box-shadow: 0 0 24px rgba(212,175,55,.08); }
        }
        @media (max-width: 640px) {
          .survey-main {
            padding: 14px 12px 28px !important;
          }
          .survey-card {
            border-radius: 22px !important;
          }
          .survey-top {
            padding: 18px 16px 14px !important;
          }
          .survey-body {
            padding: 28px 16px 22px !important;
          }
          .survey-footer {
            padding: 16px !important;
            flex-direction: column !important;
          }
          .survey-footer button {
            width: 100% !important;
          }
          .survey-header-row {
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .survey-logo {
            width: 46px !important;
            height: 46px !important;
          }
          .survey-heading {
            font-size: 20px !important;
          }
          .survey-question-count {
            margin-bottom: 10px !important;
          }
          .survey-question-title {
            font-size: 31px !important;
            line-height: 1.02 !important;
            margin-bottom: 20px !important;
          }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse at top, rgba(212,175,55,.06) 0%, transparent 42%), radial-gradient(ellipse at bottom, rgba(16,185,129,.05) 0%, transparent 30%)",
        }}
      />

      <main
        className="survey-main"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 980,
          margin: "0 auto",
          padding: "22px 16px 50px",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,.52)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            ← Back
          </a>
        </div>

        <div className="survey-card" style={{ ...cardStyle, animation: "glowPulse 4s ease-in-out infinite" }}>
          <div
            className="survey-top"
            style={{
              padding: "28px 24px 18px",
              borderBottom: "1px solid rgba(212,175,55,.10)",
            }}
          >
            <div
              className="survey-header-row"
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <img
                  className="survey-logo"
                  src={logoBright}
                  alt="Logo"
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "contain",
                    filter: "drop-shadow(0 0 16px rgba(212,175,55,.25))",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    className="survey-heading"
                    style={{
                      color: "#fff",
                      fontSize: 24,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "-.02em",
                      lineHeight: 1.2,
                    }}
                  >
                    Applicant Review Form
                  </div>
                </div>
              </div>

              <div style={{ minWidth: 180, flex: "1 1 220px", maxWidth: 280, width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "rgba(255,255,255,.42)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".14em",
                    marginBottom: 8,
                  }}
                >
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${GL}, ${G}, ${GREEN})`,
                      boxShadow: "0 0 18px rgba(212,175,55,.18)",
                      transition: "width .35s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            key={currentIndex}
            className="survey-body"
            style={{
              padding: "42px 24px 28px",
              animation: animateIn ? "fadeSlideIn .42s cubic-bezier(.16,1,.3,1)" : "none",
            }}
          >
            <div
              className="survey-question-count"
              style={{
                color: "rgba(255,255,255,.32)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Question {currentIndex + 1} of {totalQuestions}
            </div>

            <h1
              className="survey-question-title"
              style={{
                fontSize: "clamp(26px,4.7vw,44px)",
                fontWeight: 900,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "-.03em",
                lineHeight: 1.05,
                margin: "0 0 26px",
                maxWidth: 760,
              }}
            >
              {currentQuestion.label}
            </h1>

            <div style={{ maxWidth: 760 }}>{renderQuestion()}</div>

            {error ? (
              <div
                style={{
                  marginTop: 12,
                  color: "#f87171",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div
            className="survey-footer"
            style={{
              borderTop: "1px solid rgba(212,175,55,.10)",
              padding: "18px 24px 24px",
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={goBack}
              disabled={currentIndex === 0}
              style={{
                ...buttonBase,
                background: "rgba(255,255,255,.04)",
                color: currentIndex === 0 ? "rgba(255,255,255,.22)" : "#fff",
                border: "1px solid rgba(255,255,255,.08)",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>

            <button
              type="button"
              onClick={goNext}
              style={{
                ...buttonBase,
                background: `linear-gradient(135deg, ${GL}, ${G}, #b8860b)`,
                color: "#05030A",
                boxShadow: "0 12px 34px rgba(212,175,55,.24)",
                transform: "translateZ(0)",
              }}
            >
              {currentIndex === totalQuestions - 1 ? "Submit Application" : "Continue"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}