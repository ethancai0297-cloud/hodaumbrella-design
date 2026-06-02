import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing.tsx";
import DesignEditor from "./pages/DesignEditor.tsx";
import Projects from "./pages/Projects.tsx";
import NotFound from "./pages/NotFound.tsx";
import CartonIndex from "./pages/carton/Index.tsx";
import CartonEditor from "./pages/carton/Editor.tsx";
import CartonBatch from "./pages/carton/Batch.tsx";
import DisplayIndex from "./pages/display/Index.tsx";
import DisplayEditor from "./pages/display/Editor.tsx";
import DisplayBatch from "./pages/display/Batch.tsx";
import { I18nProvider } from "./i18n/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/design" element={<DesignEditor />} />
          <Route path="/design/:id" element={<DesignEditor />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/carton" element={<CartonIndex />} />
          <Route path="/carton/editor" element={<CartonEditor />} />
          <Route path="/carton/editor/:id" element={<CartonEditor />} />
          <Route path="/carton/batch/:id" element={<CartonBatch />} />
          <Route path="/display" element={<DisplayIndex />} />
          <Route path="/display/editor" element={<DisplayEditor />} />
          <Route path="/display/editor/:id" element={<DisplayEditor />} />
          <Route path="/display/batch/:id" element={<DisplayBatch />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
