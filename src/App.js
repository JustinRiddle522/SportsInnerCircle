import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./landingpage";
import Application from "./application";
import PrivacyPolicy from "./privacyPolicy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/application" element={<Application />} />
        <Route path="/privacyPolicy" element={<PrivacyPolicy />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;