import { Route, Switch } from "wouter";
import Dashboard from "./pages/index";
import NewSite from "./pages/new";
import Generating from "./pages/generating";
import Editor from "./pages/editor";
import Analytics from "./pages/analytics";
import Reservations from "./pages/reservations";
import PublicSite from "./pages/public-site";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/new" component={NewSite} />
        <Route path="/generating/:slug" component={Generating} />
        <Route path="/edit/:slug" component={Editor} />
        <Route path="/analytics/:slug" component={Analytics} />
        <Route path="/reservations/:slug" component={Reservations} />
        <Route path="/s/:slug" component={PublicSite} />
        <Route path="/s/:slug/:kind" component={PublicSite} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
