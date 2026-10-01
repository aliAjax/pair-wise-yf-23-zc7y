import { useState } from "react";
import { createRoot } from "react-dom/client";
import { routes } from "./router/routes";
import { FixturesPage } from "./pages/FixturesPage";
import { CuesPage } from "./pages/CuesPage";
import { TimelinePage } from "./pages/TimelinePage";
import { PreviewPage } from "./pages/PreviewPage";
import "./styles.css";

const pageComponents: Record<string, () => JSX.Element> = {
  "/fixtures": FixturesPage,
  "/cues": CuesPage,
  "/timeline": TimelinePage,
  "/preview": PreviewPage
};

function App() {
  const [active, setActive] = useState<string>(routes[0]?.route ?? "/timeline");
  const current = routes.find((route) => route.route === active) ?? routes[0];
  const PageComponent = pageComponents[current.route] ?? TimelinePage;
  return (
    <div className="shell">
      <aside>
        <div className="brand">舞台灯光编排模拟器</div>
        <nav>
          {routes.map((route) => (
            <button
              key={route.route}
              className={active === route.route ? "active" : ""}
              onClick={() => setActive(route.route)}
            >
              {route.name}
            </button>
          ))}
        </nav>
      </aside>
      <PageComponent />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
