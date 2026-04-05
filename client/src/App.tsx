import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import TranslatePage from "@/pages/translate";
import TranslateV2Page from "@/pages/translate-v2";
import HistoryPage from "@/pages/history";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminTranslations from "@/pages/admin/Translations";
import AdminEngines from "@/pages/admin/Engines";
import AdminLab from "@/pages/admin/Lab";
import AdminSettings from "@/pages/admin/Settings";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={TranslateV2Page} />
      <Route path="/v1" component={TranslatePage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/translations" component={AdminTranslations} />
      <Route path="/admin/engines" component={AdminEngines} />
      <Route path="/admin/lab" component={AdminLab} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
